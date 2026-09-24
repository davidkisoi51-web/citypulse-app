import './EventCard.css'

function formatDate(date, time) {
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

function formatPrice(min, max, currency) {
  if (min == null) return null
  if (min === 0 && (max == null || max === 0)) return 'Free'
  const fmt = (n) =>
    n.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 0 })
  return max != null && max !== min ? `${fmt(min)} – ${fmt(max)}` : `From ${fmt(min)}`
}

function EventCard({ event }) {
  const { name, url, image, date, time, venue, city, category, priceMin, priceMax, currency } =
    event
  const price = formatPrice(priceMin, priceMax, currency)
  const location = [venue, city].filter(Boolean).join(', ')

  return (
    <article className="event-card">
      <div className="event-card__media">
        {image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <div className="event-card__placeholder" aria-hidden="true">
            {name.charAt(0)}
          </div>
        )}
        {category && <span className="event-card__category">{category}</span>}
      </div>

      <div className="event-card__body">
        <p className="event-card__date">{formatDate(date, time)}</p>
        <h3 className="event-card__title">{name}</h3>
        {location && <p className="event-card__location">{location}</p>}

        <div className="event-card__footer">
          {price && <span className="event-card__price">{price}</span>}
          <a
            className="event-card__link"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get tickets<span className="visually-hidden"> for {name}</span>
          </a>
        </div>
      </div>
    </article>
  )
}

export default EventCard
