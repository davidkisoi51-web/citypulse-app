import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { normalizeEmail } from '../auth/authUtils'
import { isAdmin } from '../auth/admins'
import { loadPurchases } from '../payment/purchases'
import AccountMenu from './AccountMenu'
import './NavBar.css'

function NavBar({ categories, category, onCategoryChange }) {
  const { user, logout } = useAuth()

  return (
    <header className="nav">

      <Link className="nav__brand" to="/">
        <img className="nav__logo" src="/group2-logo.jpg" alt="" width="68" height="68" />
        Group2
      </Link>

      {categories && (
      <div className="nav__filter">
        <label htmlFor="category-filter" className="visually-hidden">
          Filter by category
        </label>
        <select
          id="category-filter"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      )}

  

      <nav className="nav__profile" aria-label="Account">
        {user ? (
          <>
            {isAdmin(user) && (
              <NavLink to="/admin" className="nav__admin-link" title="Admin portal">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span className="nav__admin-text">Admin</span>
                <span className="visually-hidden"> portal</span>
              </NavLink>
            )}
            <MyTicketsLink email={user.email} />
            <AccountMenu user={user} onLogout={logout} />
          </>
        ) : (
          <>
            <Link className="nav__button" to="/login">
              Log in
            </Link>
            <Link className="nav__button nav__button--primary" to="/signup">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}

// Clock (history) icon linking to the user's purchase history, with a count badge.
function MyTicketsLink({ email }) {
  const count = loadPurchases().filter((p) => normalizeEmail(p.buyerEmail) === normalizeEmail(email)).length
  const label = count ? `My tickets (${count})` : 'My tickets'

  return (
    <NavLink to="/my-tickets" className="nav__icon-link" aria-label={label} title="My tickets">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      {count > 0 && (
        <span className="nav__badge" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </NavLink>
  )
}

export default NavBar
