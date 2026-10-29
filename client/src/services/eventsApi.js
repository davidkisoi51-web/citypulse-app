// src/services/eventsApi.js
import { mockEvents } from '../data/mockEvents.js'

const BASE_URL = (
  import.meta.env?.VITE_API_URL ??
  import.meta.env?.VITE_API_BASE_URL ??
  globalThis.process?.env?.VITE_API_URL ??
  'http://localhost:5001/api'
).replace(/\/$/, '')


// Increase from 10000 to 45000 (45 seconds) to accommodate Render cold starts
const REQUEST_TIMEOUT_MS = 52000

export async function fetchEvents({ city, category, startDate, endDate, keyword } = {}) {
  const params = new URLSearchParams()
  if (keyword) params.append('keyword', keyword)
  if (city) params.append('city', city)
  if (category) params.append('category', category)
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)

  try {
    const response = await fetch(`${BASE_URL}/events?${params.toString()}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const body = await response.json()

    if (!response.ok || body.error) {
      throw new Error(body.error?.message ?? `Events request failed: ${response.status}`)
    }

    // Flask already ran every event through the canonical normalizeEvent()
    // shape server-side (ticketmaster.py) — no second normalization pass here.
    return { events: body.data, error: null, usedFallback: false }
  } catch (err) {
    console.error('CityPulse API fetch failed, using mock fallback:', err)
    return {
      events: filterMockEvents({ city, category, startDate, endDate, keyword }),
      error: 'Live event data is unavailable right now. Showing sample events instead.',
      usedFallback: true,
    }
  }
}

function todayLocal() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function filterMockEvents({ city, category, startDate, endDate, keyword }) {
  return mockEvents.filter((event) => {
    const matchesCity = !city || event.city?.toLowerCase().includes(city.toLowerCase())
    const matchesCategory = !category || event.category === category
    const matchesKeyword =
      !keyword ||
      [event.name, event.venue, event.city, event.category]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(keyword.toLowerCase()))
    //const matchesStart = !startDate || event.date >= startDate
    const matchesStart = event.date >= (startDate || todayLocal())
    const matchesEnd = !endDate || event.date <= endDate

    return matchesCity && matchesCategory && matchesKeyword && matchesStart && matchesEnd
  })
}
console.log('Current BASE_URL:', BASE_URL)

