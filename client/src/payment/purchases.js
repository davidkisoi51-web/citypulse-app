// Ticket purchases and transfer requests are stored by the Flask API.
import { API_URL as API_BASE_URL, request } from '../api/plansApi.js'

export const PURCHASES_KEY = 'citypulse.purchases'
export const API_URL = `${API_BASE_URL}/purchases`

export const recordPurchase = (ticket) => request('/purchases', { method: 'POST', body: ticket })
export const listMyPurchases = () => request('/purchases/mine')
export const listAllPurchases = () => request('/purchases')
export const transferPurchase = (ticketId, email) =>
  request('/auth/transfer', { method: 'POST', body: { ticketId, email } })

export function summarizePurchases(purchases) {
  const revenue = {}
  let tickets = 0
  for (const purchase of purchases) {
    tickets += purchase.quantity || 0
    revenue[purchase.currency || 'KES'] =
      (revenue[purchase.currency || 'KES'] || 0) + (purchase.total || 0)
  }
  return { count: purchases.length, tickets, revenue }
}
