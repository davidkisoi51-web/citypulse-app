import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { addSavedEvent, createPlan, listAllSavedEvents, listPlans, removeSavedEvent } from '../api/plansApi'
import { SavedEventsContext } from './savedEventsContext'
import { DEFAULT_PLAN_TITLE, eventToSnapshot, findDefaultPlan } from './planUtils'
import './SavedToast.css'

const EMPTY = new Map()

// "Save for later": which events the user has saved (from GET /api/plans/saved), and the
// heart-button toggle that saves into the default "Want to go" plan or removes the event.
function SavedEventsProvider({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Keyed by the user's email so a different (or no) user never sees someone else's hearts.
  const [store, setStore] = useState({ email: null, saved: EMPTY })
  const [savingIds, setSavingIds] = useState([])
  const [toast, setToast] = useState(null)
  const defaultPlanRef = useRef({ email: null, plan: null })

  const email = user?.email ?? null
  const saved = store.email === email ? store.saved : EMPTY

  // Load saved events on login and after every page change (plans may have changed elsewhere).
  useEffect(() => {
    if (!email) return undefined
    let cancelled = false
    listAllSavedEvents()
      .then((list) => {
        if (cancelled) return
        const map = new Map(
          list.map((ev) => [ev.ticketmaster_id, { id: ev.id, planId: ev.plan_id, category: ev.category, city: ev.city }]),
        )
        setStore({ email, saved: map })
      })
      .catch(() => {}) // hearts just show as unsaved if the API is down
    return () => {
      cancelled = true
    }
  }, [email, pathname])

  // Auto-hide the confirmation message.
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const ensureDefaultPlan = useCallback(async () => {
    if (defaultPlanRef.current.email === email && defaultPlanRef.current.plan) return defaultPlanRef.current.plan
    const plan =
      findDefaultPlan(await listPlans()) ??
      (await createPlan({ title: DEFAULT_PLAN_TITLE, description: 'Events saved for later', event_date: null, city: null }))
    defaultPlanRef.current = { email, plan }
    return plan
  }, [email])

  const updateSaved = useCallback(
    (update) =>
      setStore((s) => {
        const next = new Map(s.email === email ? s.saved : EMPTY)
        update(next)
        return { email, saved: next }
      }),
    [email],
  )

  // Saves `event` into `plan` ({ id, title }). Shows a message and returns true/false.
  // The heart and the "Save to plan" picker both use this, so hearts stay in sync.
  const saveToPlan = useCallback(
    async (event, plan) => {
      if (!user) {
        navigate('/login', { state: { from: pathname } })
        return false
      }
      const key = String(event.id)
      if (savingIds.includes(key)) return false
      setSavingIds((ids) => [...ids, key])
      try {
        const created = await addSavedEvent(plan.id, eventToSnapshot(event))
        updateSaved((m) => m.set(key, { id: created.id, planId: plan.id, category: event.category, city: event.city }))
        setToast({ text: `Saved "${event.name}" to ${plan.title}.`, link: `/plans/${plan.id}` })
        return true
      } catch (err) {
        if (err.status === 409) {
          setToast({ text: `"${event.name}" is already in ${plan.title}.`, link: `/plans/${plan.id}` })
          return true
        }
        setToast({ text: `Couldn't save "${event.name}": ${err.message}`, error: true })
        return false
      } finally {
        setSavingIds((ids) => ids.filter((id) => id !== key))
      }
    },
    [user, savingIds, pathname, navigate, updateSaved],
  )

  // Heart: save to the default "Want to go" plan, or remove if already saved.
  const toggleSave = useCallback(
    async (event) => {
      if (!user) {
        navigate('/login', { state: { from: pathname } })
        return
      }
      const key = String(event.id)
      if (savingIds.includes(key)) return
      const existing = saved.get(key)
      if (!existing) {
        try {
          await saveToPlan(event, await ensureDefaultPlan())
        } catch (err) {
          setToast({ text: `Couldn't save "${event.name}": ${err.message}`, error: true })
        }
        return
      }
      setSavingIds((ids) => [...ids, key])
      try {
        await removeSavedEvent(existing.id)
        updateSaved((m) => m.delete(key))
        setToast({ text: `Removed "${event.name}" from your plans.` })
      } catch (err) {
        setToast({ text: `Couldn't remove "${event.name}": ${err.message}`, error: true })
      } finally {
        setSavingIds((ids) => ids.filter((id) => id !== key))
      }
    },
    [user, saved, savingIds, pathname, navigate, ensureDefaultPlan, updateSaved, saveToPlan],
  )

  const value = useMemo(
    () => ({
      savedIds: [...saved.keys()],
      // { id, category, city } per saved event, for "Recommended for you".
      savedEvents: [...saved].map(([id, { category, city }]) => ({ id, category, city })),
      savingIds,
      isSaved: (id) => saved.has(String(id)),
      isSaving: (id) => savingIds.includes(String(id)),
      toggleSave,
      saveToPlan,
    }),
    [saved, savingIds, toggleSave, saveToPlan],
  )

  return (
    <SavedEventsContext.Provider value={value}>
      {children}
      {toast && (
        <div className={`saved-toast${toast.error ? ' saved-toast--error' : ''}`} role={toast.error ? 'alert' : 'status'}>
          <span>{toast.text}</span>
          {toast.link && (
            <Link to={toast.link} onClick={() => setToast(null)}>
              View
            </Link>
          )}
          <button type="button" aria-label="Dismiss" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}
    </SavedEventsContext.Provider>
  )
}

export default SavedEventsProvider
