import './NavBar.css'
//nav_sorting added for sorting by date, time and price
// date, recent to furthest,  time, time ranges, price, price ranges.
// d_p_t is date, price and time\
import { dates_data, nearest_date } from '../utils/nearestDate.js'
import EventCard from './EventCard.jsx'

function NavBar({ user, onLogin, onLogout, categories, category, onCategoryChange, onDatesChanges, onTimeChanges, onPriceChanges, prices, timing  }) {
  
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

      
      <div className="nav_sorting">
        <label htmlFor="category-filter" className="visually-hidden">
          Filter by d_p_t
        </label>
        <select
          id="sorting_d_p_t"
        >
          <option value="selector">Filter By</option>
          <option value = "nearest_date" onChange={(e) => onDatesChanges(e === true)}>Date: Nearest to Furthest</option>
          <option value = "furthest_date">Date: Furthest to Nearest</option>
        </select>

      </div>

       <a href='' value = "morning_events" className='morning_href'>Morning Events</a>
        <a href='' value = "afternoon_events" className='afternoon_href'>Afternoon Events</a>
        <a href='' value = "evening_events"className='evening_href'>Evening Event</a>
        //events need to be formatted

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
