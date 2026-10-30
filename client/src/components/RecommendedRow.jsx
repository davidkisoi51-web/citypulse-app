import EventCard from './EventCard'
import './RecommendedRow.css'

// A single card sits still; from two up the cards are repeated to fill the loop.
const MIN_TO_SCROLL = 2
// Each loop holds at least this many cards so it's wider than the panel on desktop.
const MIN_PER_LOOP = 8
const SECONDS_PER_CARD = 5

// "Recommended for you": event cards in a framed panel that drift slowly to the left
// (paused on hover/focus), with a short reason ("Because you saved Music events in Nairobi").
// The loop is drawn twice so it can wrap without a jump; the copy is inert, so keyboard and
// screen-reader users only meet each card once. Renders nothing when there's nothing to show.
function RecommendedRow({ events = [], reason, onEventClick, savedEventIds = [], savingEventIds = [], onToggleSave }) {
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
          <EventCard
            event={event}
            onSelect={onEventClick}
            saved={savedEventIds.includes(event.id)}
            saving={savingEventIds.includes(event.id)}
            onToggleSave={onToggleSave ? () => onToggleSave(event) : undefined}
          />
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
