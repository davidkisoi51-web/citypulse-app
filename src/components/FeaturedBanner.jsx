import EventCard from './EventCard'
import { daysUntilLabel, formatPrice, whenPhrase } from '../utils/formatEvent'
import './FeaturedBanner.css'

function FeaturedBanner({ event, onSelect }) {
  if (!event) return null

  const { name, url, image, date, priceMin, currency } = event
  const fromPrice = formatPrice(priceMin, priceMin, currency)

  return (
    <section className="featured-banner" aria-labelledby="featured-title">
      {image && <img className="featured-banner__bg" src={image} alt="" />}

      <div className="featured-banner__promo">
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
        <a className="featured-banner__cta" href={url} target="_blank" rel="noopener noreferrer">
          Get early bird ticket<span className="visually-hidden"> for {name}</span>
        </a>
      </div>

      <div className="featured-banner__card">
        <EventCard event={event} onSelect={onSelect} />
      </div>
    </section>
  )
}

export default FeaturedBanner
