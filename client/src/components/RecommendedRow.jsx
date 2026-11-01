import { formatDate } from '../utils/formatEvent'
import './RecommendedRow.css'

// A single card sits still; from two up the cards are repeated to fill the loop.
const MIN_TO_SCROLL = 2
// Each loop holds at least this many cards so it's wider than the panel on desktop.
const MIN_PER_LOOP = 8
const SECONDS_PER_CARD = 5

// "Recommended for you": poster cards (just the photo, date and name; the rest is in the popup
// they open) in a framed panel that drift slowly to the left
// (paused on hover/focus), with a short reason ("Because you saved Music events in Nairobi").
// The loop is drawn twice so it can wrap without a jump; the copy is inert, so keyboard and
// screen-reader users only meet each card once. Renders nothing when there's nothing to show.
function RecommendedRow({ events = [], reason, onEventClick }) {
  if (!events.length) return null

  const scrolling = events.length >= MIN_TO_SCROLL
  const loop = scrolling ? Array.from({ length: Math.ceil(MIN_PER_LOOP / events.length) }, () => events).flat() : events

  const renderList = (copy) => (
    <ul className="recommended__row" key={copy} inert={copy > 0 ? true : undefined}>
      {loop.map((event, i) => (
        <li
          key={`${i}-${event.id}`}
          className="recommended__item"
          inert={copy === 0 && i >= events.length ? true : undefined}
        >
          <button
            type="button"
            className="recommended__card"
            onClick={() => onEventClick?.(event)}
            aria-label={`View details for ${event.name}`}
          >
            <span className="recommended__media">
              {event.image ? (
                <img src={event.image} alt="" loading="lazy" />
              ) : (
                <span className="recommended__placeholder" aria-hidden="true">
                  {event.name.charAt(0)}
                </span>
              )}
            </span>
            <span className="recommended__caption">
              <span className="recommended__date">{formatDate(event.date, event.time)}</span>
              <span className="recommended__name">{event.name}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <section className="recommended" aria-labelledby="recommended-title">
      <div className="recommended__header">
        <h2 id="recommended-title" className="app__section-title recommended__title">
          Recommended for you
        </h2>
        {reason && <p className="recommended__reason">{reason}</p>}
      </div>
      <div className={`recommended__panel${scrolling ? ' recommended__panel--scrolling' : ''}`}>
        <div className="recommended__track" style={{ '--marquee-duration': `${loop.length * SECONDS_PER_CARD}s` }}>
          {renderList(0)}
          {scrolling && renderList(1)}
        </div>
      </div>
    </section>
  )
}

export default RecommendedRow
