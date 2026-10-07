import './SearchBar.css'

// sortBy: current sort ('all' = none). Choosing a price sort clears the date sort and vice versa.
function SearchBar({ value, onChange, onSubmit, placeholder = 'Search events, venues or categories', sortBy = 'all', onSortChange }) {
  const isPriceSort = sortBy === 'low_to_high' || sortBy === 'high_to_low'
  const isDateSort = sortBy === 'nearest_furthest' || sortBy === 'furthest_nearest'

  
  return (
    <form
      id="event-search-form"
      className="search-bar"
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.(value)
      }}
    >
      <label htmlFor="event-search" className="visually-hidden">
        Search events
      </label>
      <div className="search-bar__row">
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
      </div>
      
      <div className="price_date_sorting">
        <label htmlFor="price-sort" className="visually-hidden">
          Sort by price
        </label>
        <select
          id="price-sort"
          className="select-chevron"
          value={isPriceSort ? sortBy : 'all'}
          onChange={(e) => onSortChange?.(e.target.value)}
        >
          <option value="all">Sort By Price</option>
          <option value="low_to_high">Lowest to Highest</option>
          <option value="high_to_low">Highest to Lowest</option>
        </select>

        <label htmlFor="date-sort" className="visually-hidden">
          Sort by date
        </label>
        <select
          id="date-sort"
          className="select-chevron"
          value={isDateSort ? sortBy : 'all'}
          onChange={(e) => onSortChange?.(e.target.value)}
        >
          <option value="all">Sort By Date</option>
          <option value="nearest_furthest">Nearest to Furthest</option>
          <option value="furthest_nearest">Furthest to Nearest</option>
        </select>
        </div>
    </form>
  )
}

export default SearchBar
