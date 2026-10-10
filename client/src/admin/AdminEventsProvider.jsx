import { useCallback, useMemo, useRef, useState } from 'react'
import { AdminEventsContext } from './adminEventsContext'
import { formToEvent, loadAdminEvents, newEventId, saveAdminEvents } from './adminEventUtils'
import { mockEvents } from '../data/mockEvents'

// Holds admin-created events and keeps them in localStorage (create, read, update, delete).
function AdminEventsProvider({ children }) {
  // First visit: start with the team's own events from data/mockEvents.js so they're editable here.
  const [events, setEvents] = useState(() => loadAdminEvents(undefined, mockEvents))
  const eventsRef = useRef(events)
  // True when the last save didn't fit in browser storage (usually too many uploaded images).
  const [saveFailed, setSaveFailed] = useState(false)

  const commit = useCallback((update) => {
    const next = update(eventsRef.current)
    eventsRef.current = next
    setEvents(next)
    const saved = saveAdminEvents(next)
    setSaveFailed(!saved)
    return saved
  }, [])

  const addEvent = useCallback(
    (form) => {
      const event = formToEvent(form, newEventId())
      return commit((current) => [event, ...current])
    },
    [commit],
  )

  const updateEvent = useCallback(
    (id, form) => commit((current) => current.map((e) => (e.id === id ? formToEvent(form, id) : e))),
    [commit],
  )

  const deleteEvent = useCallback(
    (id) => commit((current) => current.filter((e) => e.id !== id)),
    [commit],
  )

  const value = useMemo(
    () => ({ events, addEvent, updateEvent, deleteEvent, saveFailed }),
    [events, addEvent, updateEvent, deleteEvent, saveFailed],
  )

  return <AdminEventsContext.Provider value={value}>{children}</AdminEventsContext.Provider>
}

export default AdminEventsProvider
