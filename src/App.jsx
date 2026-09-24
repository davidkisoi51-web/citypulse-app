import EventGrid from './components/EventGrid'
import { mockEvents } from './data/mockEvents'
import './App.css'

function App() {
  // TODO: replace mockEvents with Ticketmaster results (map through normalizeEvent).
  return (
    <main className="app">
      <header className="app__header">
        <h1>CityPulse</h1>
        <p>Discover what's happening in your city.</p>
      </header>
      <EventGrid events={mockEvents} />
    </main>
  )
}

export default App
