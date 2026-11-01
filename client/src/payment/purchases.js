// Ticket purchases (receipts), stored on the server (server/routes/purchases.py) so they
// follow the customer to any device and the admin portal sees everyone's.
import { request } from '../api/plansApi.js'

export const PURCHASES_KEY = 'citypulse.purchases'
export const API_URL = '/api/auth/tickets'

// Saves a completed checkout; the server adds the receipt number, buyer and total.
export async function recordPurchase(ticket, storage = globalThis.localStorage) {
  const token = storage?.getItem('token')

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(ticket),
  })

  if (!response.ok) {
    throw new Error('post request failed')
  }

  return response.json()
}

// The logged-in customer's purchases, newest first.
export const listMyPurchases = () => request('/purchases/mine')

// Every customer's purchases, newest first (admins only).
export const listAllPurchases = () => request('/purchases')

// Totals for the admin summary. Revenue is grouped by currency (usually just KES).
export function summarizePurchases(purchases) {
  const revenue = {}
  let tickets = 0
  for (const p of purchases) {
    tickets += p.quantity || 0
    revenue[p.currency || 'KES'] = (revenue[p.currency || 'KES'] || 0) + (p.total || 0)
  }
  return { count: purchases.length, tickets, revenue }
}
