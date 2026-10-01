import './SearchBar.css'

function SearchBar({ value, onChange, placeholder = 'Search events, venues or categories' }) {
  return (
    <form className="search-bar" role="search" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="event-search" className="visually-hidden">
        Search events
      </label>
      <svg className="search-bar__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
      <input
        id="event-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </form>
  )
}

export default SearchBar
