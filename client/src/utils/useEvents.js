// // src/utils/useEvents.js

// src/utils/useEvents.js
import { useState, useCallback, useRef } from 'react'
import { fetchEvents as fetchEventsApi } from '../services/eventsApi'

export function useEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const latestRequest = useRef(0)

  const fetchEvents = useCallback(async (filters) => {
    const requestId = ++latestRequest.current
    setLoading(true)
    setError(null)
    const { events, error } = await fetchEventsApi(filters)
    if (requestId !== latestRequest.current) return // a newer request replaced this one
    setEvents(events)
    if (error) setError(error)
    setLoading(false)
  }, [])

  return { events, loading, error, fetchEvents }
}
