const clamp = (n) => Math.max(-1, Math.min(1, n))

// Where the pointer is over a box, from -1 (left/top edge) through 0 (centre) to 1
// (right/bottom edge); clamped so a pointer just outside the box can't overshoot.
// An empty box (not laid out yet) counts as centred.
export function pointerOffset(clientX, clientY, rect) {
  if (!rect?.width || !rect?.height) return { x: 0, y: 0 }
  return {
    x: clamp(((clientX - rect.left) / rect.width) * 2 - 1),
    y: clamp(((clientY - rect.top) / rect.height) * 2 - 1),
  }
}
