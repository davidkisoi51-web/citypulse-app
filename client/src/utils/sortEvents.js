// Sorting for the "Sort By Price" / "Sort By Date" dropdowns. Returns a new array
// (never reorders the input) and always puts events missing the sort field last.

export const SORT_OPTIONS = {
  none: 'all',
  priceLowHigh: 'low_to_high',
  priceHighLow: 'high_to_low',
  dateNearest: 'nearest_furthest',
  dateFurthest: 'furthest_nearest',
}

// Dates are YYYY-MM-DD (+ optional HH:mm:ss), so string comparison gives date order.
const dateKey = (e) => (e.date ? `${e.date}T${e.time || '00:00:00'}` : null)
const lowPrice = (e) => e.priceMin ?? e.priceMax ?? null
const highPrice = (e) => e.priceMax ?? e.priceMin ?? null

function by(getKey, direction) {
  return (a, b) => {
    const ka = getKey(a)
    const kb = getKey(b)
    if (ka == null && kb == null) return 0
    if (ka == null) return 1 // missing values last, whatever the direction
    if (kb == null) return -1
    const diff = typeof ka === 'number' ? ka - kb : ka.localeCompare(kb)
    return direction * diff
  }
}

export function sortEvents(events, sortBy) {
  switch (sortBy) {
    case SORT_OPTIONS.priceLowHigh:
      return [...events].sort(by(lowPrice, 1))
    case SORT_OPTIONS.priceHighLow:
      return [...events].sort(by(highPrice, -1))
    case SORT_OPTIONS.dateNearest:
      return [...events].sort(by(dateKey, 1))
    case SORT_OPTIONS.dateFurthest:
      return [...events].sort(by(dateKey, -1))
    default:
      return events
  }
}
