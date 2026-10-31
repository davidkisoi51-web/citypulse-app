import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCalendarEvent, googleCalendarUrl } from '../utils/calendarLinks.js'

test('builds an ICS event with date, time, venue and escaped values', () => {
  const ics = buildCalendarEvent({
    id: 'cp-1', name: 'Jazz, Live; Tonight', date: '2026-11-15', time: '19:30:00',
    venue: 'City Hall', city: 'Nairobi', url: 'https://example.com/event'
  })
  assert.match(ics, /BEGIN:VCALENDAR/)
  assert.match(ics, /SUMMARY:Jazz\\, Live\\; Tonight/)
  assert.match(ics, /DTSTART:\d{8}T193000/)
  assert.match(ics, /LOCATION:City Hall\\, Nairobi/)
  assert.match(ics, /END:VCALENDAR/)
})

test('supports all-day events and rejects invalid dates', () => {
  const ics = buildCalendarEvent({ name: 'Festival', date: '2026-11-15' })
  assert.match(ics, /DTSTART;VALUE=DATE:20261115/)
  assert.throws(() => buildCalendarEvent({ name: 'Broken', date: 'not-a-date' }), /valid date/)
})

test('creates a Google Calendar template URL', () => {
  const url = new URL(googleCalendarUrl({ name: 'Jazz Night', date: '2026-11-15', time: '19:30:00', city: 'Nairobi' }))
  assert.equal(url.origin, 'https://calendar.google.com')
  assert.equal(url.searchParams.get('text'), 'Jazz Night')
  assert.match(url.searchParams.get('dates'), /^20261115T193000\//)
})

test('does not include placeholder ticket URLs in calendar descriptions', () => {
  const event = {
    name: 'Mock Festival',
    date: '2026-11-15',
    url: '#',
    category: 'Music',
  }

  const ics = buildCalendarEvent(event)
  const google = new URL(googleCalendarUrl(event))

  assert.match(ics, /DESCRIPTION:Music/)
  assert.doesNotMatch(ics, /DESCRIPTION:.*#/)
  assert.equal(google.searchParams.get('details'), 'Music')
})

test('rejects malformed supplied times instead of treating them as all-day', () => {
  assert.equal(
    googleCalendarUrl({ name: 'Broken Event', date: '2026-11-15', time: 'abc' }),
    null
  )
})
