import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recommendationReason, recommendEvents } from '../utils/recommendations.js'

const NOW = new Date(2026, 9, 1, 12, 0, 0) // 1 Oct 2026, local midday

const ev = (id, category, city, date = '2026-10-20') => ({ id, name: id, category, city, date, time: null })
const ids = (events) => events.map((e) => e.id)

test('nothing saved: no recommendations', () => {
  assert.deepEqual(recommendEvents([ev('a', 'Music', 'Nairobi')], [], { now: NOW }), [])
})

test('ranks by saved category, then city, and drops events matching neither', () => {
  const saved = [
    { id: 's1', category: 'Music', city: 'Nairobi' },
    { id: 's2', category: 'Music', city: 'Mombasa' },
  ]
  const events = [
    ev('sports-nairobi', 'Sports', 'Nairobi'), // city only: 2
    ev('music-kisumu', 'Music', 'Kisumu'), // category x2: 6
    ev('music-nairobi', 'Music', 'Nairobi'), // 6 + 2 = 8
    ev('arts-kisumu', 'Arts', 'Kisumu'), // 0, left out
  ]
  assert.deepEqual(ids(recommendEvents(events, saved, { now: NOW })), ['music-nairobi', 'music-kisumu', 'sports-nairobi'])
})

test('matching ignores case and spacing', () => {
  const saved = [{ id: 's1', category: 'music ', city: null }]
  assert.deepEqual(ids(recommendEvents([ev('a', 'Music', 'Nairobi')], saved, { now: NOW })), ['a'])
})

test('skips saved events, excluded ids and past events', () => {
  const saved = [{ id: 'saved', category: 'Music', city: 'Nairobi' }]
  const events = [
    ev('saved', 'Music', 'Nairobi'),
    ev('featured', 'Music', 'Nairobi'),
    ev('past', 'Music', 'Nairobi', '2026-09-01'),
    ev('ok', 'Music', 'Nairobi'),
  ]
  assert.deepEqual(ids(recommendEvents(events, saved, { now: NOW, excludeIds: ['featured'] })), ['ok'])
})

test('equal scores: the sooner event first; respects the limit', () => {
  const saved = [{ id: 's', category: 'Music', city: null }]
  const events = [ev('late', 'Music', null, '2026-12-01'), ev('soon', 'Music', null, '2026-10-05'), ev('mid', 'Music', null, '2026-11-01')]
  assert.deepEqual(ids(recommendEvents(events, saved, { now: NOW })), ['soon', 'mid', 'late'])
  assert.deepEqual(ids(recommendEvents(events, saved, { now: NOW, limit: 2 })), ['soon', 'mid'])
})

test('does not change the input array', () => {
  const saved = [{ id: 's', category: 'Music', city: null }]
  const events = [ev('late', 'Music', null, '2026-12-01'), ev('soon', 'Music', null, '2026-10-05')]
  const before = ids(events)
  recommendEvents(events, saved, { now: NOW })
  assert.deepEqual(ids(events), before)
})

test('reason names the most saved category and city', () => {
  const saved = [
    { id: '1', category: 'Music', city: 'Nairobi' },
    { id: '2', category: 'Music', city: 'Mombasa' },
    { id: '3', category: 'Sports', city: 'Nairobi' },
  ]
  assert.equal(recommendationReason(saved), 'Because you saved Music events in Nairobi')
  assert.equal(recommendationReason([{ id: '1', category: 'Arts', city: null }]), 'Because you saved Arts events')
  assert.equal(recommendationReason([{ id: '1', category: null, city: 'Kisumu' }]), 'Because you saved events in Kisumu')
  assert.equal(recommendationReason([]), 'Based on the events you saved')
})
