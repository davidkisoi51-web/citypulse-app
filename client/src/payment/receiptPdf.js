// Builds a one-page A4 PDF receipt without any library: plain PDF 1.4 text and shapes
// with the built-in Helvetica fonts. Pure function (returns the PDF as a string), so it
// can be unit tested; the page turns it into a Blob for download.

// The built-in fonts only cover basic Latin, so map common typography to ASCII.
function pdfText(value) {
  return String(value ?? '')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00b7/g, '-')
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/[\\()]/g, (c) => `\\${c}`)
}

const text = (font, size, x, y, value, [r, g, b] = [0.1, 0.1, 0.1]) =>
  `BT /${font} ${size} Tf ${r} ${g} ${b} rg ${x} ${y} Td (${pdfText(value)}) Tj ET`

// rows: [[label, value], ...]
export function buildReceiptPdf({ title, subtitle, rows, footer }) {
  const W = 595
  const H = 842
  const ops = [
    // Maroon header band
    `0.55 0.1 0.12 rg 0 ${H - 120} ${W} 120 re f`,
    text('F2', 26, 50, H - 62, title, [1, 1, 1]),
    text('F1', 13, 50, H - 88, subtitle, [1, 0.88, 0.88]),
    // "PAID" stamp
    `0.09 0.64 0.29 rg ${W - 150} ${H - 92} 100 36 re f`,
    text('F2', 18, W - 128, H - 80, 'PAID', [1, 1, 1]),
  ]

  let y = H - 170
  for (const [label, value] of rows) {
    if (label === '---') {
      ops.push(`0.85 0.85 0.85 RG 1 w 50 ${y + 8} m ${W - 50} ${y + 8} l S`)
      y -= 18
      continue
    }
    ops.push(text('F1', 11, 50, y, label, [0.42, 0.42, 0.45]))
    ops.push(text('F2', 12, 210, y, value))
    y -= 24
  }

  if (footer) {
    footer.forEach((line, i) => ops.push(text('F1', 9, 50, 70 - i * 13, line, [0.45, 0.45, 0.48])))
  }

  const content = ops.join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 6 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ]

  // Everything is ASCII, so string length equals byte length for the xref offsets.
  let pdf = '%PDF-1.4\n'
  const offsets = objects.map((body, i) => {
    const offset = pdf.length
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
    return offset
  })
  const xrefAt = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`
  return pdf
}

export function newReceiptNumber(now = Date.now()) {
  return `G2-${now.toString(36).toUpperCase()}`
}
