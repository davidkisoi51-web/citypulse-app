import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pointerOffset } from '../utils/pointer.js'

const rect = { left: 100, top: 50, width: 200, height: 100 }

test('centre of the box is 0,0', () => {
  assert.deepEqual(pointerOffset(200, 100, rect), { x: 0, y: 0 })
})

test('edges map to -1 and 1', () => {
  assert.deepEqual(pointerOffset(100, 50, rect), { x: -1, y: -1 })
  assert.deepEqual(pointerOffset(300, 150, rect), { x: 1, y: 1 })
  assert.deepEqual(pointerOffset(250, 75, rect), { x: 0.5, y: -0.5 })
})

test('a pointer outside the box is clamped', () => {
  assert.deepEqual(pointerOffset(0, 400, rect), { x: -1, y: 1 })
})

test('a box with no size counts as centred', () => {
  assert.deepEqual(pointerOffset(10, 10, { left: 0, top: 0, width: 0, height: 0 }), { x: 0, y: 0 })
  assert.deepEqual(pointerOffset(10, 10, null), { x: 0, y: 0 })
})
