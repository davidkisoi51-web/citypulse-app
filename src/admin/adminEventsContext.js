import { createContext, useContext } from 'react'

export const AdminEventsContext = createContext(null)

// { events, addEvent(form), updateEvent(id, form), deleteEvent(id), saveFailed }
// add/update/delete return true if the change was saved to browser storage.
export function useAdminEvents() {
  const value = useContext(AdminEventsContext)
  if (!value) throw new Error('useAdminEvents must be used inside <AdminEventsProvider>')
  return value
}
