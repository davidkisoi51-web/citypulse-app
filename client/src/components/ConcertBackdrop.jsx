import './Concert.css'

// Decorative concert scenery for the landing page: sweeping stage lights, haze and rising
// sparks behind everything, plus an equaliser to place in the page.
// All of it is hidden from screen readers and ignores clicks.

const BEAMS = [
  { left: '8%', color: '255, 107, 91', delay: '0s', duration: '7s' },
  { left: '28%', color: '251, 191, 36', delay: '-2s', duration: '9s' },
  { left: '50%', color: '236, 72, 153', delay: '-4s', duration: '8s' },
  { left: '72%', color: '251, 191, 36', delay: '-1s', duration: '10s' },
  { left: '92%', color: '255, 107, 91', delay: '-3s', duration: '7.5s' },
]

// Fixed pseudo-random numbers (0..1) so the scenery looks scattered but never changes.
const rand = (n) => {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export function ConcertBackdrop() {
  return (
    <div className="concert-backdrop" aria-hidden="true">
      <div className="concert-backdrop__haze" />
      {BEAMS.map((b, i) => (
        <span
          key={i}
          className="concert-beam"
          style={{ left: b.left, '--beam': b.color, animationDelay: b.delay, animationDuration: b.duration }}
        />
      ))}
      {Array.from({ length: 22 }, (_, i) => (
        <span
          key={i}
          className="concert-spark"
          style={{
            left: `${rand(i + 1) * 100}%`,
            animationDelay: `${-rand(i + 50) * 12}s`,
            animationDuration: `${8 + rand(i + 99) * 8}s`,
          }}
        />
      ))}
    </div>
  )
}

export function Equalizer({ bars = 28 }) {
  return (
    <div className="equalizer" aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          style={{
            animationDelay: `${-rand(i + 7) * 1.2}s`,
            animationDuration: `${0.6 + rand(i + 31) * 0.7}s`,
          }}
        />
      ))}
    </div>
  )
}
