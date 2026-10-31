const pad = (value) => String(value).padStart(2, '0')

function validDateParts(event) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event?.date || '')) return null
  const [year, month, day] = event.date.split('-').map(Number)
  const suppliedTime = typeof event.time === 'string' ? event.time.trim() : ''
  const timeMatch = suppliedTime ? /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(suppliedTime) : null
  if (suppliedTime && !timeMatch) return null
  if (timeMatch && (Number(timeMatch[1]) > 23 || Number(timeMatch[2]) > 59 || Number(timeMatch[3] || 0) > 59)) return null
  const dateCheck = new Date(year, month - 1, day)
  if (dateCheck.getFullYear() !== year || dateCheck.getMonth() !== month - 1 || dateCheck.getDate() !== day) return null
  return { year, month, day, time: timeMatch ? [Number(timeMatch[1]), Number(timeMatch[2]), Number(timeMatch[3] || 0)] : null }
}

function escapeIcs(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function validTicketUrl(value) {
  if (typeof value !== 'string') return ''
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : ''
  } catch {
    return ''
  }
}

function icsDate(date) {
  return date.replace(/-/g, '')
}

export function buildCalendarEvent(event) {
  const parts = validDateParts(event)
  if (!parts) throw new Error('This event does not have a valid date.')
  const location = [event.venue, event.city].filter(Boolean).join(', ')
  const description = [event.category, validTicketUrl(event.url)].filter(Boolean).join(' | ')
  const uid = `${event.id || `${event.name}-${event.date}`}@citypulse`
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CityPulse//Event Calendar//EN',
    'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
    `SUMMARY:${escapeIcs(event.name || 'CityPulse event')}`,
    `LOCATION:${escapeIcs(location)}`, `DESCRIPTION:${escapeIcs(description)}`
  ]
  if (parts.time) {
    const start = new Date(parts.year, parts.month - 1, parts.day, ...parts.time)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const localStamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    lines.push(`DTSTART:${localStamp(start)}`, `DTEND:${localStamp(end)}`)
  } else {
    const end = new Date(parts.year, parts.month - 1, parts.day + 1)
    lines.push(`DTSTART;VALUE=DATE:${icsDate(event.date)}`, `DTEND;VALUE=DATE:${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}`)
  }
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

export function googleCalendarUrl(event) {
  const parts = validDateParts(event)
  if (!parts) return null
  let dates
  if (parts.time) {
    const start = new Date(parts.year, parts.month - 1, parts.day, ...parts.time)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    dates = `${stamp(start)}/${stamp(end)}`
  } else {
    const end = new Date(parts.year, parts.month - 1, parts.day + 1)
    dates = `${icsDate(event.date)}/${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}`
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: event.name || 'CityPulse event', dates,
    details: [event.category, validTicketUrl(event.url)].filter(Boolean).join(' | '),
    location: [event.venue, event.city].filter(Boolean).join(', ')
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function downloadIcs(event) {
  const blob = new Blob([buildCalendarEvent(event)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${(event.name || 'citypulse-event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'citypulse-event'}.ics`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
