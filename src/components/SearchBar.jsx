import './SearchBar.css'

function SearchBar({ value, onChange, placeholder = 'Search events, venues or categories', onPriceChange, onDateChange }) {
  
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
      
      <div className="price_date_sorting">
        <label htmlFor="price-filter" className="visually-hidden">
          Prices_Sorting
        </label>
        
        <select
          id="price-sort"
          onChange={onPriceChange}
        >
          <option value="all">Sort By Price</option>
          <option value="low_to_high">Lowest to Highest</option>
          <option value="high_to_low">Highest to Lowest</option>
        </select>

        <select
          id="date-sort"
          onChange={onDateChange}
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
