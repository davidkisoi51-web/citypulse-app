// src/services/eventsApi.js
import { mockEvents } from '../data/mockEvents.js'
import { normalizeEvent } from '../utils/normalizeEvent.js'

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json'
// Vite injects import.meta.env in the app; under Node (npm test) it's undefined, so fall back to process.env.
const API_KEY =
  import.meta.env?.VITE_TICKETMASTER_API_KEY ?? globalThis.process?.env?.VITE_TICKETMASTER_API_KEY
// Give up on a slow Ticketmaster response and show sample events instead.
const REQUEST_TIMEOUT_MS = 5000

export async function fetchEvents({ city, category, startDate, endDate, keyword } = {}) {
  // No key configured: the request can only fail (401), so skip the network
  // round-trip and show sample events immediately.
  if (!API_KEY) {
    return {
      events: filterMockEvents({ city, category, startDate, endDate, keyword }),
      error: 'No Ticketmaster API key configured. Showing sample events instead.',
      usedFallback: true,
    }
  }

  const params = new URLSearchParams({ apikey: API_KEY })

  if (keyword) params.append('keyword', keyword)
  if (city) params.append('city', city)
  if (category) params.append('classificationName', category)
  if (startDate) params.append('startDateTime', `${startDate}T00:00:00Z`)
  if (endDate) params.append('endDateTime', `${endDate}T23:59:59Z`)

  try {
    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`)
    }

    const data = await response.json()
    // Single normalization pipeline (RULES.md 3.2): every event goes through normalizeEvent.
    const events = (data._embedded?.events ?? []).map(normalizeEvent).filter(Boolean)

    // API returned successfully but with zero results — not an error,
    // so we return the empty array as-is rather than falling back.
    return { events, error: null, usedFallback: false }
  } catch (err) {
    console.error('Ticketmaster fetch failed, using mock fallback:', err)
    return {
      events: filterMockEvents({ city, category, startDate, endDate, keyword }),
      error: 'Live event data is unavailable right now. Showing sample events instead.',
      usedFallback: true,
    }
  }
}

// Mirrors the same filters against local mock data so the fallback
// still respects whatever the user searched for.
function filterMockEvents({ city, category, startDate, endDate, keyword }) {
  return mockEvents.filter((event) => {
    const matchesCity = !city || event.city?.toLowerCase().includes(city.toLowerCase())
    const matchesCategory = !category || event.category === category
    const matchesKeyword =
      !keyword ||
      [event.name, event.venue, event.city, event.category]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(keyword.toLowerCase()))
    const matchesStart = !startDate || event.date >= startDate
    const matchesEnd = !endDate || event.date <= endDate

    return matchesCity && matchesCategory && matchesKeyword && matchesStart && matchesEnd
  })
}