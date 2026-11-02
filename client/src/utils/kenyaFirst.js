// Puts Kenyan events first (keeping their order), then everything else (also in order).
// Events carry no country, so "Kenyan" means a Kenyan city or one of the team's own
// admin-created events (isAdmin), which are all local.
export const KENYAN_CITIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Naivasha', 'Malindi']

const kenyan = new Set(KENYAN_CITIES.map((c) => c.toLowerCase()))

export function isKenyanEvent(event) {
  return event?.isAdmin === true || kenyan.has((event?.city || '').trim().toLowerCase())
}

export function kenyaFirst(events = []) {
  return [...events.filter(isKenyanEvent), ...events.filter((e) => !isKenyanEvent(e))]
}
