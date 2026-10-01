
import EventGrid from './components/EventGrid'
import FeaturedBanner from './components/FeaturedBanner'
import NavBar from './components/NavBar'
import SearchBar from './components/SearchBar'
import EventDetailModal from './components/EventDetailModal'
import { mockEvents } from './data/mockEvents'
import { getNextEvent } from './utils/nextEvent'
import { useEvents } from './utils/useEvents'
import { useState, useEffect } from 'react'
import './App.css'
import DateFilterBar from './components/DateFilterBar'

function matchesQuery(event, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [event.name, event.venue, event.city, event.category]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(q))
}

function App() {
  const [query, setQuery] = useState(() => {
    const search = localStorage.getItem("query");
    //const value = JSON.parse(search);
    return search || "";
  })
  const [category, setCategory] = useState('all')
  const [city, setCity] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [price, setPrice] = useState(false)
  const [date, setDate] = useState(false)


  // Role 4: Event Detail Modal state management
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)


  // === ROLE 1: fetch live events on load, with automatic mock fallback ===
  // See src/services/eventsApi.js — tries Ticketmaster first, falls back
  // to mockEvents internally if the live call fails. App.jsx just renders
  // whatever comes back, without needing to know which source it was.
const { events: apiEvents, loading: apiLoading, fetchEvents } = useEvents()
  useEffect(() => {
    localStorage.setItem(query, query)
  }, [query])

    //highest price based on the priceMax values and lowest price based on the priceMin values
  const onPriceChanges = () => {
    setPrice(!price); if(!price){
      apiEvents.sort((a,b) => {
      return new Number(a.priceMin) - new Number(b.priceMin)
    })}
    else {
      apiEvents.sort((a,b) => {
        return new Number(b.priceMax) - new Number(a.priceMax)
      })
    }
  }

  const onDateChanges = () => {
    setDate(!date); if (!date) {
      apiEvents.sort((a,b) => {
        return new Date(a.date) - 
        new Date(b.date)
      })}
      else {
        apiEvents.sort((a,b) => {
        return new Date(b.date) - 
        new Date(a.date)
      })
    }
  }


  useEffect(() => {
    fetchEvents({})
  }, [fetchEvents])

  const handleOpenModal = (event) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEvent(null)
  }

  // NEW CHANGE: Replaced mockEvents with apiEvents to get the data from API
  // TODO: replace mockEvents with Ticketmaster results (map through normalizeEvent),
  // passing `query` as the API keyword instead of filtering locally.

  const categories = [...new Set(apiEvents.map((e) => e.category).filter(Boolean))].sort()
  const nextEvent = getNextEvent(apiEvents)
  const clearFilters = () => {
    setCity('')
    setStartDate('')
    setEndDate('')
    setCategory('all')
    setQuery('')
  }

  //EDIT: Changed from mockEvents to apiEvents to filter both sets of data
  const events = apiEvents.filter(
    (event) => {
      const okq = matchesQuery(event, query)
      const okc = category === 'all' || event.category === category
      const q = city.trim().toLowerCase()
      const okCity = !q || (event.city || '').toLowerCase().includes(q)
      let okd = true
      try {
        if (event.date && (startDate || endDate)) {
          const d = new Date(event.date)
          if (startDate) {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            if (d < start) okd = false;
          }
          if (endDate) {
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            if (d > end) okd = false;
          }
        }
      } catch { okd = true }
      return okq && okc && okCity&& okd
})


  return (
    <>
      <NavBar />
      <main className="app">
        <h1 className="visually-hidden">Group2 events</h1>
        <section className="filters" aria-label="Filter events">
          <div className="filters__row">
            <SearchBar value={query} onChange={setQuery} onPriceChange={onPriceChanges} onDateChange={onDateChanges}/>
            <label htmlFor="category-filter" className="visually-hidden">
              Filter by category
            </label>
            <select
              id="category-filter"
              className="filters__select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <DateFilterBar
            city={city} setCity={setCity}
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate} filtered={events} clearFilters={clearFilters} />
        </section>
        <FeaturedBanner event={nextEvent} onSelect={handleOpenModal}/>
        <h2 className="app__section-title">Upcoming events</h2>
        <EventGrid events={events} loading={apiLoading} onEventClick={handleOpenModal}/>
        
        {/* Pass onEventClick handler so Role 3 (EventGrid/Cards) can trigger your modal */}
      </main>

      {/* Role 4 Drawer Component */}

      <EventDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
      />
    </>
  )
}

export default App