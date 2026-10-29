import { formatDate, formatPrice } from '../utils/formatEvent'
import { isPastEvent } from '../utils/pastEvent'
import TicketLink from './TicketLink'
import './EventCard.css'
import HeartButton from './HeartButton'

function EventCard({ event, onSelect, saved = false, saving = false, onToggleSave }) {
  const { name, url, image, date, time, venue, city, category, priceMin, priceMax, currency } =
    event
  const price = formatPrice(priceMin, priceMax, currency)
  const location = [venue, city].filter(Boolean).join(', ')
  const past = isPastEvent(event)

  const handleKeyDown = (e) => {
    if (!onSelect) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(event)
    }
  }

  return (
    <article
      className={past ? 'event-card event-card--past' : 'event-card'}
      onClick={onSelect ? () => onSelect(event) : undefined}
      onKeyDown={onSelect ? handleKeyDown : undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={onSelect ? `View details for ${name}` : undefined}
    >
      <div className="event-card__media">
        {image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <div className="event-card__placeholder" aria-hidden="true">
            {name.charAt(0)}
          </div>
        )}
        {category && <span className="event-card__category">{category}</span>}
        {past && <span className="event-card__past-badge">Past event</span>}

        <HeartButton
          saved={saved}
          loading={saving}
          onClick={onToggleSave}
        />
      </div>

      <div className="event-card__body">
        <p className="event-card__date">{formatDate(date, time)}</p>
        <h3 className="event-card__title">{name}</h3>
        {location && <p className="event-card__location">{location}</p>}

        <div className="event-card__footer">
          {price && <span className="event-card__price">{price}</span>}
          {past ? (
            <span className="event-card__ended">Event ended</span>
          ) : (
            <TicketLink
              className="event-card__link"
              url={url}
              eventName={name}
              event={event}
              onClick={(e) => e.stopPropagation()}
            >
              Get tickets<span className="visually-hidden"> for {name}</span>
            </TicketLink>
          )}
        </div>
      </div>
    </article>
  )
}

export default EventCard
