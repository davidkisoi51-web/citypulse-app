// Admin dashboard helpers: filter purchases, list the filter options, and export a CSV.
// Dates are the day the ticket was bought, in the viewer's local time.

// "2026-11-01" (local) for a purchase's paidAt; '' if it has none.
export function purchaseDay(purchase) {
  const d = new Date(purchase?.paidAt)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const norm = (value) => (value || '').trim().toLowerCase()

// filters: { date: 'YYYY-MM-DD', month: 'YYYY-MM', category, event } – empty / 'all' = any.
export function filterPurchases(purchases = [], { date = '', month = '', category = 'all', event = 'all' } = {}) {
  return purchases.filter((p) => {
    const day = purchaseDay(p)
    if (date && day !== date) return false
    if (month && !day.startsWith(`${month}-`)) return false
    if (category !== 'all' && norm(p.eventCategory) !== norm(category)) return false
    if (event !== 'all' && p.eventName !== event) return false
    return true
  })
}

// Sorted, de-duplicated values of a field (for the filter dropdowns); blanks left out.
export function purchaseOptions(purchases = [], field) {
  const seen = new Map()
  for (const p of purchases) {
    const value = (p?.[field] || '').trim()
    if (value && !seen.has(norm(value))) seen.set(norm(value), value)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

const CSV_COLUMNS = [
  ['Receipt no.', (p) => p.receiptNo],
  ['Date paid', (p) => p.paidAt],
  ['Buyer', (p) => p.buyerName],
  ['Email', (p) => p.buyerEmail],
  ['Event', (p) => p.eventName],
  ['Event type', (p) => p.eventCategory],
  ['Event date', (p) => p.eventDate],
  ['Venue', (p) => [p.eventVenue, p.eventCity].filter(Boolean).join(', ')],
  ['Ticket type', (p) => p.ticketType],
  ['Quantity', (p) => p.quantity],
  ['Price per ticket', (p) => p.unitPrice],
  ['Total', (p) => p.total],
  ['Currency', (p) => p.currency],
  ['Payment method', (p) => p.method],
  ['M-PESA code', (p) => p.mpesaCode],
]

// Quotes a value when needed; a leading = + - @ is prefixed with ' so spreadsheets don't run it
// as a formula (names and event titles come from users).
function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// One header row plus one row per purchase, CRLF line endings (what Excel expects).
export function purchasesToCsv(purchases = []) {
  const rows = [CSV_COLUMNS.map(([title]) => title), ...purchases.map((p) => CSV_COLUMNS.map(([, get]) => get(p)))]
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}
