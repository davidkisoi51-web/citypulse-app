import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isPastEvent } from '../utils/pastEvent.js'

const NOW = new Date(2026, 9, 1, 12, 0, 0) // 1 Oct 2026, local midday

const ev = (date, time = null) => ({ id: 'x', name: 'x', date, time })

test('an event on an earlier day is past', () => {
  assert.equal(isPastEvent(ev('2026-09-30'), NOW), true)
  assert.equal(isPastEvent(ev('2025-12-31', '20:00:00'), NOW), true)
})

test('an event on a later day is not past', () => {
  assert.equal(isPastEvent(ev('2026-10-02'), NOW), false)
})

test('today: past only once its start time has gone', () => {
  assert.equal(isPastEvent(ev('2026-10-01', '09:00:00'), NOW), true)
  assert.equal(isPastEvent(ev('2026-10-01', '20:00:00'), NOW), false)
})

test('today with no start time is not past', () => {
  assert.equal(isPastEvent(ev('2026-10-01'), NOW), false)
})

test('missing date or event is never past', () => {
  assert.equal(isPastEvent(ev(null), NOW), false)
  assert.equal(isPastEvent(null, NOW), false)
  assert.equal(isPastEvent(undefined, NOW), false)
})
