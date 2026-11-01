import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterPurchases, purchaseDay, purchaseOptions, purchasesToCsv } from '../admin/purchaseFilters.js'

// Local times, so the tests pass in any time zone.
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).toISOString()
const p = (receiptNo, paidAt, eventName, eventCategory) => ({ receiptNo, paidAt, eventName, eventCategory, quantity: 1, total: 100 })

const purchases = [
  p('a', at(2026, 10, 30), 'Sauti Sol', 'Music'),
  p('b', at(2026, 11, 1, 9), 'Harambee Stars', 'Sports'),
  p('c', at(2026, 11, 1, 20), 'Neyo', 'music'),
  p('d', at(2026, 11, 15), 'Comedy Night', 'Comedy'),
]
const ids = (list) => list.map((x) => x.receiptNo)

test('purchaseDay is the local calendar day; bad dates give an empty string', () => {
  assert.equal(purchaseDay({ paidAt: at(2026, 11, 1, 23) }), '2026-11-01')
  assert.equal(purchaseDay({ paidAt: 'nope' }), '')
  assert.equal(purchaseDay(null), '')
})

test('no filters keeps everything', () => {
  assert.deepEqual(ids(filterPurchases(purchases)), ['a', 'b', 'c', 'd'])
  assert.deepEqual(ids(filterPurchases(purchases, { category: 'all', event: 'all', date: '', month: '' })), ['a', 'b', 'c', 'd'])
})

test('filters by day, by month, by event type (any case) and by event', () => {
  assert.deepEqual(ids(filterPurchases(purchases, { date: '2026-11-01' })), ['b', 'c'])
  assert.deepEqual(ids(filterPurchases(purchases, { month: '2026-11' })), ['b', 'c', 'd'])
  assert.deepEqual(ids(filterPurchases(purchases, { month: '2026-10' })), ['a'])
  assert.deepEqual(ids(filterPurchases(purchases, { category: 'Music' })), ['a', 'c'])
  assert.deepEqual(ids(filterPurchases(purchases, { event: 'Neyo' })), ['c'])
})

test('filters combine', () => {
  assert.deepEqual(ids(filterPurchases(purchases, { month: '2026-11', category: 'music' })), ['c'])
  assert.deepEqual(ids(filterPurchases(purchases, { date: '2026-10-30', category: 'Sports' })), [])
})

test('options are unique (ignoring case), sorted and skip blanks', () => {
  assert.deepEqual(purchaseOptions([...purchases, p('e', at(2026, 11, 2), 'X', '  ')], 'eventCategory'), [
    'Comedy',
    'Music',
    'Sports',
  ])
})

test('CSV has a header, one row per purchase, and escapes awkward values', () => {
  const csv = purchasesToCsv([
    { receiptNo: 'G2-1', buyerName: 'Wanjiru, "WJ"', eventName: '=HYPERLINK("x")', eventVenue: 'KICC', eventCity: 'Nairobi', quantity: 2, total: 3000, mpesaCode: null },
  ])
  const [header, row, ...rest] = csv.split('\r\n')
  assert.equal(rest.length, 0)
  assert.match(header, /^Receipt no\.,Date paid,Buyer,Email,Event,Event type,/)
  assert.ok(row.startsWith('G2-1,,"Wanjiru, ""WJ""",,'))
  // Formula-looking text is neutralised so a spreadsheet shows it as text.
  assert.ok(row.includes(`"'=HYPERLINK(""x"")"`))
  assert.ok(row.includes('"KICC, Nairobi"'))
})

test('an empty history still gives the header row', () => {
  assert.equal(purchasesToCsv([]).split('\r\n').length, 1)
})
