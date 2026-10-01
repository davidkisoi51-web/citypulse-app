import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchEvents as fetchEventsApi } from '../services/eventsApi'

export function useEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const controllerRef = useRef(null)

  const fetchEvents = useCallback(async (filters = {}) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const result = await fetchEventsApi(filters, { signal: controller.signal })
      if (controller.signal.aborted) return

      setEvents(result.events)
      setError(result.error)
    } catch (error) {
      if (error?.name !== 'AbortError' && !controller.signal.aborted) {
        setEvents([])
        setError('Unable to load events. Please try again.')
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => () => controllerRef.current?.abort(), [])

  return { events, loading, error, fetchEvents }
}
