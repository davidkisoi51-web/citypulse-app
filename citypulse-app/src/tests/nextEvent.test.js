import test from 'node:test'
import assert from 'node:assert/strict'
import { getNextEvent } from '../utils/nextEvent.js'

test('getNextEvent returns the nearest future event without mutating input', () => {
  const events = [
    { id: 'later', date: '2026-10-20', time: '10:00:00' },
    { id: 'first', date: '2026-10-05', time: '18:00:00' },
    { id: 'past', date: '2026-09-30', time: '12:00:00' },
  ]

  const original = events.map((event) => event.id)
  assert.equal(getNextEvent(events, new Date(2026, 9, 1)).id, 'first')
  assert.deepEqual(events.map((event) => event.id), original)
})
