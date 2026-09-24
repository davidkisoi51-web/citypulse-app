import { formatDate, formatPrice } from '../utils/formatEvent'
import './EventCard.css'

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
