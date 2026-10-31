import { useCallback, useRef } from 'react'
import { pointerOffset } from '../utils/pointer.js'

// Mouse/trackpad only, and only when the user hasn't asked for less motion.
const canTilt = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Tracks the pointer over an element and writes its position as CSS variables on that
 * element: --px and --py (-1..1, 0 = centre). The CSS decides what to do with them
 * (tilt, parallax, a glare). Updates are batched to one per frame; on leave both go back
 * to 0. Spread the returned handlers onto the element.
 */
export default function usePointerTilt() {
  const frame = useRef(0)

  const write = (el, x, y) => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--px', x.toFixed(3))
      el.style.setProperty('--py', y.toFixed(3))
    })
  }

  const onPointerMove = useCallback((e) => {
    if (e.pointerType !== 'mouse' || !canTilt()) return
    const el = e.currentTarget
    const { x, y } = pointerOffset(e.clientX, e.clientY, el.getBoundingClientRect())
    write(el, x, y)
  }, [])

  const onPointerLeave = useCallback((e) => write(e.currentTarget, 0, 0), [])

  return { onPointerMove, onPointerLeave }
}
