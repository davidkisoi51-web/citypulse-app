import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, addSavedEvent, authPost, createPlan, deletePlan, describeError, listPlans, removeSavedEvent, updateSavedEvent } from '../api/plansApi.js'

const realFetch = globalThis.fetch
let calls
const mockFetch = (status, body) => {
  calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return { ok: status >= 200 && status < 300, status, json: async () => body }
  }
}
afterEach(() => {
  globalThis.fetch = realFetch
})

test('listPlans unwraps { data } from the Flask API', async () => {
  mockFetch(200, { data: [{ id: 1, title: 'Want to go' }] })
  assert.deepEqual(await listPlans(), [{ id: 1, title: 'Want to go' }])
  assert.match(calls[0].url, /\/api\/plans\/$/)
})

test('createPlan sends JSON with POST', async () => {
  mockFetch(201, { data: { id: 2, title: 'Date night' } })
  await createPlan({ title: 'Date night' })
  assert.equal(calls[0].options.method, 'POST')
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(calls[0].options.body), { title: 'Date night' })
})

test('authPost uses the configured API origin and preserves server error codes', async () => {
  mockFetch(201, { data: { email: 'new@example.test', verification_sent: false } })
  const result = await authPost('register', { name: 'New User', email: 'new@example.test' })
  assert.deepEqual(result, { email: 'new@example.test', verification_sent: false })
  assert.match(calls[0].url, /\/api\/auth\/register$/)
  assert.equal(calls[0].options.method, 'POST')

  mockFetch(403, { error: { code: 'email_not_verified', message: 'Please verify your email.' } })
  await assert.rejects(
    authPost('login', { email: 'new@example.test', password: 'secret' }),
    (err) => err.code === 'email_not_verified' && err.status === 403,
  )
})

test('204 responses resolve to null', async () => {
  mockFetch(204, null)
  assert.equal(await deletePlan(3), null)
  assert.equal(calls[0].options.method, 'DELETE')
})

test('saved-event endpoints use the expected paths', async () => {
  mockFetch(200, { data: { id: 9, status: 'going' } })
  await updateSavedEvent(9, { status: 'going' })
  assert.match(calls[0].url, /\/api\/plans\/events\/9$/)
  assert.equal(calls[0].options.method, 'PATCH')
  assert.deepEqual(JSON.parse(calls[0].options.body), { status: 'going' })
  mockFetch(201, { data: { id: 10 } })
  await addSavedEvent(1, { ticketmaster_id: 'tm-1', name: 'Bien' })
  assert.match(calls[0].url, /\/api\/plans\/1\/events$/)
  assert.equal(calls[0].options.method, 'POST')
  mockFetch(204, null)
  await removeSavedEvent(9)
  assert.match(calls[0].url, /\/api\/plans\/events\/9$/)
})

test('errors become ApiError with a friendly message', async () => {
  mockFetch(422, { error: { code: 'validation_error', message: 'title is required' } })
  await assert.rejects(createPlan({}), (err) => err instanceof ApiError && err.status === 422 && err.message === 'title is required')
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }
  await assert.rejects(listPlans(), (err) => err.code === 'network' && /reach the server/.test(err.message))
})

test('describeError covers auth, missing endpoints and server errors', () => {
  assert.match(describeError(401, null), /log in/)
  assert.match(describeError(404, null), /isn't available on the server yet/)
  assert.equal(describeError(404, { error: { code: 'not_found', message: 'Plan not found' } }), 'Plan not found')
  assert.equal(describeError(503, { error: { message: 'JWT authentication is not configured yet' } }), 'JWT authentication is not configured yet')
  assert.match(describeError(500, null), /went wrong/)
})

test('describeError: a server without M-PESA set up says so instead of a generic error', () => {
  assert.equal(
    describeError(502, { error: { code: 'mpesa_not_configured', message: 'MPESA_PASSKEY is not configured on the server' } }),
    "M-PESA payments aren't set up on this server yet.",
  )
})
