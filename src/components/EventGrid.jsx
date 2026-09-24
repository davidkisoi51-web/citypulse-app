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

function EventGrid({ events = [], loading = false, error = null, skeletonCount = 6 }) {
  if (error) {
    return (
      <p className="event-grid__status" role="alert">
        Couldn't load events. {error}
      </p>
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
    return <p className="event-grid__status">No events found. Try a different search.</p>
  }

  return (
    <ul className="event-grid">
      {events.map((event) => (
        <li key={event.id}>
          <EventCard event={event} />
        </li>
      ))}
    </ul>
  )
}

export default EventGrid
