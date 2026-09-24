import { useState } from 'react'
import EventGrid from './components/EventGrid'
import FeaturedBanner from './components/FeaturedBanner'
import NavBar from './components/NavBar'
import SearchBar from './components/SearchBar'
import { mockEvents } from './data/mockEvents'
import { getNextEvent } from './utils/nextEvent'
import './App.css'

function matchesQuery(event, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [event.name, event.venue, event.city, event.category]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(q))
}

function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  // TODO: replace with real authentication once the auth flow exists.
  const [user, setUser] = useState(null)

  // TODO: replace mockEvents with Ticketmaster results (map through normalizeEvent),
  // passing `query` as the API keyword instead of filtering locally.
  const categories = [...new Set(mockEvents.map((e) => e.category).filter(Boolean))].sort()
  const nextEvent = getNextEvent(mockEvents)
  const events = mockEvents.filter(
    (event) =>
      matchesQuery(event, query) && (category === 'all' || event.category === category),
  )

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
        <h1 className="visually-hidden">Group2 events</h1>
        <SearchBar value={query} onChange={setQuery} />
        <FeaturedBanner event={nextEvent} />
        <EventGrid events={events} />
      </main>
    </>
  )
}

export default App
