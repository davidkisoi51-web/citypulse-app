import { mockEvents } from '../data/mockEvents'
import { normalizeEvent } from '../utils/normalizeEvent'

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json'
const API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY

function filterMockEvents({ city, category, startDate, endDate, keyword } = {}) {
  const normalizedKeyword = keyword?.trim().toLowerCase()
  const normalizedCity = city?.trim().toLowerCase()

  return mockEvents.filter((event) => {
    const matchesCity =
      !normalizedCity || event.city?.toLowerCase().includes(normalizedCity)
    const matchesCategory = !category || category === 'all' || event.category === category
    const matchesKeyword =
      !normalizedKeyword ||
      [event.name, event.venue, event.city, event.category]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(normalizedKeyword))
    const matchesStart = !startDate || !event.date || event.date >= startDate
    const matchesEnd = !endDate || !event.date || event.date <= endDate

    return matchesCity && matchesCategory && matchesKeyword && matchesStart && matchesEnd
  })
}

export async function fetchEvents(
  { city, category, startDate, endDate, keyword } = {},
  { signal } = {},
) {
  // A VITE_ value is intentionally optional: the app must still build and run
  // without a secret in CI or when someone has not configured a local key.
  if (!API_KEY) {
    return {
      events: filterMockEvents({ city, category, startDate, endDate, keyword }),
      error: 'Ticketmaster is not configured. Showing sample events instead.',
      usedFallback: true,
    }
  }

  const params = new URLSearchParams({ apikey: API_KEY, size: '100' })

  if (keyword?.trim()) params.set('keyword', keyword.trim())
  if (city?.trim()) params.set('city', city.trim())
  if (category && category !== 'all') params.set('classificationName', category)
  if (startDate) params.set('startDateTime', `${startDate}T00:00:00Z`)
  if (endDate) params.set('endDateTime', `${endDate}T23:59:59Z`)

  try {
    const response = await fetch(`${BASE_URL}?${params.toString()}`, { signal })

    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`)
    }

    const data = await response.json()
    const events = (data._embedded?.events ?? []).map(normalizeEvent)

    return { events, error: null, usedFallback: false }
  } catch (error) {
    // Abort is expected when the user changes filters or leaves the page.
    if (error?.name === 'AbortError') throw error

    console.error('Ticketmaster fetch failed, using mock fallback:', error)

    return {
      events: filterMockEvents({ city, category, startDate, endDate, keyword }),
      error: 'Live event data is unavailable right now. Showing sample events instead.',
      usedFallback: true,
    }
  }
}
