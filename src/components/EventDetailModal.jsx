import { useEffect, useRef } from 'react';
import { formatDate, formatPrice } from '../utils/formatEvent';
import './EventDetailModal.css';

export default function EventDetailModal({ isOpen, onClose, event }) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => closeBtnRef.current?.focus(), 50);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  // `event` here is the normalized shape from utils/normalizeEvent.js — the same
  // shape EventCard and FeaturedBanner already consume — not a raw Ticketmaster record.
  const { name, category, date, time, image, url, priceMin, priceMax, currency, venue, city } =
    event;

  const formattedDate = formatDate(date, time);
  const price = formatPrice(priceMin, priceMax, currency);

  const locationQuery = [venue, city].filter(Boolean).join(', ');
  const mapsUrl = locationQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`
    : null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-header">
          <div className="category-pill">
            <span>{category || 'Event'}</span>
          </div>
          <button ref={closeBtnRef} className="close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </header>

        <div className="poster-container">
          <img
            src={image || 'https://placehold.co/600x350?text=No+Image+Available'}
            alt={name}
            className="event-poster-img"
          />
        </div>

        <div className="drawer-content">
          <h2 className="event-title">{name}</h2>

          <div className="meta-strip">
            <p>📅 {formattedDate}</p>
            {price && <span className="price-badge">🏷️ {price}</span>}
          </div>

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
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="ticket-btn">
              Get Tickets ↗
            </a>
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