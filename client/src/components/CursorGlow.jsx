import { useEffect, useRef } from 'react'
import './CursorGlow.css'

// How far the mouse travels (px) between ripples, and the most ripples alive at once.
const RIPPLE_EVERY = 46
const MAX_RIPPLES = 18

// "Touching water": a bright liquid glow behind the page that follows the mouse, and ripple
// rings spreading out over the page as it moves (a bigger splash on click). Purely
// decorative: ignores clicks, hidden from screen readers, off for touch and reduced motion.
function CursorGlow() {
  const glow = useRef(null)
  const ripples = useRef(null)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!fine.matches || calm.matches) return

    let frame = 0
    let lastX = -999
    let lastY = -999

    const ripple = (x, y, splash = false) => {
      const layer = ripples.current
      if (!layer || layer.childElementCount >= MAX_RIPPLES) return
      const ring = document.createElement('span')
      ring.className = splash ? 'cursor-ripple cursor-ripple--splash' : 'cursor-ripple'
      ring.style.left = `${x}px`
      ring.style.top = `${y}px`
      ring.addEventListener('animationend', () => ring.remove(), { once: true })
      layer.appendChild(ring)
    }

    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        glow.current?.style.setProperty('--cx', `${e.clientX}px`)
        glow.current?.style.setProperty('--cy', `${e.clientY}px`)
        glow.current?.classList.add('cursor-glow--on')
      })
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) >= RIPPLE_EVERY) {
        lastX = e.clientX
        lastY = e.clientY
        ripple(e.clientX, e.clientY)
      }
    }
    const onDown = (e) => {
      if (e.pointerType === 'mouse') ripple(e.clientX, e.clientY, true)
    }
    const onLeave = () => glow.current?.classList.remove('cursor-glow--on')

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <>
      <div ref={glow} className="cursor-glow" aria-hidden="true" />
      <div ref={ripples} className="cursor-ripples" aria-hidden="true" />
    </>
  )
}

export default CursorGlow
