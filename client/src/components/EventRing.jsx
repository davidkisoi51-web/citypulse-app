import { useEffect, useRef, useState } from 'react'
import { formatDate } from '../utils/formatEvent'
import { frontIndex, ringGeometry, snapAngle } from '../utils/ring'
import './EventRing.css'

const MIN_CARDS = 4
// The ring always has this many places (events repeat to fill them), so it's wide enough
// that about six posters face the viewer at once.
const SLOTS = 18
const DEGREES_PER_SECOND = 6
const EASE = 0.08

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Upcoming events as glowing posters around a slowly turning 3D ring. It stops while the
// pointer or keyboard focus is on it; the arrows turn it one card at a time, and focusing a
// card (Tab) brings it round to the front. Click a poster to open the event.
function EventRing({ events = [], onSelect }) {
  const ring = useRef(null)
  const angle = useRef(0)
  const target = useRef(0)
  const paused = useRef(false)
  const [front, setFront] = useState(0)

  const count = events.length < MIN_CARDS ? 0 : Math.max(events.length, SLOTS)
  const slots = Array.from({ length: count }, (_, i) => events[i % events.length])
  const { step, radius } = ringGeometry(count)

  useEffect(() => {
    if (!count) return
    let frame = 0
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(now - last, 100) / 1000
      last = now
      if (!paused.current && !document.hidden && !reducedMotion()) target.current -= DEGREES_PER_SECOND * dt
      angle.current = reducedMotion() ? target.current : angle.current + (target.current - angle.current) * EASE
      ring.current?.style.setProperty('--angle', `${angle.current}deg`)
      setFront(frontIndex(angle.current, count))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [count])

  if (!count) return null

  const turn = (by) => {
    target.current = snapAngle(target.current, count, by)
  }
  const bringToFront = (i) => {
    // Shortest way round to card i.
    const goal = -i * step
    const turns = Math.round((target.current - goal) / 360)
    target.current = goal + turns * 360
  }

  return (
    <section className="event-ring" aria-labelledby="event-ring-title">
      <h2 id="event-ring-title" className="app__section-title event-ring__title">
        Coming up
      </h2>
      <div
        className="event-ring__stage"
        style={{ '--radius': radius }}
        onPointerEnter={() => (paused.current = true)}
        onPointerLeave={() => (paused.current = false)}
        onFocus={() => (paused.current = true)}
        onBlur={() => (paused.current = false)}
      >
        <ul className="event-ring__ring" ref={ring}>
          <li className="event-ring__floor" aria-hidden="true" />
          {slots.map((event, i) => (
            <li
              key={`${i}-${event.id}`}
              className={i === front ? 'event-ring__item event-ring__item--front' : 'event-ring__item'}
              style={{ '--turn': `${i * step}deg` }}
            >
              <button
                type="button"
                className="event-ring__card"
                onClick={() => onSelect?.(event)}
                onFocus={() => bringToFront(i)}
                aria-label={`View details for ${event.name}`}
                // Repeats are mouse-only, so Tab and screen readers meet each event once.
                tabIndex={i < events.length ? undefined : -1}
                aria-hidden={i < events.length ? undefined : true}
              >
                {event.image ? (
                  <img src={event.image} alt="" loading="lazy" />
                ) : (
                  <span className="event-ring__placeholder" aria-hidden="true">
                    {event.name.charAt(0)}
                  </span>
                )}
                <span className="event-ring__caption">
                  {event.date && <span className="event-ring__date">{formatDate(event.date, event.time)}</span>}
                  <span className="event-ring__name">{event.name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="event-ring__controls">
        <button type="button" className="event-ring__arrow" onClick={() => turn(-1)} aria-label="Previous event">
          ‹
        </button>
        <button type="button" className="event-ring__arrow" onClick={() => turn(1)} aria-label="Next event">
          ›
        </button>
      </div>
    </section>
  )
}

export default EventRing
