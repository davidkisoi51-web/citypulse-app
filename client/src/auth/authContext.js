import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// { user, signup, login, logout } — user is { name, email } or null when logged out.
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
