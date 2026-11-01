import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { useAuth } from '../auth/authContext'
import { isAdmin } from '../auth/admins'
import './AuthPage.css'
import './AdminPage.css'
import './AdminLayout.css'

// The admin portal's frame: checks the visitor is a logged-in admin, then shows a left
// sidebar (Dashboard, Events) next to the chosen section. Phones get the links as tabs on top.
function AdminLayout() {
  const { user, userChecked } = useAuth()
  const { pathname } = useLocation()

  // Not logged in: log in first, then come back to the same admin page.
  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />

  // Wait for the server to confirm who this is before saying "no".
  if (!isAdmin(user) && !userChecked) {
    return (
      <>
        <NavBar />
        <main className="admin admin--denied">
          <p className="admin__empty" role="status">
            Checking your access…
          </p>
        </main>
      </>
    )
  }

  if (!isAdmin(user)) {
    return (
      <>
        <NavBar />
        <main className="admin admin--denied">
          <section className="admin__panel">
            <h1 className="admin__title">Admins only</h1>
            <p>Your account ({user.email}) doesn't have access to the admin portal.</p>
            <Link className="admin__link" to="/events">
              ← Back to events
            </Link>
          </section>
        </main>
      </>
    )
  }

  return (
    <>
      <NavBar />
      <div className="admin-shell">
        <aside className="admin-shell__side">
          <p className="admin-shell__label">Admin portal</p>
          <nav aria-label="Admin sections" className="admin-shell__nav">
            <NavLink to="/admin" end className="admin-shell__link">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 13h6V4H4zM14 20h6v-9h-6zM14 4v4h6V4zM4 20h6v-4H4z" />
              </svg>
              Dashboard
            </NavLink>
            <NavLink to="/admin/events" className="admin-shell__link">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
                <path d="M3.5 10h17M8 3v4M16 3v4" />
              </svg>
              Events
            </NavLink>
          </nav>
          <Link className="admin-shell__back" to="/events">
            ← Back to site
          </Link>
        </aside>
        <main className="admin admin-shell__main">
          <Outlet />
        </main>
      </div>
    </>
  )
}

export default AdminLayout
