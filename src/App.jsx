import { useEffect, useState } from 'react'

import EventGrid from './components/EventGrid'
import FeaturedBanner from './components/FeaturedBanner'
import NavBar from './components/NavBar'
import SearchBar from './components/SearchBar'
import { mockEvents } from './data/mockEvents.js'
import { getNextEvent } from './utils/nextEvent'
//import { morning_events, afternoon_events, evening_events } from './utils/eventTiming.js'
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
  //local storage
  const [query, setQuery] = useState(()=>{
    const search_query = localStorage.getItem('query');
    return search_query ? search_query : '';
  })
  const [category, setCategory] = useState('all')
  // TODO: replace with real authentication once the auth flow exists.
  const [user, setUser] = useState(null)
  const [city, setCity] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')


  const [date, setDate] = useState(false)
  const [time, setTime] = useState(0)
  const [price, setPrice] = useState(false)
  
  useEffect(() => {
    localStorage.setItem('query', query)
  }, [query])
  


  //will complete
    function mornings(){
      
    }
    function afternoons(){}
    function evenings(){}


    
const toggle_nearest_furthest = () => {setDate(!date) ;if (!date) 
  { mockEvents.sort((a,b) => {
    return new Date(a.date) -
        new Date(b.date)
      })}
    
    else { mockEvents.sort((a,b) => {
    return new Date(b.date) -
        new Date(a.date)
      })}
}

const price_changes = () => {setPrice(!price); if (!price){
  //const low_price = mockEvents.filter((e) => e.priceMax)
  mockEvents.sort((a,b) => {
    return new Map(a.priceMax) - 
    new Map(b.priceMin)})
}
  else {
    mockEvents.sort((a,b) => {
      return new Map(b.priceMax) - 
      new Map(a.priceMin)})
  }}

  //nearest date has to be selected first for furthest date to show from the furthest instead of nearest.
  

  // NEW CHANGE: Replaced mockEvents with apiEvents to get the data from API
  // TODO: replace mockEvents with Ticketmaster results (map through normalizeEvent),
  // passing `query` as the API keyword instead of filtering locally.

  const categories = [...new Set(apiEvents.map((e) => e.category).filter(Boolean))].sort()
  const nextEvent = getNextEvent(apiEvents)
  //const events = apiEvents.filter(
    //(event) =>
      //matchesQuery(event, query) && (category === 'all' || event.category === category),
  //)
  const clearFilters = () => {
    setCity('')
    setStartDate('')
    setEndDate('')
    setCategory('')
    setQuery('')
  }

  const events = mockEvents.filter(
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
      <NavBar
        user={user}
        onLogin={() => setUser({ name: 'Demo User' })}
        onLogout={() => setUser(null)}
        categories={categories}
        category={category}
        onCategoryChange={setCategory}
        nearest_furthest_date = {toggle_nearest_furthest}
        onPriceChanges={price_changes}
        morning={mornings}
        afternoon = {afternoons}
        evening = {evenings}

      />
      <main className="app">
        <h1 className="visually-hidden">Group2 events</h1>
        <SearchBar value={query} onChange={setQuery} />
        <DateFilterBar 
          city={city} setCity={setCity} 
          startDate={startDate} setStartDate={setStartDate} 
          endDate={endDate} setEndDate={setEndDate} filtered={events} clearFilters={clearFilters} />
        <FeaturedBanner event={nextEvent} onSelect={handleOpenModal}/>
        <EventGrid events={events} onEventClick={handleOpenModal}/>
        
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
