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

// Human-friendly countdown label, e.g. "Today", "Tomorrow", "In 5 days".
export function daysUntilLabel(date, now = new Date()) {
  if (!date) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((new Date(`${date}T00:00:00`) - today) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

// Phrase for promo copy: "today", "tomorrow", "this week", or "on Mon, Oct 12".
export function whenPhrase(date, now = new Date()) {
  if (!date) return 'soon'
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((new Date(`${date}T00:00:00`) - today) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days <= 7) return 'this week'
  return `on ${formatDate(date)}`
}
