import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  emptyEventForm,
  eventToForm,
  formToEvent,
  loadAdminEvents,
  saveAdminEvents,
  validateEventForm,
} from '../admin/adminEventUtils.js'
import { isAdmin } from '../auth/admins.js'
import { CANONICAL_KEYS } from './canonicalKeys.js'

const validForm = {
  ...emptyEventForm,
  name: 'Bien Live',
  date: '2026-12-01',
  time: '19:30',
  venue: 'KICC',
  city: 'Nairobi',
  category: 'Music',
  priceMin: '2000',
  priceMax: '4000',
  image: '/Bien.jpeg',
  url: 'https://tickets.example.com/bien',
}

// Minimal in-memory stand-in for localStorage.
function memoryStorage() {
  const data = new Map()
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) }
}

test('validateEventForm: a complete form is valid', () => {
  assert.deepEqual(validateEventForm(validForm), {})
})

test('validateEventForm: required fields', () => {
  assert.deepEqual(Object.keys(validateEventForm(emptyEventForm)).sort(), ['category', 'city', 'date', 'name'])
})

test('validateEventForm: prices', () => {
  assert.ok(validateEventForm({ ...validForm, priceMin: '-1' }).priceMin)
  assert.ok(validateEventForm({ ...validForm, priceMin: '5000', priceMax: '100' }).priceMax)
  assert.ok(validateEventForm({ ...validForm, priceMin: '', priceMax: '100' }).priceMin)
  assert.deepEqual(validateEventForm({ ...validForm, priceMin: '0', priceMax: '' }), {})
})

test('validateEventForm: image and ticket links', () => {
  assert.ok(validateEventForm({ ...validForm, image: 'Bien.jpeg' }).image)
  assert.equal(validateEventForm({ ...validForm, image: 'https://img.example.com/a.jpg' }).image, undefined)
  assert.ok(validateEventForm({ ...validForm, url: 'tickets.com' }).url)
  // Uploaded images are stored as data URLs.
  assert.equal(validateEventForm({ ...validForm, image: 'data:image/jpeg;base64,/9j/4AAQ' }).image, undefined)
  assert.ok(validateEventForm({ ...validForm, image: 'data:text/html;base64,PGI+' }).image)
})

test('formToEvent: produces the canonical event shape', () => {
  const event = formToEvent(validForm, 'admin-1')
  assert.deepEqual(Object.keys(event).filter((k) => k !== 'isAdmin').sort(), CANONICAL_KEYS)
  assert.equal(event.time, '19:30:00')
  assert.equal(event.priceMin, 2000)
  assert.equal(event.isAdmin, true)
})

test('formToEvent: blank optional fields become null', () => {
  const event = formToEvent({ ...validForm, venue: ' ', time: '', priceMin: '', priceMax: '', image: '', url: '' }, 'x')
  for (const key of ['venue', 'time', 'priceMin', 'priceMax', 'image', 'url']) assert.equal(event[key], null, key)
})

test('eventToForm round-trips through formToEvent', () => {
  const event = formToEvent(validForm, 'admin-1')
  assert.deepEqual(formToEvent(eventToForm(event), 'admin-1'), event)
})

test('save/load admin events, ignoring corrupt storage', () => {
  const storage = memoryStorage()
  const events = [formToEvent(validForm, 'admin-1')]
  saveAdminEvents(events, storage)
  assert.deepEqual(loadAdminEvents(storage), events)
  storage.setItem('citypulse.adminEvents', '{not json')
  assert.deepEqual(loadAdminEvents(storage), [])
})

test('loadAdminEvents: seeds once, at the top, without duplicates', () => {
  const seed = [{ id: 'mock-1', name: 'Bien', url: '#' }, { id: 'mock-2', name: 'Charisma', url: 'https://t.example' }]

  // Fresh browser: seed events, placeholder '#' link cleared.
  const fresh = memoryStorage()
  assert.deepEqual(loadAdminEvents(fresh, seed).map((e) => [e.id, e.url, e.isAdmin]), [
    ['mock-1', null, true],
    ['mock-2', 'https://t.example', true],
  ])

  // Admin events already saved before seeding existed: seed goes on top, existing ones kept.
  const existing = memoryStorage()
  saveAdminEvents([{ id: 'admin-1', name: 'Launch' }, { id: 'mock-2', name: 'Charisma (edited)' }], existing)
  assert.deepEqual(loadAdminEvents(existing, seed).map((e) => e.name), ['Bien', 'Launch', 'Charisma (edited)'])

  // Afterwards, deleted seed events stay deleted.
  saveAdminEvents([{ id: 'admin-1', name: 'Launch' }], existing)
  assert.deepEqual(loadAdminEvents(existing, seed).map((e) => e.id), ['admin-1'])
})

test('isAdmin: team emails only, case-insensitive', () => {
  assert.equal(isAdmin({ email: 'Heidi.Temba@student.moringaschool.com' }), true)
  assert.equal(isAdmin({ email: 'someone@example.com' }), false)
  assert.equal(isAdmin(null), false)
})
