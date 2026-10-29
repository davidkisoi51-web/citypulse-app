import EventCard from './EventCard'
import TicketLink from './TicketLink'
import { daysUntilLabel, formatPrice, whenPhrase } from '../utils/formatEvent'
import { isPastEvent } from '../utils/pastEvent'
import './FeaturedBanner.css'

function FeaturedBanner({ event, onSelect, saved = false, saving = false, onToggleSave }) {
  if (!event) return null

  const { name, url, image, date, priceMin, currency } = event
  const fromPrice = formatPrice(priceMin, priceMin, currency)
  // getNextEvent keeps events from earlier today, so the featured one may have already started.
  const past = isPastEvent(event)

  return (
    <section
      className={past ? 'featured-banner featured-banner--past' : 'featured-banner'}
      aria-labelledby="featured-title"
    >
      {image && <img className="featured-banner__bg" src={image} alt="" />}

      <div className="featured-banner__promo">
        {past ? (
          <>
            <p className="featured-banner__eyebrow">Event ended</p>
            <h2 id="featured-title" className="featured-banner__title">
              {name} has already taken place
            </h2>
            <p className="featured-banner__text">
              Tickets are no longer on sale. Browse the events below for what's coming up next.
            </p>
          </>
        ) : (
          <>
            <p className="featured-banner__eyebrow">
              <span className="featured-banner__pulse" aria-hidden="true" />
              Early bird · {daysUntilLabel(date)}
            </p>
            <h2 id="featured-title" className="featured-banner__title">
              Hurry up! Early bird tickets are going fast
            </h2>
            <p className="featured-banner__text">
              Get your early bird ticket for <strong>{name}</strong>, coming {whenPhrase(date)}.
              {fromPrice && <> Tickets from {fromPrice} — while they last.</>}
            </p>
            <TicketLink className="featured-banner__cta" url={url} eventName={name} event={event}>
              Get early bird ticket<span className="visually-hidden"> for {name}</span>
            </TicketLink>
          </>
        )}
      </div>

      <div className="featured-banner__card">
        <EventCard
          event={event}
          onSelect={onSelect}
          saved={saved}
          saving={saving}
          onToggleSave={onToggleSave ? () => onToggleSave(event) : undefined}
        />
      </div>
    </section>
  )
}

export default FeaturedBanner
