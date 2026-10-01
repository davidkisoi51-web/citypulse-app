import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchEvents as fetchEventsApi } from '../services/eventsApi'

export function useEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [usedFallback, setUsedFallback] = useState(false)
  const requestIdRef = useRef(0)
  const activeControllerRef = useRef(null)

  const fetchEvents = useCallback(async (filters = {}, signal) => {
    const requestId = ++requestIdRef.current
    activeControllerRef.current?.abort()
    const controller = new AbortController()
    activeControllerRef.current = controller

    const forwardAbort = () => controller.abort(signal?.reason)
    if (signal) {
      if (signal.aborted) controller.abort(signal.reason)
      else signal.addEventListener('abort', forwardAbort, { once: true })
    }

    setLoading(true)
    setError(null)
    setUsedFallback(false)

    try {
      const result = await fetchEventsApi(filters, { signal: controller.signal })
      if (requestId !== requestIdRef.current || controller.signal.aborted) return result

      setEvents(result.events)
      setError(result.error)
      setUsedFallback(result.usedFallback)
      return result
    } catch (err) {
      if (controller.signal.aborted) return null
      if (requestId !== requestIdRef.current) return null
      const message = err instanceof Error ? err.message : 'Unable to load events.'
      setError(message)
      setUsedFallback(false)
      return { events: [], error: message, usedFallback: false }
    } finally {
      signal?.removeEventListener('abort', forwardAbort)
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => () => activeControllerRef.current?.abort(), [])

  return { events, loading, error, usedFallback, fetchEvents }
}
