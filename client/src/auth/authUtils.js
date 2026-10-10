// Pure helpers for the front-end-only auth. No React here, so they can be unit tested.
//
// NOTE: accounts live in this browser's localStorage. This is a demo stand-in until the
// planned backend exists — it is NOT secure (anyone with access to the browser can read
// or edit the stored data). Swap AuthProvider's signup/login for API calls later.

export const MIN_PASSWORD_LENGTH = 8

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email = '') {
  return email.trim().toLowerCase()
}

// Each validator returns { field: message } for every invalid field; {} means valid.
export function validateLogin({ email = '', password = '' }) {
  const errors = {}
  if (!email.trim()) errors.email = 'Enter your email address.'
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Enter your password.'
  return errors
}

export function validateSignup({ name = '', email = '', password = '', confirmPassword = '' }) {
  const errors = {}
  if (!name.trim()) errors.name = 'Enter your name.'
  if (!email.trim()) errors.email = 'Enter your email address.'
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (!confirmPassword) errors.confirmPassword = 'Confirm your password.'
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.'
  return errors
}

// SHA-256 of email + password so plain-text passwords aren't stored. Still not real
// security (no server, no slow hash) — just avoids keeping the password itself around.
export async function hashPassword(email, password) {
  const data = new TextEncoder().encode(`${normalizeEmail(email)}:${password}`)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
