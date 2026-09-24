// Maps a raw Ticketmaster Discovery API event into the flat shape EventCard expects.
// Keeps the card components independent of the API response structure.

function pickImage(images = []) {
  if (!images.length) return null
  // Prefer a wide 16:9 image around 640px — sharp on cards without being huge.
  const wide = images
    .filter((img) => img.ratio === '16_9')
    .sort((a, b) => Math.abs(a.width - 640) - Math.abs(b.width - 640))
  return (wide[0] || images[0]).url
}

export function normalizeEvent(raw) {
  const venue = raw._embedded?.venues?.[0]
  const price = raw.priceRanges?.[0]

  return {
    id: raw.id,
    name: raw.name,
    url: raw.url,
    image: pickImage(raw.images),
    date: raw.dates?.start?.localDate ?? null,
    time: raw.dates?.start?.localTime ?? null,
    venue: venue?.name ?? null,
    city: venue?.city?.name ?? null,
    category: raw.classifications?.[0]?.segment?.name ?? null,
    priceMin: price?.min ?? null,
    priceMax: price?.max ?? null,
    currency: price?.currency ?? 'KES',
  }
}
