import './NavBar.css'

function NavBar({ user, onLogin, onLogout, categories, category, onCategoryChange }) {
  return (
    <header className="nav">
      <a className="nav__brand" href="/">
        <span className="nav__logo" aria-hidden="true">●</span>
        Group2
      </a>

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

      <nav className="nav__profile" aria-label="Account">
        {user ? (
          <>
            <a className="nav__user" href="#profile">
              <span className="nav__avatar" aria-hidden="true">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="nav__name">{user.name}</span>
            </a>
            <button type="button" className="nav__button" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          <button type="button" className="nav__button nav__button--primary" onClick={onLogin}>
            Log in
          </button>
        )}
      </nav>
    </header>
  )
}

export default NavBar
