import { useEffect, useRef } from 'react';
import { formatDate, formatPrice } from '../utils/formatEvent';
import { isPastEvent } from '../utils/pastEvent';
import TicketLink from './TicketLink';
import { paysOnSite } from '../payment/paymentUtils';
import SaveToPlan from '../plans/SaveToPlan';
import { downloadIcs, googleCalendarUrl } from '../utils/calendarLinks';
import './EventDetailModal.css';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, select, input, [tabindex]:not([tabindex="-1"])';

export default function EventDetailModal({ isOpen, onClose, event }) {
  const closeBtnRef = useRef(null);
  const drawerRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Remember whatever had focus (the card that was clicked) so we can send
    // focus back to it once the modal closes.
    previouslyFocusedRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Trap Tab/Shift+Tab so focus cycles within the modal instead of
      // leaking out into the page behind it.
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    const focusTimeout = setTimeout(() => closeBtnRef.current?.focus(), 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      clearTimeout(focusTimeout);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  // `event` here is the normalized shape from utils/normalizeEvent.js — the same
  // shape EventCard and FeaturedBanner already consume — not a raw Ticketmaster record.
  const { name, category, date, time, image, url, priceMin, priceMax, currency, venue, city } =
    event;

  const posterSrc = image || 'https://placehold.co/600x350?text=No+Image+Available';
  const formattedDate = formatDate(date, time);
  const price = formatPrice(priceMin, priceMax, currency);
  const past = isPastEvent(event);
  const googleCalendarLink = googleCalendarUrl(event);

  const locationQuery = [venue, city].filter(Boolean).join(', ');
  const mapsUrl = locationQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`
    : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-drawer"
        onClick={(e) => e.stopPropagation()}
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
      >
        <header className="drawer-header">
          <div className="category-pill">
            <span>{category || 'Event'}</span>
          </div>
          <button ref={closeBtnRef} className="close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </header>

        {/* Whole photo shown (no cropping); a blurred copy fills the space around it. */}
        <div className="poster-container" style={{ '--poster-url': `url("${posterSrc}")` }}>
          <img src={posterSrc} alt={name} className="event-poster-img" />
        </div>

        <div className="drawer-content">
          {past && (
            <p className="past-event-banner" role="status">
              This event has already taken place. Tickets are no longer available.
            </p>
          )}
          <h2 className="event-title" id="event-modal-title">
            {name}
          </h2>

          <div className="meta-strip">
            <p>📅 {formattedDate}</p>
            {price && <span className="price-badge">🏷️ {price}</span>}
          </div>

          {!past && googleCalendarLink && (
            <section className="calendar-actions" aria-label="Add event to calendar">
              <button type="button" className="calendar-action" onClick={() => downloadIcs(event)}>
                <span aria-hidden="true">▦</span> Download calendar file (.ics)
              </button>
              <a className="calendar-action calendar-action--google" href={googleCalendarLink} target="_blank" rel="noopener noreferrer">
                <span aria-hidden="true">＋</span> Add to Google Calendar
              </a>
            </section>
          )}

          <hr className="divider" />

          <section className="venue-section">
            <h3>Venue Information</h3>
            <div className="venue-card">
              <h4>{venue || 'Venue details pending'}</h4>
              {city && <p>{city}</p>}
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="map-link">
                  📍 Open in Google Maps ↗
                </a>
              )}
            </div>
          </section>
        </div>

        <footer className="drawer-footer">
          {!past && <SaveToPlan event={event} />}
          {past ? (
            <button className="ticket-btn disabled" disabled>
              Event ended
            </button>
          ) : url || paysOnSite(event) ? (
            <TicketLink url={url} eventName={name} event={event} className="ticket-btn">
              {url ? 'Get Tickets ↗' : 'Get Tickets'}
            </TicketLink>
          ) : (
            <button className="ticket-btn disabled" disabled>
              Tickets Unavailable
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}