import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  API_URL,
  listAllPurchases,
  listMyPurchases,
  recordPurchase,
  summarizePurchases,
  transferPurchase,
} from '../payment/purchases.js'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

test('recordPurchase posts to the purchase API and unwraps the purchase', async () => {
  const purchase = {
    id: 1,
    receiptNo: 'CP-123',
    eventName: 'City Pulse',
    quantity: 2,
    unitPrice: 2500,
    total: 5000,
  }
  let call
  globalThis.fetch = async (url, options) => {
    call = { url, options }
    return { ok: true, status: 201, json: async () => ({ data: purchase }) }
  }

  assert.deepEqual(await recordPurchase({ eventId: 'event-1' }), purchase)
  assert.equal(call.url, API_URL)
  assert.equal(call.options.method, 'POST')
  assert.deepEqual(JSON.parse(call.options.body), { eventId: 'event-1' })
})

test('purchase history and transfer use their registered API routes', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return { ok: true, status: 200, json: async () => ({ data: [] }) }
  }

  await listMyPurchases()
  await listAllPurchases()
  await transferPurchase(7, 'friend@example.test')

  assert.match(calls[0].url, /\/api\/purchases\/mine$/)
  assert.match(calls[1].url, /\/api\/purchases$/)
  assert.match(calls[2].url, /\/api\/auth\/transfer$/)
  assert.deepEqual(JSON.parse(calls[2].options.body), {
    ticketId: 7,
    email: 'friend@example.test',
  })
})

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
