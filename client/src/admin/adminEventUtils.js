// Pure helpers for admin-created events. No React here, so they can be unit tested.
//
// NOTE: like the auth, admin events are stored in this browser's localStorage until the
// planned backend exists. Swap AdminEventsProvider's load/save for API calls later.

export const ADMIN_EVENTS_KEY = 'citypulse.adminEvents'

// Empty form state. Numbers are kept as strings while editing.
export const emptyEventForm = {
  name: '',
  date: '',
  time: '',
  venue: '',
  city: '',
  category: '',
  priceMin: '',
  priceMax: '',
  currency: 'KES',
  image: '',
  url: '',
}

// Images can be full URLs, files in /public (e.g. /Bien.jpeg), or uploaded images (data URLs).
const URL_OR_PATH = /^(https?:\/\/\S+|\/\S+|data:image\/[a-z+]+;base64,\S+)$/i

export const isUploadedImage = (src = '') => src.startsWith('data:image/')

// Returns { field: message } for each invalid field; {} means valid.
export function validateEventForm(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Enter the event name.'
  if (!form.date) errors.date = 'Pick a date.'
  if (!form.city.trim()) errors.city = 'Enter the city.'
  if (!form.category.trim()) errors.category = 'Choose or type a category.'

  const min = form.priceMin === '' ? null : Number(form.priceMin)
  const max = form.priceMax === '' ? null : Number(form.priceMax)
  if (min !== null && (Number.isNaN(min) || min < 0)) errors.priceMin = 'Enter 0 or more.'
  if (max !== null && (Number.isNaN(max) || max < 0)) errors.priceMax = 'Enter 0 or more.'
  if (min === null && max !== null) errors.priceMin = 'Enter a minimum price too.'
  if (min !== null && max !== null && !errors.priceMin && !errors.priceMax && max < min) {
    errors.priceMax = 'Must be at least the minimum price.'
  }

  if (form.image.trim() && !URL_OR_PATH.test(form.image.trim())) {
    errors.image = 'Use a full https:// link or a /path from the public folder.'
  }
  if (form.url.trim() && !/^https?:\/\/\S+$/i.test(form.url.trim())) {
    errors.url = 'Use a full https:// link.'
  }
  return errors
}

// Form values -> canonical CityPulse event (RULES.md 3.1), plus an `isAdmin` marker.
export function formToEvent(form, id) {
  const text = (v) => (v.trim() ? v.trim() : null)
  const num = (v) => (v === '' ? null : Number(v))
  return {
    id,
    name: form.name.trim(),
    url: text(form.url),
    image: text(form.image),
    date: form.date || null,
    time: form.time ? (form.time.length === 5 ? `${form.time}:00` : form.time) : null,
    venue: text(form.venue),
    city: text(form.city),
    category: text(form.category),
    priceMin: num(form.priceMin),
    priceMax: num(form.priceMax),
    currency: text(form.currency) ?? 'KES',
    isAdmin: true,
  }
}

// Canonical event -> form values (for editing).
export function eventToForm(event) {
  const str = (v) => (v == null ? '' : String(v))
  return {
    name: str(event.name),
    date: str(event.date),
    time: event.time ? event.time.slice(0, 5) : '',
    venue: str(event.venue),
    city: str(event.city),
    category: str(event.category),
    priceMin: str(event.priceMin),
    priceMax: str(event.priceMax),
    currency: str(event.currency) || 'KES',
    image: str(event.image),
    url: event.url === '#' ? '' : str(event.url),
  }
}

export function newEventId() {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `admin-${random}`
}

export const ADMIN_SEEDED_KEY = 'citypulse.adminEventsSeeded'

// '#' is the sample data's placeholder ticket link; treat it as "no link" so the event is editable.
const fromSeed = (event) => ({ ...event, url: event.url === '#' ? null : event.url, isAdmin: true })

// Loads saved admin events. The first time (per browser), the `seed` events are added at the
// top — even if some admin events were already saved — and a flag is stored so seed events
// the admin later deletes stay deleted. localStorage can be unavailable; never crash on it.
export function loadAdminEvents(storage = globalThis.localStorage, seed = []) {
  let saved = []
  try {
    const parsed = JSON.parse(storage?.getItem(ADMIN_EVENTS_KEY) ?? '[]')
    saved = Array.isArray(parsed) ? parsed.filter((e) => e && e.id && e.name) : []
  } catch {
    // Corrupt data: start from an empty list.
  }

  let alreadySeeded = true
  try {
    alreadySeeded = storage?.getItem(ADMIN_SEEDED_KEY) === '1'
  } catch {
    // Can't read the flag: don't re-add seed events on top of what's there.
  }
  if (alreadySeeded || seed.length === 0) return saved

  const savedIds = new Set(saved.map((e) => e.id))
  const merged = [...seed.filter((e) => !savedIds.has(e.id)).map(fromSeed), ...saved]
  if (saveAdminEvents(merged, storage)) {
    try {
      storage?.setItem(ADMIN_SEEDED_KEY, '1')
    } catch {
      // Flag not stored: seeding is simply tried again next time (ids prevent duplicates).
    }
  }
  return merged
}

// Returns false if the browser refused to save (storage full or unavailable).
export function saveAdminEvents(events, storage = globalThis.localStorage) {
  try {
    storage?.setItem(ADMIN_EVENTS_KEY, JSON.stringify(events))
    return true
  } catch {
    return false
  }
}
