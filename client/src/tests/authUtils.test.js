import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeEmail, validateLogin, validateSignup } from '../auth/authUtils.js'

const validSignup = {
  name: 'Heidi',
  email: 'heidi@example.com',
  password: 'longenough',
  confirmPassword: 'longenough',
}

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Heidi@Example.COM '), 'heidi@example.com')
})

test('validateLogin: valid input has no errors', () => {
  assert.deepEqual(validateLogin({ email: 'a@b.co', password: 'x' }), {})
})

test('validateLogin: missing and malformed fields', () => {
  assert.deepEqual(Object.keys(validateLogin({})).sort(), ['email', 'password'])
  assert.ok(validateLogin({ email: 'not-an-email', password: 'x' }).email)
})

test('validateSignup: valid input has no errors', () => {
  assert.deepEqual(validateSignup(validSignup), {})
})

test('validateSignup: flags each invalid field', () => {
  assert.ok(validateSignup({ ...validSignup, name: '   ' }).name)
  assert.ok(validateSignup({ ...validSignup, email: 'bad@' }).email)
  assert.ok(validateSignup({ ...validSignup, password: 'short', confirmPassword: 'short' }).password)
  assert.equal(
    validateSignup({ ...validSignup, confirmPassword: 'different1' }).confirmPassword,
    'Passwords do not match.',
  )
})
