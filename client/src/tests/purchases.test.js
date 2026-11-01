import { test } from 'node:test'
import assert from 'node:assert/strict'
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
