import { isPastEvent } from './pastEvent.js'

const CATEGORY_WEIGHT = 3
const CITY_WEIGHT = 2

// Case- and space-insensitive key, so "Music" and "music " count as the same.
const key = (value) => (value || '').trim().toLowerCase()

function countBy(items, field) {
  const counts = new Map()
  for (const item of items) {
    const k = key(item[field])
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return counts
}

// The most saved value of `field`, spelled as the user saved it (ties: first seen).
function topValue(items, field) {
  const counts = countBy(items, field)
  let best = null
  for (const item of items) {
    const k = key(item[field])
    if (k && (!best || counts.get(k) > counts.get(key(best)))) best = item[field].trim()
  }
  return best
}

// "Recommended for you": upcoming events the user hasn't saved, ranked by how often they've
// saved events in the same category and city. Events that match neither are left out, so a
// user with nothing saved gets an empty list. Ties go to the sooner event.
// `saved` is a list of { id, category, city } (id = the canonical event id).
export function recommendEvents(events = [], saved = [], { now = new Date(), limit = 6, excludeIds = [] } = {}) {
  if (!saved.length) return []
  const categories = countBy(saved, 'category')
  const cities = countBy(saved, 'city')
  const skip = new Set([...saved.map((s) => String(s.id)), ...excludeIds.map(String)])

  return events
    .filter((e) => !skip.has(String(e.id)) && !isPastEvent(e, now))
    .map((e) => ({
      event: e,
      score: CATEGORY_WEIGHT * (categories.get(key(e.category)) ?? 0) + CITY_WEIGHT * (cities.get(key(e.city)) ?? 0),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        `${a.event.date || '9999'}T${a.event.time || ''}`.localeCompare(`${b.event.date || '9999'}T${b.event.time || ''}`),
    )
    .slice(0, limit)
    .map(({ event }) => event)
}

// Short reason under the row title, e.g. "Because you saved Music events in Nairobi".
export function recommendationReason(saved = []) {
  const category = topValue(saved, 'category')
  const city = topValue(saved, 'city')
  if (category && city) return `Because you saved ${category} events in ${city}`
  if (category) return `Because you saved ${category} events`
  if (city) return `Because you saved events in ${city}`
  return 'Based on the events you saved'
}
