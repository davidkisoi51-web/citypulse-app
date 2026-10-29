import { createContext, useContext } from 'react'

export const SavedEventsContext = createContext(null)

// { isSaved(eventId), isSaving(eventId), toggleSave(event), saveToPlan(event, plan), savedIds, savedEvents, savingIds }
export function useSavedEvents() {
  const value = useContext(SavedEventsContext)
  if (!value) throw new Error('useSavedEvents must be used inside <SavedEventsProvider>')
  return value
}
