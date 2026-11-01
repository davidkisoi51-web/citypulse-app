import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatPrice } from '../utils/formatEvent.js'

test('formatDate: missing date shows "Date TBA"', () => {
  assert.equal(formatDate(null), 'Date TBA')
  assert.equal(formatDate(undefined, '19:30:00'), 'Date TBA')
})

test('formatDate: includes the time only when there is one', () => {
  assert.match(formatDate('2026-10-12', '19:30:00'), / · /)
  assert.doesNotMatch(formatDate('2026-10-12', null), / · /)
})

test('formatDate: parses as a local date (no off-by-one from UTC)', () => {
  const expected = new Date(2026, 9, 12).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  assert.equal(formatDate('2026-10-12'), expected)
})

test('formatPrice: null min means no price to show', () => {
  assert.equal(formatPrice(null, null, 'KES'), null)
})

test('formatPrice: zero is "Free"', () => {
  assert.equal(formatPrice(0, 0, 'KES'), 'Free')
  assert.equal(formatPrice(0, null, 'KES'), 'Free')
})

test('formatPrice: KES renders as Ksh', () => {
  assert.match(formatPrice(2000, 2000, 'KES'), /^Ksh\s2,000$/)
})

test('formatPrice: a range shows both ends; an open range shows "From"', () => {
  assert.match(formatPrice(2500, 4000, 'KES'), /^Ksh\s2,500 – Ksh\s4,000$/)
  assert.match(formatPrice(2500, null, 'KES'), /^From Ksh\s2,500$/)
})

test('formatPrice: other currencies keep their own symbol', () => {
  const usd = formatPrice(10, 20, 'USD')
  assert.ok(usd.includes('10') && usd.includes('20'))
  assert.doesNotMatch(usd, /Ksh/)
})
