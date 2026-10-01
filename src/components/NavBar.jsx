import { Link } from 'react-router-dom'
import './NavBar.css'
//nav_sorting added for sorting by date, time and price
// date, recent to furthest,  time, time ranges, price, price ranges.
// d_p_t is date, price and time\
//import { morning_events, afternoon_events, evening_events } from '../utils/eventTiming'


function NavBar({ user, onLogin, onLogout, categories, category, onCategoryChange, nearest_furthest_date, onPriceChanges, morning, afternoon, evening }) {
  
  return (
    <header className="nav">

      <Link className="nav__brand" to="/">
        <span className="nav__logo" aria-hidden="true">●</span>
        Group2
      </Link>

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
          id="sorting_date"
          onChange={nearest_furthest_date}
        >
          <option value="selector" >Filter By Date</option> 
          <option value = "nearest_date">Date: Nearest to Furthest</option>
          <option value = "furthest_date" >Date: Furthest to Nearest</option>
        </select>
        
        <select
          id="sorting_price"
          onChange={onPriceChanges}
          >
            <option>Filter By Price</option>
            <option value="low_to_high">Lowest to Highest</option>
            <option value = "high_to_low">Highest to Lowest</option>
            
        </select>


      </div>
      
       <button value = "morning_events" onClick={morning} className='morning_btn'>Morning Events</button>
        <button value = "afternoon_events" onClick={afternoon}className='afternoon_href'>Afternoon Events</button>
        <button value = "evening_events"onClick={evening}className='evening_href'>Evening Event</button>
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
