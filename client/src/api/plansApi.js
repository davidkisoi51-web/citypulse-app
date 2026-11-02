// Plans & Saved Events API (Flask, see PHASE2.md §5). Thin fetch wrapper used by the
// My Plans and Plan Details screens. Swap `request` for Amina's shared client.js once
// it's merged; the exported functions (and their callers) can stay the same.

export const API_URL = (
  import.meta.env?.VITE_API_URL ??
  globalThis.process?.env?.VITE_API_URL ??
  'http://localhost:5001/api'
).replace(/\/$/, '')

// Where the login token (JWT) is kept; AuthProvider writes it, every request sends it.
export const TOKEN_KEY = 'citypulse.token'

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'unknown' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function authPost(path, payload) {
  let response
  try {
    response = await fetch(`${API_URL}/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new ApiError('Cannot reach CityPulse. Check your connection and try again.', { code: 'network' })
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(
      body?.error?.message || body?.message || 'Authentication failed. Please try again.',
      { status: response.status, code: body?.error?.code ?? 'http_error' },
    )
  }
  return body?.data ?? body
}

function authHeader() {
  try {
    const token = globalThis.localStorage?.getItem(TOKEN_KEY)
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

export const SESSION_EXPIRED = 'citypulse:session-expired'

// Turns a failed response into a message a user can act on.
export function describeError(status, body) {
  const code = body?.error?.code
  const serverMessage = body?.error?.message
  if (status === 401) return 'Your session has expired. Please log in again.'
  if (status === 403) return serverMessage || "You don't have access to this."
  if (status === 404 && code === 'not_found') return serverMessage || 'Not found.'
  if (status === 404 || status === 405) return "This action isn't available on the server yet."
  if (status === 422) return serverMessage || 'Some details are invalid.'
  if (status === 503) return serverMessage || 'The server is not ready yet.'
  if (code === 'mpesa_not_configured') return "M-PESA payments aren't set up on this server yet."
  if (status >= 500) return 'Something went wrong on the server. Please try again.'
  return serverMessage || `Request failed (${status}).`
}

export async function request(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...authHeader() },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError("Can't reach the server. Check that the API is running.", { code: 'network' })
  }

  if (response.status === 204) return null
  const json = await response.json().catch(() => null)
  if (!response.ok) {
    // The login token expired or is no longer valid: AuthProvider logs out, and pages that
    // need an account send the visitor to log in (and back again afterwards).
    if (response.status === 401) globalThis.dispatchEvent?.(new Event(SESSION_EXPIRED))
    throw new ApiError(describeError(response.status, json), {
      status: response.status,
      code: json?.error?.code ?? 'http_error',
    })
  }
  return json?.data ?? json
}

// Plans
export const listPlans = () => request('/plans/')
export const getPlan = (planId) => request(`/plans/${planId}`)
export const createPlan = (fields) => request('/plans/', { method: 'POST', body: fields })
export const updatePlan = (planId, fields) => request(`/plans/${planId}`, { method: 'PATCH', body: fields })
export const deletePlan = (planId) => request(`/plans/${planId}`, { method: 'DELETE' })

// Saved events (server routes in server/routes/plans.py).
// Every saved event of the user, across all plans (used to fill in the heart buttons).
export const listAllSavedEvents = () => request('/plans/saved')
// `event` is a snapshot: { ticketmaster_id, name, url, image, date, time, venue, city, category,
// price_min, price_max, currency }. The server answers 409 if it's already in the plan.
export const addSavedEvent = (planId, event) => request(`/plans/${planId}/events`, { method: 'POST', body: event })
// changes: { status: 'interested' | 'going' } and/or { note: string | null }
export const updateSavedEvent = (eventId, changes) =>
  request(`/plans/events/${eventId}`, { method: 'PATCH', body: changes })
export const removeSavedEvent = (eventId) => request(`/plans/events/${eventId}`, { method: 'DELETE' })
