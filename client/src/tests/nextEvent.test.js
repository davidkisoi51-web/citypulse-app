import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getNextEvent } from '../utils/nextEvent.js'

const NOW = new Date(2026, 9, 1, 12, 0, 0) // 1 Oct 2026, local midday

const ev = (id, date, time = null) => ({ id, name: id, date, time })

test('picks the soonest future event regardless of input order', () => {
  const events = [ev('dec', '2026-12-06'), ev('oct', '2026-10-12'), ev('nov', '2026-11-02')]
  assert.equal(getNextEvent(events, NOW).id, 'oct')
})

test('filters out past events', () => {
  const events = [ev('past', '2026-09-30'), ev('future', '2026-10-20')]
  assert.equal(getNextEvent(events, NOW).id, 'future')
})

test('an event later today still counts as upcoming', () => {
  assert.equal(getNextEvent([ev('today', '2026-10-01', '20:00:00')], NOW).id, 'today')
})

test('same day: the earlier time wins', () => {
  const events = [ev('evening', '2026-10-12', '20:00:00'), ev('morning', '2026-10-12', '09:00:00')]
  assert.equal(getNextEvent(events, NOW).id, 'morning')
})

test('ignores events without a date', () => {
  assert.equal(getNextEvent([ev('tba', null), ev('dated', '2026-10-15')], NOW).id, 'dated')
})

test('returns null for an empty list or when everything is past', () => {
  assert.equal(getNextEvent([], NOW), null)
  assert.equal(getNextEvent([ev('past', '2025-01-01')], NOW), null)
})

test('does not reorder the caller’s array', () => {
  const events = [ev('b', '2026-12-01'), ev('a', '2026-10-05')]
  getNextEvent(events, NOW)
  assert.deepEqual(events.map((e) => e.id), ['b', 'a'])
})
