import { Link } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
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
          <AccountMenu user={user} onLogout={logout} />
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

export default NavBar
