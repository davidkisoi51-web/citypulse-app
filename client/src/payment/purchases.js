// Ticket purchase log shown in the admin portal. Front-end only: kept in this browser's
// localStorage until there's a backend, so it only lists purchases made in this browser.

export const PURCHASES_KEY = 'citypulse.purchases'
export const API_URL = '/api/auth/tickets'

export function loadPurchases(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(PURCHASES_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((p) => p && p.receiptNo) : []
  } catch {
    return []
  }
}

export async function recordPurchase(ticket, storage = globalThis.localStorage) {
  const token = storage?.getItem('token')
  //console.log("retrieved ", token)

  return fetch(API_URL,{
    method: "POST",
    headers: {"Content-Type": "application/json", 
        "Authorization": `Bearer ${token}`},
    body: JSON.stringify(ticket),
  })
    .then(response => {
      if (!response.ok){ throw new Error ("post request failed")}
      return response.json()
    })
    .then((data)=> {
      return data
    })
  .catch((error) =>  {throw error;})
}


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
