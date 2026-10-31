// Client for the M-PESA Express endpoints (server/routes/payments.py).
import { request } from '../api/plansApi.js'

// How long we wait for the customer to enter their PIN before giving up.
export const STK_TIMEOUT_MS = 120000
export const STK_POLL_MS = 3000

// 07XXXXXXXX, 01XXXXXXXX, 7XXXXXXXX, +2547XXXXXXXX or 2547XXXXXXXX (spaces allowed).
export function isValidKenyanPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  return /^(0[17]\d{8}|[17]\d{8}|254[17]\d{8})$/.test(digits)
}

export const startStkPush = ({ phone, amount, eventId, quantity }) =>
  request('/payments/mpesa/stk-push', { method: 'POST', body: { phone, amount, eventId, quantity } })

export const getPayment = (paymentId) => request(`/payments/${paymentId}`)

// Turns a payment from the server into what the page should show next.
export function interpretPayment(payment, elapsedMs) {
  if (payment.status === 'paid') return { state: 'paid' }
  if (payment.status === 'failed') {
    return { state: 'failed', message: payment.message || 'The payment was not completed.' }
  }
  if (payment.status === 'timeout' || elapsedMs > STK_TIMEOUT_MS) {
    return {
      state: 'timeout',
      message: 'We did not get a response from M-PESA. If money was taken, use the code from your SMS below.',
    }
  }
  return { state: 'waiting' }
}