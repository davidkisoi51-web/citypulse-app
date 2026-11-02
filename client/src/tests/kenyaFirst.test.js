import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isKenyanEvent, kenyaFirst } from '../utils/kenyaFirst.js'

const ev = (id, city, extra = {}) => ({ id, city, ...extra })

test('Kenyan cities (any case/spacing) and admin events count as Kenyan', () => {
  assert.equal(isKenyanEvent(ev('a', 'Nairobi')), true)
  assert.equal(isKenyanEvent(ev('b', ' mombasa ')), true)
  assert.equal(isKenyanEvent(ev('c', 'Cape Town', { isAdmin: true })), true)
  assert.equal(isKenyanEvent(ev('d', 'Johannesburg')), false)
  assert.equal(isKenyanEvent(ev('e', null)), false)
  assert.equal(isKenyanEvent(null), false)
})

test('Kenyan events move to the front; both groups keep their order', () => {
  const list = [ev('za1', 'Johannesburg'), ev('ke1', 'Nairobi'), ev('ng1', 'Lagos'), ev('ke2', 'Kisumu')]
  assert.deepEqual(kenyaFirst(list).map((e) => e.id), ['ke1', 'ke2', 'za1', 'ng1'])
})

test('no Kenyan events, or none at all, leaves the list as it is', () => {
  const list = [ev('za1', 'Durban'), ev('za2', 'Pretoria')]
  assert.deepEqual(kenyaFirst(list), list)
  assert.deepEqual(kenyaFirst(), [])
})
