import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatAmount, normalizeMpesaCode, paymentPath, paysOnSite, ticketOptions } from '../payment/paymentUtils.js'

test('paysOnSite: only admin events without a ticket link', () => {
  assert.equal(paysOnSite({ id: 'a', isAdmin: true, url: null }), true)
  assert.equal(paysOnSite({ id: 'a', isAdmin: true, url: 'https://tm.example' }), false)
  assert.equal(paysOnSite({ id: 'tm', url: null }), false)
  assert.equal(paysOnSite(undefined), false)
})

test('paymentPath encodes the event id', () => {
  assert.equal(paymentPath({ id: 'mock-1' }), '/pay/mock-1')
})

test('ticketOptions: single price, range, or none', () => {
  assert.deepEqual(ticketOptions({ priceMin: 2000, priceMax: 2000 }).map((o) => o.price), [2000])
  assert.deepEqual(ticketOptions({ priceMin: 2000, priceMax: null }).map((o) => o.label), ['Standard'])
  assert.deepEqual(ticketOptions({ priceMin: 2500, priceMax: 4000 }).map((o) => [o.label, o.price]), [
    ['Regular', 2500],
    ['VIP', 4000],
  ])
  assert.deepEqual(ticketOptions({ priceMin: null, priceMax: null }), [])
})

test('formatAmount shows Ksh', () => {
  assert.match(formatAmount(7500), /^Ksh\s7,500$/)
})

test('normalizeMpesaCode trims, removes spaces and upper-cases', () => {
  assert.equal(normalizeMpesaCode('  sjk4 h7qw2p '), 'SJK4H7QW2P')
  assert.equal(normalizeMpesaCode('   '), '')
})
