import { useRef, useState } from 'react'
import EventCard from './EventCard'
import TicketLink from './TicketLink'
import { isPastEvent } from '../utils/pastEvent'
import { videoEmbed } from '../utils/videoEmbed'
import usePointerTilt from '../hooks/usePointerTilt'
import './FeaturedBanner.css'

// Shared background video for events without their own `video`: a YouTube or Vimeo link,
// or a direct .mp4/.webm (a full URL or a file in client/public/), set as
// VITE_FEATURED_VIDEO in client/.env. With no video (or one that fails to load) the banner
// shows the event photo instead.
const DEFAULT_VIDEO = import.meta.env?.VITE_FEATURED_VIDEO || ''

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Pause/play messages the embedded players understand, and where to send them.
const PLAYER_COMMANDS = {
  youtube: {
    origin: 'https://www.youtube-nocookie.com',
    message: (play) => JSON.stringify({ event: 'command', func: play ? 'playVideo' : 'pauseVideo', args: [] }),
  },
  vimeo: {
    origin: 'https://player.vimeo.com',
    message: (play) => JSON.stringify({ method: play ? 'play' : 'pause' }),
  },
}

function FeaturedBanner({ event, onSelect, saved = false, saving = false, onToggleSave }) {
  const tilt = usePointerTilt()
  const video = useRef(null)
  const frame = useRef(null)
  // Remember which video failed, so a new event with a different video gets a fresh try.
  const [failedSrc, setFailedSrc] = useState(null)
  // Files report play/pause themselves; embeds start playing unless motion is reduced.
  const [playing, setPlaying] = useState(false)
  const [embedPaused, setEmbedPaused] = useState(prefersReducedMotion)
  const embed = videoEmbed(event?.video || DEFAULT_VIDEO)
  const videoSrc = embed?.src ?? ''
  const videoFailed = failedSrc === videoSrc

  if (!event) return null

  const { name, url, image } = event
  // getNextEvent keeps events from earlier today, so the featured one may have already started.
  const past = isPastEvent(event)
  // Embedded players can't be started on demand without autoplay, so with reduced motion
  // they're skipped and the photo shows; files still get a paused first frame and a play button.
  const isEmbed = embed && embed.type !== 'file'
  const showVideo = Boolean(embed) && !videoFailed && !(isEmbed && prefersReducedMotion())
  const isPlaying = isEmbed ? !embedPaused : playing

  const togglePlay = () => {
    if (isEmbed) {
      const player = PLAYER_COMMANDS[embed.type]
      frame.current?.contentWindow?.postMessage(player.message(embedPaused), player.origin)
      setEmbedPaused(!embedPaused)
      return
    }
    const v = video.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  return (
    <section
      className={[
        'featured-banner',
        past && 'featured-banner--past',
        showVideo && 'featured-banner--video',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby="featured-title"
      {...tilt}
    >
      {/* Top: the video (or the event photo) edge to edge, with nothing over it. */}
      {(showVideo || image) && (
        <div className="featured-banner__media">
          {showVideo && isEmbed && (
            <div className="featured-banner__embed" aria-hidden="true">
              <iframe
                ref={frame}
                key={videoSrc}
                src={videoSrc}
                title="Background video"
                tabIndex={-1}
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          )}
          {showVideo && !isEmbed && (
            <video
              ref={video}
              key={videoSrc}
              className="featured-banner__video"
              src={videoSrc}
              poster={image || undefined}
              autoPlay={!prefersReducedMotion()}
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
              tabIndex={-1}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => setFailedSrc(videoSrc)}
            />
          )}
          {!showVideo && <img className="featured-banner__photo" src={image} alt="" />}
          {showVideo && (
            <button type="button" className="featured-banner__play" onClick={togglePlay}>
              {isPlaying ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
              <span className="visually-hidden">{isPlaying ? 'Pause background video' : 'Play background video'}</span>
            </button>
          )}
        </div>
      )}

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
            <h2 id="featured-title" className="featured-banner__title">
              Hurry up! Early bird tickets are going fast
            </h2>
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
