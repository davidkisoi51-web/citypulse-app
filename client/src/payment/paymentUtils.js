// On-site purchases use the server-confirmed M-PESA STK push flow.

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
