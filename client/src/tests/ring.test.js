import { test } from 'node:test'
import assert from 'node:assert/strict'
import { frontIndex, ringGeometry, snapAngle } from '../utils/ring.js'

test('step splits the circle evenly', () => {
  assert.equal(ringGeometry(8).step, 45)
  assert.equal(ringGeometry(10).step, 36)
})

test('radius grows with the number of cards and never drops below the floor', () => {
  assert.ok(ringGeometry(12).radius > ringGeometry(8).radius)
  assert.equal(ringGeometry(3).radius, 1.2)
  assert.equal(ringGeometry(1).radius, 1.2)
})

test('radius is wide enough that neighbours do not overlap', () => {
  const { step, radius } = ringGeometry(10)
  // Distance between two neighbouring card centres, in card widths.
  const chord = 2 * radius * Math.sin((step / 2) * (Math.PI / 180))
  assert.ok(chord >= 1)
})

test('no cards: empty geometry', () => {
  assert.deepEqual(ringGeometry(0), { step: 0, radius: 0 })
  assert.equal(frontIndex(0, 0), -1)
})

test('front card follows the turn, in both directions and past a full circle', () => {
  assert.equal(frontIndex(0, 8), 0)
  assert.equal(frontIndex(-45, 8), 1)
  assert.equal(frontIndex(-50, 8), 1)
  assert.equal(frontIndex(45, 8), 7)
  assert.equal(frontIndex(-360 - 90, 8), 2)
})

test('snapping lands on a card, and steps one card on or back', () => {
  assert.equal(snapAngle(-50, 8), -45)
  assert.equal(snapAngle(-50, 8, 1), -90)
  assert.equal(snapAngle(-50, 8, -1), 0)
})
