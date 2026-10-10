import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { CANONICAL_KEYS } from './canonicalKeys.js'

// API_KEY is read when eventsApi.js loads, so set it first and import afterwards.
// The `?nokey` import gets a separate module instance that loaded without a key.
process.env.VITE_TICKETMASTER_API_KEY = 'test-key'
const { fetchEvents } = await import('../services/eventsApi.js')
delete process.env.VITE_TICKETMASTER_API_KEY
const { fetchEvents: fetchEventsWithoutKey } = await import('../services/eventsApi.js?nokey')

const realFetch = globalThis.fetch
const realConsoleError = console.error
let fetchCalls

function mockFetch(handler) {
  globalThis.fetch = async (url, options) => {
    fetchCalls.push({ url: String(url), options })
    return handler(url)
  }
}

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

beforeEach(() => {
  fetchCalls = []
  console.error = () => {} // the service logs fallbacks; keep test output clean
})

afterEach(() => {
  globalThis.fetch = realFetch
  console.error = realConsoleError
})

test('success: returns canonical events and no error', async () => {
  mockFetch(() =>
    jsonResponse({
      _embedded: {
        events: [
          {
            id: 'tm-1',
            name: 'Live show',
            url: 'https://tm/e/1',
            dates: { start: { localDate: '2026-10-12', localTime: '19:30:00' } },
            priceRanges: [{ min: 10, max: 20, currency: 'USD' }],
          },
        ],
      },
    }),
  )
  const result = await fetchEvents({ keyword: 'live', city: 'Nairobi' })

  assert.equal(result.error, null)
  assert.equal(result.usedFallback, false)
  assert.equal(result.events.length, 1)
  assert.deepEqual(Object.keys(result.events[0]).sort(), CANONICAL_KEYS)
  assert.equal(result.events[0].url, 'https://tm/e/1')
  assert.equal(result.events[0].priceMin, 10)

  const sent = new URL(fetchCalls[0].url)
  assert.equal(sent.searchParams.get('apikey'), 'test-key')
  assert.equal(sent.searchParams.get('keyword'), 'live')
  assert.equal(sent.searchParams.get('city'), 'Nairobi')
  assert.ok(fetchCalls[0].options?.signal, 'request should have a timeout signal')
})

test('success: drops invalid events from the response', async () => {
  mockFetch(() => jsonResponse({ _embedded: { events: [{ id: 'ok', name: 'Valid' }, null, { name: 'no id' }] } }))
  const { events } = await fetchEvents()
  assert.deepEqual(events.map((e) => e.id), ['ok'])
})

test('empty results: returns [] without falling back to sample events', async () => {
  mockFetch(() => jsonResponse({ page: { totalElements: 0 } }))
  const result = await fetchEvents({ keyword: 'nothing-matches' })
  assert.deepEqual(result.events, [])
  assert.equal(result.error, null)
  assert.equal(result.usedFallback, false)
})

test('HTTP error: falls back to sample events with an error message', async () => {
  mockFetch(() => jsonResponse({}, 500))
  const result = await fetchEvents()
  assert.equal(result.usedFallback, true)
  assert.ok(result.error)
  assert.ok(result.events.length > 0)
})

test('network failure: falls back to sample events', async () => {
  mockFetch(() => {
    throw new TypeError('Failed to fetch')
  })
  const result = await fetchEvents()
  assert.equal(result.usedFallback, true)
  assert.ok(result.events.length > 0)
})

test('fallback still applies the user’s filters', async () => {
  mockFetch(() => jsonResponse({}, 503))
  const { events } = await fetchEvents({ keyword: 'kering' })
  assert.deepEqual(events.map((e) => e.name), ['Kering'])
})

test('no API key: skips the network and returns sample events', async () => {
  mockFetch(() => jsonResponse({}))
  const result = await fetchEventsWithoutKey()
  assert.equal(fetchCalls.length, 0)
  assert.equal(result.usedFallback, true)
  assert.ok(result.events.length > 0)
})
