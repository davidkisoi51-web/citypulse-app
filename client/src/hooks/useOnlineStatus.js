import { useState, useEffect } from 'react'

/**
 * This hook detects when the browser goes offline or online and returns a boolean value indicating the current online status. It uses the navigator.onLine property to determine the initial status and sets up event listeners for the 'online' and 'offline' events to update the status accordingly. The hook cleans up the event listeners when the component using it unmounts.
 */
export default function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState( () => navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}