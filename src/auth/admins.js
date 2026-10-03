import { team } from '../data/team.js'
import { normalizeEmail } from './authUtils.js'

// Accounts with these emails can use the admin portal (/admin).
// Front-end only: anyone can sign up with one of these emails in their own browser,
// so this is a demo gate, not real security. Move the check to the backend later.
export const ADMIN_EMAILS = team.map((member) => normalizeEmail(member.email))

export function isAdmin(user) {
  return Boolean(user?.email) && ADMIN_EMAILS.includes(normalizeEmail(user.email))
}
