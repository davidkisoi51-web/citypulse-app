
import EventGrid from './components/EventGrid'
import FeaturedBanner from './components/FeaturedBanner'
import NavBar from './components/NavBar'
import SearchBar from './components/SearchBar'
import Footer from './components/Footer'
import EventDetailModal from './components/EventDetailModal'
import RecommendedRow from './components/RecommendedRow'
import EventRing from './components/EventRing'
import CategoryChips from './components/CategoryChips'
import CursorGlow from './components/CursorGlow'
import { ConcertBackdrop, Equalizer } from './components/ConcertBackdrop'
import { getNextEvent } from './utils/nextEvent'
import { recommendationReason, recommendEvents } from './utils/recommendations'
import { SORT_OPTIONS, sortEvents } from './utils/sortEvents'
import { useEvents } from './utils/useEvents'
import { useAdminEvents } from './admin/adminEventsContext'
import { useSavedEvents } from './plans/savedEventsContext'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { isPastEvent } from './utils/pastEvent'
import { isRunningInstalled } from './pwa/install'
import GetAppSection from './components/GetAppSection'
import useOnlineStatus from './hooks/useOnlineStatus'
import OfflinePage  from './pages/OfflinePage'
import './App.css'
import DateFilterBar from './components/DateFilterBar'

function todayLocal() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const DEFAULT_CITY = import.meta.env?.VITE_DEFAULT_CITY || 'Nairobi'
// The city dropdown: Nairobi (Kenya), plus South Africa and Nigeria, where the API also searches.
const CITY_OPTIONS = [
  'Nairobi',
  'Johannesburg', 'Cape Town', 'Durban', 'Pretoria',
  'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan',
]

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



// Two views share the same data: 'home' (the landing page: the 3D ring of what's coming up)
// and 'events' (filters, featured banner, recommendations and the full grid).
function App({ view = 'events' }) {
  //call the hook
  const isOnline = useOnlineStatus()

  const [query, setQuery] = useState(() => {
    const search = localStorage.getItem("query");
    //const value = JSON.parse(search);
    return search || "";
  })
  const [category, setCategory] = useState('all')
  // First load: the user's last city, otherwise the default city from .env.
  const [city, setCity] = useState(() => localStorage.getItem('city') ?? DEFAULT_CITY)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  // One sort at a time: 'all' (default order), a price sort, or a date sort.
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.none)

  // Heart buttons: saved state comes from the Plans API ("Want to go" plan by default).
  const { savedIds: savedEventIds, savedEvents, savingIds: savingEventIds, isSaved, isSaving, toggleSave } = useSavedEvents()


  // Role 4: Event Detail Modal state management
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)


  // Load normalized events through the Flask API; the API service exposes
  // an explicit sample-data fallback and error notice if live data is down.
  const { events: apiEvents, loading: apiLoading, error: apiError, fetchEvents } = useEvents()
  // Events added in the admin portal are listed first, ahead of the live/sample events.
  const { events: adminEvents } = useAdminEvents()
  // Skip API/sample events that are already in the admin list (same id), so nothing shows twice.
  const adminIds = new Set(adminEvents.map((e) => e.id))
  const allEvents = [...adminEvents, ...apiEvents.filter((e) => !adminIds.has(e.id))]
  useEffect(() => {
    localStorage.setItem('query', query)
  }, [query])

    useEffect(() => {
    localStorage.setItem('city', city)
  }, [city])

  // Search and filters query the Flask API. Debounce text input to avoid one
  // upstream Ticketmaster request for every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchEvents({
        city,
        category: category === 'all' ? undefined : category,
        startDate,
        endDate,
        keyword: query,
      })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [fetchEvents, city, category, startDate, endDate, query])

  const handleOpenModal = (event) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEvent(null)
  }

  // Toggle the saved state of an event by its ID. If the event is already saved, remove it from the saved list; otherwise, add it to the saved list.


  const categories = uniqueOptions(allEvents, 'category')
  const cities = CITY_OPTIONS
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
    if ((startDate || endDate) && !event.date) return false
    // Hide past events by default; an explicit start date overrides this.
    if (event.date && event.date < (startDate || todayLocal())) return false
    if (endDate && event.date > endDate) return false
    return true
  })
  // Sorting applies to all filtered events; with no sort chosen, admin events stay first.
  const events = sortEvents(filtered, sortBy)

  //when the browser is offline, show the offline page instead of the app
  if (!isOnline) {
    return <OfflinePage />
  }
  // "Recommended for you": based on the categories and cities of saved events. Hidden while
  // searching or filtering, so it doesn't push the results down. The city doesn't count:
  // there's always one (the default city), so it's where you are, not a search.
  const filtering = Boolean(query.trim() || startDate || endDate) || category !== 'all'
  const recommended =
    filtering || apiLoading ? [] : recommendEvents(allEvents, savedEvents, { excludeIds: nextEvent ? [nextEvent.id] : [] })
  // Landing page ring: the next 18 upcoming events in the chosen city, soonest first. It
  // ignores the search and filters, which live on the Events page.
  const ringEvents = sortEvents(
    allEvents.filter((e) => (!city || norm(e.city) === norm(city)) && !isPastEvent(e)),
    SORT_OPTIONS.dateNearest,
  ).slice(0, 18)

  if (view === 'home') {
    return (
      <>
        <NavBar />
        <ConcertBackdrop />
        <CursorGlow />
        <main className="app app--home">
          <section className="home-hero" aria-labelledby="home-title">
            <h1 id="home-title" className="home-hero__title">
              CityPulse
            </h1>
            <p className="home-hero__text">
              Concerts, sport, comedy and more{city ? ` in ${city}` : ''}. Tap a poster to see the details.
            </p>
            <Equalizer />
          </section>
          {apiLoading && !ringEvents.length ? (
            <p className="home-hero__status" role="status">Loading events…</p>
          ) : (
            <EventRing events={ringEvents} onSelect={handleOpenModal} />
          )}
          <div className="home-hero__actions">
            <Link className="home-hero__cta" to="/events">
              Browse all events →
            </Link>
          </div>
        </main>
        {!isRunningInstalled() && (
          <div className="download download--band">
            <GetAppSection id="get-app" />
          </div>
        )}
        <Footer />
        <EventDetailModal isOpen={isModalOpen} onClose={handleCloseModal} event={selectedEvent} />
      </>
    )
  }


  return (
    <>
      <NavBar />
      <main className="app">
        <h1 className="visually-hidden">CityPulse events</h1>
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
        {apiError && (
          <p className="events-fallback-notice" role="status">
            {apiError}
          </p>
        )}
        <FeaturedBanner
          event={nextEvent}
          onSelect={handleOpenModal}
          saved={nextEvent ? isSaved(nextEvent.id) : false}
          saving={nextEvent ? isSaving(nextEvent.id) : false}
          onToggleSave={toggleSave}
        />
        <RecommendedRow
          events={recommended}
          reason={recommendationReason(savedEvents)}
          onEventClick={handleOpenModal}
          savedEventIds={savedEventIds}
          savingEventIds={savingEventIds}
          onToggleSave={toggleSave}
        />
        <h2 className="app__section-title" ref={resultsRef}>Upcoming events</h2>
        <CategoryChips categories={categories} value={category} onChange={setCategory} />
        <EventGrid events={events} loading={apiLoading} onEventClick={handleOpenModal} savedEventIds={savedEventIds} savingEventIds={savingEventIds} onToggleSave={toggleSave}/>

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
