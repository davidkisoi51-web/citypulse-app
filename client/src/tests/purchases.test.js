import { test } from 'node:test'
import assert from 'node:assert/strict'
import { API_URL, recordPurchase, summarizePurchases } from '../payment/purchases.js'
import { expect, vi } from 'vitest'

//function memoryStorage() {
  //const data = new Map()
  //return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) }

test('recordPurchase post request is successful', async () => {
  const test_data = {
          paidAt: new Date().toISOString(),
          buyerName: "name",
          buyerEmail: "email",
          eventId: "event-id",
          eventName: "event-name",
          eventDate: "event-date",
          eventTime: "event-time",
          eventVenue: "event-venue",
          eventCity: "event-city",
          ticketType: "VIP",
          quantity: 1,
          unitPrice: 2500
  }
  
  global.fetch = vi.fn(() => 
    Promise.resolve({ 
      ok: true, status: 200, json: () => Promise.resolve(test_data),
    }))

  const post_data = await recordPurchase(test_data);
  expect(post_data).toEqual(test_data)
  assert.deepEqual(API_URL, '/api/auth/tickets')
  expect(fetch).toHaveBeenCalled(1);
  expect(fetch).toHaveBeenCalledWith(API_URL, expect.objectContaining({method: "POST", body: JSON.stringify(test_data)}))
})
import { summarizePurchases } from '../payment/purchases.js'

test('summarizePurchases totals purchases, tickets and revenue', () => {
  assert.deepEqual(
    summarizePurchases([
      { receiptNo: 'a', quantity: 2, total: 8000, currency: 'KES' },
      { receiptNo: 'b', quantity: 1, total: 2500, currency: 'KES' },
      { receiptNo: 'c', quantity: 3, total: 0, currency: 'KES' },
    ]),
    { count: 3, tickets: 6, revenue: { KES: 10500 } },
  )
})