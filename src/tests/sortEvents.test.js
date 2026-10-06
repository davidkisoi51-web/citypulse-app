import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SORT_OPTIONS, sortEvents } from '../utils/sortEvents.js'

const events = [
  { id: 'b', date: '2026-11-02', time: '18:00:00', priceMin: 3000, priceMax: 4000 },
  { id: 'a', date: '2026-10-12', time: '19:30:00', priceMin: 2500, priceMax: 4000 },
  { id: 'nodate', date: null, priceMin: null, priceMax: null },
  { id: 'c', date: '2026-10-12', time: '09:00:00', priceMin: 2000, priceMax: 2000 },
  { id: 'd', date: '2026-12-06', time: null, priceMin: 2500, priceMax: 3500 },
]
const ids = (list) => list.map((e) => e.id)

test('nearest to furthest: by date then time, undated last', () => {
  assert.deepEqual(ids(sortEvents(events, SORT_OPTIONS.dateNearest)), ['c', 'a', 'b', 'd', 'nodate'])
})

test('furthest to nearest: reversed, undated still last', () => {
  assert.deepEqual(ids(sortEvents(events, SORT_OPTIONS.dateFurthest)), ['d', 'b', 'a', 'c', 'nodate'])
})

test('price low to high uses the minimum price; unpriced last', () => {
  assert.deepEqual(ids(sortEvents(events, SORT_OPTIONS.priceLowHigh)), ['c', 'a', 'd', 'b', 'nodate'])
})

test('price high to low uses the maximum price; unpriced last', () => {
  assert.deepEqual(ids(sortEvents(events, SORT_OPTIONS.priceHighLow)).at(-1), 'nodate')
  assert.deepEqual(ids(sortEvents(events, SORT_OPTIONS.priceHighLow)).slice(0, 2).sort(), ['a', 'b'])
})

test('no sort keeps the original order and never mutates the input', () => {
  const before = ids(events)
  assert.equal(sortEvents(events, SORT_OPTIONS.none), events)
  sortEvents(events, SORT_OPTIONS.dateNearest)
  assert.deepEqual(ids(events), before)
})
