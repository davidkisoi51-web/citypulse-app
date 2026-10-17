import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { CANONICAL_KEYS } from './canonicalKeys.js'
import { fetchEvents } from '../services/eventsApi.js'

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

// The Flask backend already returns events in the canonical shape,
// wrapped as { data: [...] }. Build a fixture from the canonical keys.
const canonicalEvent = (overrides = {}) => ({
  ...Object.fromEntries(CANONICAL_KEYS.map((key) => [key, null])),
  id: 'tm-1',
  name: 'Live show',
  url: 'https://tm/e/1',
  date: '2026-10-12',
  time: '19:30:00',
  priceMin: 10,
  priceMax: 20,
  currency: 'USD',
  ...overrides,
})

beforeEach(() => {
  fetchCalls = []
  console.error = () => {} // the service logs fallbacks; keep test output clean
})

afterEach(() => {
  globalThis.fetch = realFetch
  console.error = realConsoleError
})

test('success: returns the backend events and no error', async () => {
  const event = canonicalEvent()
  mockFetch(() => jsonResponse({ data: [event] }))

  const result = await fetchEvents({ keyword: 'live', city: 'Nairobi' })

  assert.equal(result.error, null)
  assert.equal(result.usedFallback, false)
  assert.deepEqual(result.events, [event])
  assert.deepEqual(Object.keys(result.events[0]).sort(), [...CANONICAL_KEYS].sort())
})

test('calls our own backend with the filters and a timeout, never with an API key', async () => {
  mockFetch(() => jsonResponse({ data: [] }))

  await fetchEvents({
    keyword: 'live',
    city: 'Nairobi',
    category: 'Music',
    startDate: '2026-11-01',
    endDate: '2026-12-01',
  })

  const sent = new URL(fetchCalls[0].url)
  assert.equal(sent.pathname, '/api/events')
  assert.equal(sent.searchParams.get('keyword'), 'live')
  assert.equal(sent.searchParams.get('city'), 'Nairobi')
  assert.equal(sent.searchParams.get('category'), 'Music')
  assert.equal(sent.searchParams.get('startDate'), '2026-11-01')
  assert.equal(sent.searchParams.get('endDate'), '2026-12-01')
  assert.equal(sent.searchParams.get('apikey'), null)
  assert.ok(fetchCalls[0].options?.signal, 'request should have a timeout signal')
})

test('empty results: returns [] without falling back to sample events', async () => {
  mockFetch(() => jsonResponse({ data: [] }))
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

test('backend error envelope (e.g. missing API key on the server): falls back to sample events', async () => {
  mockFetch(() =>
    jsonResponse(
      { error: { code: 'missing_api_key', message: 'No Ticketmaster API key configured on the server' } },
      500,
    ),
  )
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