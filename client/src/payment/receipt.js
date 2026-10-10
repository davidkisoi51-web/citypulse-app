// Receipt PDF for a logged purchase: used right after paying and from "My tickets".
import { buildReceiptPdf } from './receiptPdf.js'
import { formatAmount } from './paymentUtils.js'
import { formatDate } from '../utils/formatEvent.js'

export function receiptPdfForPurchase(p) {
  const free = p.method === 'Free'
  return buildReceiptPdf({
    title: 'Group2',
    subtitle: 'Ticket payment receipt',
    rows: [
      ['Receipt no.', p.receiptNo],
      ['Date paid', new Date(p.paidAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })],
      ['Name', p.buyerName],
      ['Email', p.buyerEmail],
      ['---'],
      ['Event', p.eventName],
      ['Event date', formatDate(p.eventDate, p.eventTime)],
      ['Venue', [p.eventVenue, p.eventCity].filter(Boolean).join(', ') || '-'],
      ['Ticket type', p.ticketType],
      ['Quantity', String(p.quantity)],
      ['Price per ticket', formatAmount(p.unitPrice, p.currency)],
      ['Total paid', free ? 'Free' : formatAmount(p.total, p.currency)],
      ['---'],
      ['Payment method', free ? 'Free ticket' : 'M-PESA (Lipa na M-PESA)'],
      ...(free ? [] : [['Paid to', p.paidTo], ['M-PESA code', p.mpesaCode]]),
    ],
    footer: [
      'Please keep this receipt and show it at the venue entrance.',
      'Group2 events - demo receipt (payments are not verified).',
    ],
  })
}

export const receiptFileName = (p) => `Group2-receipt-${p.receiptNo}.pdf`

// Browser-only: saves the PDF via a temporary download link.
export function downloadPdf(pdf, fileName) {
  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
