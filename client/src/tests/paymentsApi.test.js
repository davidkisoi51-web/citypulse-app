import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  STK_TIMEOUT_MS,
  getPayment,
  interpretPayment,
  isValidKenyanPhone,
  startStkPush,
} from '../payment/paymentsApi.js'

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

function mockFetch(status, body) {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return { ok: status < 400, status, json: async () => body }
  }
  return calls
}

test('accepts common Kenyan phone formats and rejects bad ones', () => {
  for (const ok of ['0712345678', '0112345678', '712345678', '+254712345678', '254 712 345 678']) {
    assert.equal(isValidKenyanPhone(ok), true, ok)
  }
  for (const bad of ['', '12345', '0812345678', '07123456789', 'abcdefghij']) {
    assert.equal(isValidKenyanPhone(bad), false, bad)
  }
})

test('startStkPush POSTs the payment details to the backend', async () => {
  const calls = mockFetch(201, { data: { id: 7, status: 'pending' } })
  const payment = await startStkPush({ phone: '0712345678', amount: 100, eventId: 'e1', quantity: 2 })
  assert.equal(payment.id, 7)
  assert.ok(calls[0].url.endsWith('/payments/mpesa/stk-push'))
  assert.equal(calls[0].options.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    phone: '0712345678',
    amount: 100,
    eventId: 'e1',
    quantity: 2,
  })
})

test('startStkPush surfaces the server message for an invalid phone', async () => {
  mockFetch(400, { error: { code: 'invalid_phone', message: 'Enter a valid Safaricom number' } })
  await assert.rejects(
    () => startStkPush({ phone: '1', amount: 1, eventId: 'e1', quantity: 1 }),
    /Enter a valid Safaricom number/,
  )
})

test('getPayment fetches the payment by id', async () => {
  const calls = mockFetch(200, { data: { id: 7, status: 'paid', receipt: 'ABC123' } })
  const payment = await getPayment(7)
  assert.equal(payment.receipt, 'ABC123')
  assert.ok(calls[0].url.endsWith('/payments/7'))
})

test('interpretPayment: pending keeps waiting, paid/failed finish, timeout after the limit', () => {
  assert.equal(interpretPayment({ status: 'pending' }, 1000).state, 'waiting')
  assert.equal(interpretPayment({ status: 'paid' }, 1000).state, 'paid')
  const failed = interpretPayment({ status: 'failed', message: 'Request cancelled by user' }, 1000)
  assert.equal(failed.state, 'failed')
  assert.equal(failed.message, 'Request cancelled by user')
  assert.equal(interpretPayment({ status: 'pending' }, STK_TIMEOUT_MS + 1).state, 'timeout')
  assert.equal(interpretPayment({ status: 'timeout' }, 1000).state, 'timeout')
})