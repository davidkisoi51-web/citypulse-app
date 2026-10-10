import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeEvent } from '../utils/normalizeEvent.js'
import { CANONICAL_KEYS } from './canonicalKeys.js'

const rawEvent = {
  id: 'tm-1',
  name: 'Sauti Sol Live',
  url: 'https://ticketmaster.com/e/tm-1',
  images: [
    { ratio: '3_2', width: 640, url: 'https://img/3x2.jpg' },
    { ratio: '16_9', width: 2048, url: 'https://img/16x9-big.jpg' },
    { ratio: '16_9', width: 640, url: 'https://img/16x9-640.jpg' },
  ],
  dates: { start: { localDate: '2026-10-12', localTime: '19:30:00' } },
  classifications: [{ segment: { name: 'Music' } }],
  priceRanges: [{ min: 2500, max: 4000, currency: 'KES' }],
  _embedded: { venues: [{ name: 'Kasarani Stadium', city: { name: 'Nairobi' } }] },
}

test('maps a standard Ticketmaster event to the canonical shape', () => {
  assert.deepEqual(normalizeEvent(rawEvent), {
    id: 'tm-1',
    name: 'Sauti Sol Live',
    url: 'https://ticketmaster.com/e/tm-1',
    image: 'https://img/16x9-640.jpg',
    date: '2026-10-12',
    time: '19:30:00',
    venue: 'Kasarani Stadium',
    city: 'Nairobi',
    category: 'Music',
    priceMin: 2500,
    priceMax: 4000,
    currency: 'KES',
  })
})

test('prefers the 16:9 image closest to 640px wide', () => {
  assert.equal(normalizeEvent(rawEvent).image, 'https://img/16x9-640.jpg')
})

test('falls back to the first image when there is no 16:9 image', () => {
  const event = normalizeEvent({ ...rawEvent, images: [{ ratio: '4_3', width: 300, url: 'https://img/a.jpg' }] })
  assert.equal(event.image, 'https://img/a.jpg')
})

test('missing properties become null, not undefined or placeholder text', () => {
  const event = normalizeEvent({ id: 'tm-2', name: 'Bare event' })
  assert.deepEqual(Object.keys(event).sort(), CANONICAL_KEYS)
  for (const key of ['image', 'date', 'time', 'venue', 'city', 'category', 'priceMin', 'priceMax']) {
    assert.equal(event[key], null, `${key} should be null`)
  }
  assert.equal(event.currency, 'KES')
})

test('invalid payloads return null', () => {
  for (const payload of [null, undefined, 'event', 42, {}, { name: 'no id' }]) {
    assert.equal(normalizeEvent(payload), null, `payload ${JSON.stringify(payload)}`)
  }
})
