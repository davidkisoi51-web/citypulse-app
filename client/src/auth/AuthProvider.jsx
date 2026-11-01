import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { SESSION_EXPIRED } from '../api/plansApi'

const SESSION_KEY = 'citypulse.session'
const TOKEN_KEY = 'citypulse.token'
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/$/, '')

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

// A saved user without a token isn't logged in.
function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw && readToken() ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// The browser only keeps the login token and a copy of who it belongs to (for the first
// paint); the account itself lives in the database and is re-checked with /auth/me.
function saveSession(user, token) {
  const session = { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin === true }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    if (token) localStorage.setItem(TOKEN_KEY, token)
  } catch {
    throw new Error('Browser storage is unavailable. Enable storage and try again.')
  }
  return session
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(TOKEN_KEY)
  } catch { /* Storage may be unavailable. */ }
}

async function authRequest(path, payload) {
  let response
  try {
    response = await fetch(`${API_URL}/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('Cannot reach CityPulse. Check your connection and try again.')
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error?.message || body?.message || 'Authentication failed. Please try again.')
  }
  const result = body?.data ?? body
  if (!result?.token || !result?.user) throw new Error('The server returned an invalid authentication response.')
  return saveSession(result.user, result.token)
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readSession)
  // Which user id the server has confirmed this visit (see below). Admin pages wait for it,
  // since a session saved by an older version of the app has no `isAdmin` yet.
  const [checkedId, setCheckedId] = useState(null)

  // On load, ask the server who the saved token belongs to: refreshes the name and admin
  // flag, and logs out if the token has expired or the account is gone. If the server
  // can't be reached, keep the saved session (the API still checks every request).
  const userId = user?.id
  useEffect(() => {
    const token = readToken()
    if (!userId || !token) return
    let cancelled = false
    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 401 || res.status === 422) {
          clearSession()
          setUser(null)
          return
        }
        const body = await res.json().catch(() => null)
        if (res.ok && body?.data?.user && !cancelled) setUser(saveSession(body.data.user))
      })
      .catch(() => {})
      .finally(() => !cancelled && setCheckedId(userId))
    return () => {
      cancelled = true
    }
  }, [userId])

  // Any API call answered with 401 means the saved token is no good any more.
  useEffect(() => {
    const expire = () => {
      clearSession()
      setUser(null)
    }
    window.addEventListener(SESSION_EXPIRED, expire)
    return () => window.removeEventListener(SESSION_EXPIRED, expire)
  }, [])

  const signup = useCallback(async ({ name, email, password }) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({name: name.trim(), email:email.trim().toLowerCase(), password})
    })
    const json = await res.json()
    console.log("REGISTER:", json, "STATUS:", res.status)

    if (!res.ok){
      throw new Error(json.error?.message || json.error || json.message|| "Signup failed")
    }
    //const session = await authRequest('register', { name: name.trim(), email: email.trim().toLowerCase(), password })
    //setUser(session)
    //return session
    return json.data
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  // Logging in gets fresh details from the server, so that counts as checked too.
  const login = useCallback(async ({ email, password }) => {
    const session = await authRequest('login', { email: email.trim().toLowerCase(), password })
    setUser(session)
    setCheckedId(session.id)
    return session
  }, [])

  const userChecked = Boolean(user) && checkedId === user.id
  const value = useMemo(
    () => ({ user, userChecked, signup, login, logout }),
    [user, userChecked, signup, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
