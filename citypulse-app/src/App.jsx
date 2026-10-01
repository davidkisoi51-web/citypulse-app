import { useEffect, useMemo, useState } from 'react'
import EventGrid from './components/EventGrid'
import FeaturedBanner from './components/FeaturedBanner'
import NavBar from './components/NavBar'
import SearchBar from './components/SearchBar'
import Footer from './components/Footer'
import EventDetailModal from './components/EventDetailModal'
import { getNextEvent } from './utils/nextEvent'
import { useEvents } from './utils/useEvents'
import './App.css'
import DateFilterBar from './components/DateFilterBar'
import { mockEvents } from './data/mockEvents'

function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [user, setUser] = useState(null)
  const [city, setCity] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedEvent, setSelectedEvent] = useState(null)

  const { events, loading, error, fetchEvents } = useEvents()

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents({
        keyword: query,
        category,
        city,
        startDate,
        endDate,
      })
    }, query.trim() ? 350 : 0)

    return () => clearTimeout(timer)
  }, [query, category, city, startDate, endDate, fetchEvents])

  const categories = useMemo(
    () =>
      [...new Set([
        ...mockEvents.map((event) => event.category),
        ...events.map((event) => event.category),
      ].filter(Boolean))].sort(),
    [events],
  )

  const nextEvent = getNextEvent(events)

  const clearFilters = () => {
    setCity('')
    setStartDate('')
    setEndDate('')
    setCategory('all')
    setQuery('')
  }

  const handleOpenModal = (event) => setSelectedEvent(event)
  const handleCloseModal = () => setSelectedEvent(null)

  return (
    <>
      <NavBar
        user={user}
        onLogin={() => setUser({ name: 'Demo User' })}
        onLogout={() => setUser(null)}
        categories={categories}
        category={category}
        onCategoryChange={setCategory}
      />

      <main className="app">
        <h1 className="visually-hidden">CityPulse events</h1>

        <SearchBar value={query} onChange={setQuery} />

        <DateFilterBar
          city={city}
          setCity={setCity}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          filtered={events}
          clearFilters={clearFilters}
        />

        {error && (
          <p className="event-grid__status" role="status">
            {error}
          </p>
        )}

        <FeaturedBanner event={nextEvent} onSelect={handleOpenModal} />

        <EventGrid
          events={events}
          loading={loading}
          onEventClick={handleOpenModal}
        />
      </main>

      <Footer />

      <EventDetailModal
        isOpen={Boolean(selectedEvent)}
        onClose={handleCloseModal}
        event={selectedEvent}
      />
    </>
  )
}

export default App
