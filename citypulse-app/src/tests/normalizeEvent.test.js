import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeEvent } from '../utils/normalizeEvent.js'

test('normalizeEvent produces the canonical CityPulse event shape', () => {
  const event = normalizeEvent({
    id: 'abc',
    name: 'Example Concert',
    url: 'https://example.com/tickets',
    images: [{ ratio: '16_9', width: 640, url: 'https://example.com/image.jpg' }],
    dates: { start: { localDate: '2026-10-20', localTime: '19:30:00' } },
    _embedded: { venues: [{ name: 'Arena', city: { name: 'Nairobi' } }] },
    classifications: [{ segment: { name: 'Music' } }],
    priceRanges: [{ min: 1000, max: 2500, currency: 'KES' }],
  })

  assert.deepEqual(event, {
    id: 'abc',
    name: 'Example Concert',
    url: 'https://example.com/tickets',
    image: 'https://example.com/image.jpg',
    date: '2026-10-20',
    time: '19:30:00',
    venue: 'Arena',
    city: 'Nairobi',
    category: 'Music',
    priceMin: 1000,
    priceMax: 2500,
    currency: 'KES',
  })
})

test('normalizeEvent converts missing optional values to null', () => {
  assert.deepEqual(normalizeEvent({ id: 'minimal' }), {
    id: 'minimal',
    name: 'Untitled event',
    url: null,
    image: null,
    date: null,
    time: null,
    venue: null,
    city: null,
    category: null,
    priceMin: null,
    priceMax: null,
    currency: null,
  })
})
