import { test } from 'node:test'
import assert from 'node:assert/strict'
import { daysUntilLabel, formatDate, formatPrice, whenPhrase } from '../utils/formatEvent.js'

// Fixed "today" so date tests don't depend on when they run (local time, midday).
const NOW = new Date(2026, 9, 1, 12, 0, 0) // 1 Oct 2026

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

test('daysUntilLabel: today, tomorrow, and N days', () => {
  assert.equal(daysUntilLabel('2026-10-01', NOW), 'Today')
  assert.equal(daysUntilLabel('2026-10-02', NOW), 'Tomorrow')
  assert.equal(daysUntilLabel('2026-10-12', NOW), 'In 11 days')
  assert.equal(daysUntilLabel(null, NOW), null)
})

test('whenPhrase: today / tomorrow / this week / a date', () => {
  assert.equal(whenPhrase('2026-10-01', NOW), 'today')
  assert.equal(whenPhrase('2026-10-02', NOW), 'tomorrow')
  assert.equal(whenPhrase('2026-10-08', NOW), 'this week')
  assert.match(whenPhrase('2026-10-12', NOW), /^on /)
  assert.equal(whenPhrase(null, NOW), 'soon')
})
