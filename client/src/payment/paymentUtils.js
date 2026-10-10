// Demo M-PESA checkout for admin-added events that have no external ticket link.
// No real payment is verified: any M-PESA code counts as paid. A real integration
// would use Safaricom's Daraja API (STK push) from the backend.

export const MPESA_NUMBER = '0702270346'
export const MPESA_NUMBER_DISPLAY = '0702 270 346'
export const MAX_TICKETS = 10

// Admin events without a ticket link are paid for on our own /pay page.
export const paysOnSite = (event) => Boolean(event?.isAdmin && !event.url)
export const paymentPath = (event) => `/pay/${encodeURIComponent(event.id)}`

// Ticket types for an event: one price, or Regular/VIP when it has a range.
export function ticketOptions(event) {
  const { priceMin: min, priceMax: max } = event
  if (min == null) return []
  if (max == null || max === min) return [{ id: 'standard', label: 'Standard', price: min }]
  return [
    { id: 'regular', label: 'Regular', price: min },
    { id: 'vip', label: 'VIP', price: max },
  ]
}

export function formatAmount(amount, currency = 'KES') {
  return amount.toLocaleString('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 })
}

// Trims and upper-cases what was pasted (M-PESA codes look like "SJK4H7XXXX").
export function normalizeMpesaCode(code = '') {
  return code.trim().replace(/\s+/g, '').toUpperCase()
}
