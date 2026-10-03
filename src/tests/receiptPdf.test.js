import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildReceiptPdf, newReceiptNumber } from '../payment/receiptPdf.js'

const pdf = buildReceiptPdf({
  title: 'Group2',
  subtitle: 'Ticket payment receipt',
  rows: [['Event', 'Bien (Live)'], ['---'], ['Total paid', 'Ksh 8,000 – VIP'], ['M-PESA code', 'SJK4H7QW2P']],
  footer: ['Keep this receipt.'],
})

test('is a well-formed PDF with a valid cross-reference table', () => {
  assert.ok(pdf.startsWith('%PDF-1.4\n'))
  assert.ok(pdf.trimEnd().endsWith('%%EOF'))
  const startxref = Number(pdf.match(/startxref\n(\d+)\n/)[1])
  assert.equal(pdf.slice(startxref, startxref + 4), 'xref')
  // Each object offset in the xref table must point at "N 0 obj".
  const offsets = [...pdf.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]))
  assert.equal(offsets.length, 6)
  offsets.forEach((o, i) => assert.ok(pdf.startsWith(`${i + 1} 0 obj`, o), `object ${i + 1}`))
})

test('contains the receipt details, safely escaped and ASCII-only', () => {
  assert.ok(pdf.includes('(SJK4H7QW2P)'))
  assert.ok(pdf.includes('(Bien \\(Live\\))'), 'parentheses escaped')
  assert.ok(pdf.includes('(Ksh 8,000 - VIP)'), 'NBSP and en dash mapped to ASCII')
  assert.ok(/^[\x20-\x7e\n]*$/.test(pdf), 'printable ASCII only')
})

test('stream /Length matches the content', () => {
  const [, len, body] = pdf.match(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/)
  assert.equal(body.length, Number(len))
})

test('newReceiptNumber is prefixed and unique per time', () => {
  assert.match(newReceiptNumber(1700000000000), /^G2-[0-9A-Z]+$/)
  assert.notEqual(newReceiptNumber(1), newReceiptNumber(2))
})

test('receiptPdfForPurchase includes the purchase details', async () => {
  const { receiptPdfForPurchase, receiptFileName } = await import('../payment/receipt.js')
  const purchase = {
    receiptNo: 'G2-ABC',
    paidAt: '2026-10-03T09:00:00.000Z',
    buyerName: 'Heidi Temba',
    buyerEmail: 'heidi@example.com',
    eventName: 'Bien',
    eventDate: '2026-10-12',
    eventTime: '19:30:00',
    eventVenue: 'Nyayo Stadium',
    eventCity: 'Nairobi',
    ticketType: 'VIP',
    quantity: 2,
    unitPrice: 4000,
    total: 8000,
    currency: 'KES',
    method: 'M-PESA',
    mpesaCode: 'SJK4H7QW2P',
    paidTo: '0702 270 346',
  }
  const out = receiptPdfForPurchase(purchase)
  for (const s of ['(G2-ABC)', '(Heidi Temba)', '(Bien)', '(VIP)', '(Ksh 8,000)', '(SJK4H7QW2P)', '(0702 270 346)', '(Nyayo Stadium, Nairobi)']) {
    assert.ok(out.includes(s), s)
  }
  assert.equal(receiptFileName(purchase), 'Group2-receipt-G2-ABC.pdf')
})
