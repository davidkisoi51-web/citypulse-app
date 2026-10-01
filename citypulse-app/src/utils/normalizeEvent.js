// Maps a raw Ticketmaster Discovery API event into the single CityPulse Event shape.

function pickImage(images = []) {
  if (!images.length) return null

  const wide = images
    .filter((image) => image.ratio === '16_9')
    .slice()
    .sort((a, b) => Math.abs(a.width - 640) - Math.abs(b.width - 640))

  return (wide[0] || images[0])?.url ?? null
}

export function normalizeEvent(raw = {}) {
  const venue = raw._embedded?.venues?.[0]
  const price = raw.priceRanges?.[0]

  return {
    id: raw.id ?? null,
    name: raw.name ?? 'Untitled event',
    url: raw.url ?? null,
    image: pickImage(raw.images),
    date: raw.dates?.start?.localDate ?? null,
    time: raw.dates?.start?.localTime ?? null,
    venue: venue?.name ?? null,
    city: venue?.city?.name ?? null,
    category: raw.classifications?.[0]?.segment?.name ?? null,
    priceMin: price?.min ?? null,
    priceMax: price?.max ?? null,
    currency: price?.currency ?? null,
  }
}
