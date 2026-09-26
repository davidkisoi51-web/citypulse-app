import { useState } from 'react'
import EventGrid from './components/EventGrid'
import FeaturedBanner from './components/FeaturedBanner'
import NavBar from './components/NavBar'
import SearchBar from './components/SearchBar'
import { mockEvents } from './data/mockEvents.js'
import { getNextEvent } from './utils/nextEvent'

import { nearest_date } from './utils/nearestDate'
import './App.css'
const test = [{id:"1"}, {name: "2"}, {flop: "3"}]
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

  const [date, setDate] = useState(null)
  const [time, setTime] = useState(0)
  const [price, setPrice] = useState(0)

  // TODO: replace mockEvents with Ticketmaster results (map through normalizeEvent),
  // passing `query` as the API keyword instead of filtering locally.
  const categories = [...new Set(mockEvents.map((e) => e.category).filter(Boolean))].sort()


  function onDateChanges(){
    let test_array = Array.from(mockEvents)
      test_array.map((date_m)  => {
        return <li key={date_m.date} value={date_m.name}>
                <EventGrid events={nearest_date} onDatesChange= {true}></EventGrid>
                </li>
      } ,(console.log("working")))
        console.log(nearest_date)
      }

  const times = []
  const prices = []

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
        onDatesChanges={onDateChanges}

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
