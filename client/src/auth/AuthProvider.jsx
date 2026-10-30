import { useCallback, useMemo, useState } from 'react'
import { AuthContext } from './authContext'

const SESSION_KEY = 'citypulse.session'
const TOKEN_KEY = 'citypulse.token'
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/$/, '')

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(user, token) {
  const session = { id: user.id, name: user.name, email: user.email }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    throw new Error('Browser storage is unavailable. Enable storage and try again.')
  }
  return session
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

  const login = useCallback(async ({ email, password }) => {
    const session = await authRequest('login', { email: email.trim().toLowerCase(), password })
    setUser(session)
    return session
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(TOKEN_KEY)
    } catch { /* Storage may be unavailable. */ }
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, signup, login, logout }), [user, signup, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
