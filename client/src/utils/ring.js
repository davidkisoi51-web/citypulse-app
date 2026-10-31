// Geometry for the 3D event ring: `count` cards stood around a circle, facing out.

// Space between neighbouring cards, as a share of a card's width.
const GAP = 0.18

// `step`: degrees between neighbours. `radius`: how far each card is pushed out from the
// centre, as a multiple of the card width, so neighbours sit side by side without
// overlapping (plus a floor so a small ring doesn't crush its cards together).
export function ringGeometry(count) {
  if (count < 1) return { step: 0, radius: 0 }
  const step = 360 / count
  const fit = (1 + GAP) / (2 * Math.tan(Math.PI / count))
  return { step, radius: Math.max(1.2, Number.isFinite(fit) ? fit : 0) }
}

// Which card faces the viewer when the ring is turned by `angle` degrees (the ring turns
// the opposite way to the cards, so card i is in front at angle = -i * step).
export function frontIndex(angle, count) {
  if (count < 1) return -1
  const step = 360 / count
  const i = Math.round(-angle / step) % count
  return (i + count) % count
}

// The nearest angle at which a card sits exactly in front, `by` cards on from `angle`
// (by = 1: next card, -1: previous).
export function snapAngle(angle, count, by = 0) {
  if (count < 1) return angle
  const step = 360 / count
  return (Math.round(angle / step) - by) * step
}
