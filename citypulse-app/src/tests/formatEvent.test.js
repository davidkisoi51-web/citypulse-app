import test from 'node:test'
import assert from 'node:assert/strict'
import { formatPrice, daysUntilLabel } from '../utils/formatEvent.js'

test('formatPrice handles free events and ranges', () => {
  assert.equal(formatPrice(0, 0, 'KES'), 'Free')
  assert.equal(formatPrice(null, null, 'KES'), null)
  assert.match(formatPrice(1000, 2500, 'KES'), /1,000/)
})

test('daysUntilLabel handles today, tomorrow and future dates', () => {
  const now = new Date(2026, 9, 1, 12)
  assert.equal(daysUntilLabel('2026-10-01', now), 'Today')
  assert.equal(daysUntilLabel('2026-10-02', now), 'Tomorrow')
  assert.equal(daysUntilLabel('2026-10-06', now), 'In 5 days')
})
