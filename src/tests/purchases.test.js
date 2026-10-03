import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadPurchases, recordPurchase, summarizePurchases } from '../payment/purchases.js'

function memoryStorage() {
  const data = new Map()
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) }
}

test('recordPurchase adds newest first; loadPurchases survives bad data', () => {
  const storage = memoryStorage()
  assert.deepEqual(loadPurchases(storage), [])
  assert.equal(recordPurchase({ receiptNo: 'G2-1', total: 100 }, storage), true)
  recordPurchase({ receiptNo: 'G2-2', total: 200 }, storage)
  assert.deepEqual(loadPurchases(storage).map((p) => p.receiptNo), ['G2-2', 'G2-1'])
  storage.setItem('citypulse.purchases', 'not json')
  assert.deepEqual(loadPurchases(storage), [])
})

test('recordPurchase reports when storage is full', () => {
  const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError') } }
  assert.equal(recordPurchase({ receiptNo: 'G2-3' }, full), false)
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
