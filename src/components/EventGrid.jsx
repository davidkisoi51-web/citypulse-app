import EventCard from './EventCard'
import './EventGrid.css'

function SkeletonCard() {
  return (
    <div className="event-card event-card--skeleton" aria-hidden="true">
      <div className="event-card__media" />
      <div className="event-card__body">
        <div className="skeleton-line" style={{ width: '40%' }} />
        <div className="skeleton-line" style={{ width: '85%', height: 18 }} />
        <div className="skeleton-line" style={{ width: '60%' }} />
      </div>
    </div>
  )
}

function EventGrid({ events = [], loading = false, error = null, skeletonCount = 6, onRetry, onEventClick }) {
  if (error) {
    return (
      <div className="event-grid__status" role="alert">
        <p>Couldn't load events. {error}</p>
        {onRetry && (
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="event-grid" aria-busy="true" aria-label="Loading events">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (!events.length) {
    return <p className="event-grid__status">No events match the current filters.</p>
  }

  return (
    <ul className="event-grid">
      {events.map((event) => (
        <li key={event.id}>
          <EventCard event={event} onSelect={onEventClick} />
        </li>
      ))}
    </ul>
  )
}

export default EventGrid
