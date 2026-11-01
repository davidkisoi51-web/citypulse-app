import { useEffect, useRef } from 'react'
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

// Scroll reveal: cards fade and rise in as they come into view, a row at a time, staggered
// left to right. Cards start visible; the hiding class is only added once JS is running and
// the browser supports it, so nothing can get stuck invisible.
function useReveal(list, deps) {
  useEffect(() => {
    const ul = list.current
    if (!ul || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const items = [...ul.children]
    ul.classList.add('event-grid--reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        let n = 0
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.style.setProperty('--reveal-delay', `${n++ * 70}ms`)
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
    )
    items.forEach((li) => observer.observe(li))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function EventGrid({ events = [], loading = false, error = null, skeletonCount = 6, onEventClick, savedEventIds = [], savingEventIds = [], onToggleSave, }) {
  const list = useRef(null)
  useReveal(list, [events, loading, error])

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
    <ul className="event-grid" ref={list}>
      {events.map((event) => (
        <li key={event.id}>
          <EventCard event={event} onSelect={onEventClick} saved={savedEventIds.includes(event.id)} saving={savingEventIds.includes(event.id)} onToggleSave={onToggleSave ? () => onToggleSave(event) : undefined} />
        </li>
      ))}
    </ul>
  )
}

export default EventGrid
