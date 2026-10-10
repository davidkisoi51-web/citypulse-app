// src/utils/useEvents.js
import { useState, useCallback } from 'react'
import { fetchEvents as fetchEventsApi } from '../services/eventsApi'

export function useEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchEvents = useCallback(async (filters) => {
    setLoading(true)
    setError(null)
    const { events, error } = await fetchEventsApi(filters)
    setEvents(events)
    if (error) setError(error)
    setLoading(false)
  }, [])

  return { events, loading, error, fetchEvents }
}