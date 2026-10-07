
import EventGrid from './components/EventGrid'
import FeaturedBanner from './components/FeaturedBanner'
import NavBar from './components/NavBar'
import SearchBar from './components/SearchBar'
import Footer from './components/Footer'
import EventDetailModal from './components/EventDetailModal'
import { getNextEvent } from './utils/nextEvent'
import { SORT_OPTIONS, sortEvents } from './utils/sortEvents'
import { useEvents } from './utils/useEvents'
import { useAdminEvents } from './admin/adminEventsContext'
import { useState, useEffect, useRef } from 'react'
import './App.css'
import DateFilterBar from './components/DateFilterBar'

// Case- and space-insensitive text, so "Music", "music " and "MUSIC" match each other.
const norm = (value) => (value || '').trim().toLowerCase()

// Unique values for a dropdown, merging ones that differ only in case/spacing.
// Prefers a capitalised spelling ("Nairobi" over "nairobi") for display.
function uniqueOptions(events, field) {
  const byKey = new Map()
  const isCapitalised = (v) => v[0] === v[0].toUpperCase()
  for (const e of events) {
    const value = e[field]?.trim()
    if (!value) continue
    const current = byKey.get(norm(value))
    if (!current || (!isCapitalised(current) && isCapitalised(value))) byKey.set(norm(value), value)
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b))
}

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
  // One sort at a time: 'all' (default order), a price sort, or a date sort.
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.none)


  // Role 4: Event Detail Modal state management
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)


  // === ROLE 1: fetch live events on load, with automatic mock fallback ===
  // See src/services/eventsApi.js — tries Ticketmaster first, falls back
  // to mockEvents internally if the live call fails. App.jsx just renders
  // whatever comes back, without needing to know which source it was.
const { events: apiEvents, loading: apiLoading, fetchEvents } = useEvents()
  // Events added in the admin portal are listed first, ahead of the live/sample events.
  const { events: adminEvents } = useAdminEvents()
  // Skip API/sample events that are already in the admin list (same id), so nothing shows twice.
  const adminIds = new Set(adminEvents.map((e) => e.id))
  const allEvents = [...adminEvents, ...apiEvents.filter((e) => !adminIds.has(e.id))]
  useEffect(() => {
    localStorage.setItem(query, query)
  }, [query])
  
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

  const categories = uniqueOptions(allEvents, 'category')
  const cities = uniqueOptions(allEvents, 'city')
  const resultsRef = useRef(null)
  // Banner: the team's own next upcoming event first; live events only if none of ours are upcoming.
  const nextEvent = getNextEvent(adminEvents) ?? getNextEvent(allEvents)
  const clearFilters = () => {
    setCity('')
    setStartDate('')
    setEndDate('')
    setCategory('all')
    setQuery('')
    setSortBy(SORT_OPTIONS.none)
  }

  // Same filters for every event: admin-added, sample and live Ticketmaster ones.
  const filtered = allEvents.filter((event) => {
    if (!matchesQuery(event, query)) return false
    if (category !== 'all' && norm(event.category) !== norm(category)) return false
    if (city && norm(event.city) !== norm(city)) return false
    // Dates are YYYY-MM-DD strings, so they compare correctly as text (no time-zone shifts).
    if (startDate || endDate) {
      if (!event.date) return false
      if (startDate && event.date < startDate) return false
      if (endDate && event.date > endDate) return false
    }
    return true
  })
  // Sorting applies to all filtered events; with no sort chosen, admin events stay first.
  const events = sortEvents(filtered, sortBy)


  return (
    <>
      <NavBar />
      <main className="app">
        <h1 className="visually-hidden">Group2 events</h1>
        <section className="filters" aria-label="Filter events">
          <div className="filters__row">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
            <label htmlFor="category-filter" className="visually-hidden">
              Filter by category
            </label>
            <select
              id="category-filter"
              className="filters__select select-chevron"
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
            {/* Lives under the category dropdown but submits the search form (Enter works too). */}
            <button type="submit" form="event-search-form" className="search-bar__submit filters__submit">
              Search
            </button>
          </div>
          <DateFilterBar
            city={city} setCity={setCity} cities={cities}
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate} filtered={events} clearFilters={clearFilters} />
        </section>
        <FeaturedBanner event={nextEvent} onSelect={handleOpenModal}/>
        <h2 className="app__section-title" ref={resultsRef}>Upcoming events</h2>
        <EventGrid events={events} loading={apiLoading} onEventClick={handleOpenModal}/>

        {/* Pass onEventClick handler so Role 3 (EventGrid/Cards) can trigger your modal */}
      </main>

      {/* Outside <main> so the footer spans the full page width. */}
      <Footer />

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