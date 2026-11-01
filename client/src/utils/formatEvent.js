// Display helpers shared by EventCard and FeaturedBanner.

export function formatDate(date, time) {
  if (!date) return 'Date TBA'
  // Append the time (or midnight) so the date parses in local time, not UTC.
  const d = new Date(`${date}T${time || '00:00:00'}`)
  const day = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  if (!time) return day
  const clock = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${clock}`
}

export function formatPrice(min, max, currency) {
  if (min == null) return null
  if (min === 0 && (max == null || max === 0)) return 'Free'
  const fmt = (n) =>
    n.toLocaleString('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 })
  if (max === min) return fmt(min)
  return max != null ? `${fmt(min)} – ${fmt(max)}` : `From ${fmt(min)}`
}
