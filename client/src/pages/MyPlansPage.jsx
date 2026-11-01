import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { useAuth } from '../auth/authContext'
import { createPlan, listAllSavedEvents, listPlans } from '../api/plansApi'
import PlanForm from '../plans/PlanForm'
import PlanSection from '../plans/PlanSection'
import './AuthPage.css'
import './PlansPage.css'

// Attach each saved event (from GET /plans/saved) to its plan, so every plan shows its events.
function withSavedEvents(plans, savedEvents) {
  return plans.map((plan) => ({ ...plan, saved_events: savedEvents.filter((ev) => ev.plan_id === plan.id) }))
}

// "My Plans": every plan the user owns, each shown with its saved events, plus create.
function MyPlansPage() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Fetch plans and saved events on open (and on "Try again"); ignore the result if the page has closed.
  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    Promise.all([listPlans(), listAllSavedEvents()])
      .then(([planList, savedEvents]) => !cancelled && setPlans(withSavedEvents(planList, savedEvents)))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [user, reloadKey])

  const load = () => {
    setLoading(true)
    setError('')
    setReloadKey((k) => k + 1)
  }

  if (!user) return <Navigate to="/login" replace state={{ from: '/plans' }} />

  const handleCreate = async (payload) => {
    const plan = await createPlan(payload)
    setPlans((current) => [{ ...plan, saved_events: [] }, ...current])
    setCreating(false)
    setNotice(`Created "${plan.title}".`)
  }

  const changePlan = (planId, update) => setPlans((current) => current.map((p) => (p.id === planId ? update(p) : p)))

  const removePlan = (plan) => {
    setPlans((current) => current.filter((p) => p.id !== plan.id))
    setNotice(`Deleted "${plan.title}".`)
  }

  return (
    <>
      <NavBar />
      <main className="plans">
        <Link className="plans__back" to="/events">
          ← Back to events
        </Link>
        <header className="plans__header">
          <div>
            <h1 className="plans__title">My Plans</h1>
            <p className="plans__intro">Group the events you want to go to, and track who's going.</p>
          </div>
          {!creating && (
            <button type="button" className="plans__primary" onClick={() => setCreating(true)}>
              + New plan
            </button>
          )}
        </header>

        {notice && (
          <p className="plans__notice" role="status">
            {notice}
          </p>
        )}
        {error && !loading && (
          <div className="plans__alert" role="alert">
            <span>{error}</span>
            <button type="button" className="plans__link-button" onClick={load}>
              Try again
            </button>
          </div>
        )}

        {creating && (
          <section className="plans__panel" aria-labelledby="new-plan-title">
            <h2 id="new-plan-title" className="plans__subtitle">
              New plan
            </h2>
            <PlanForm onSubmit={handleCreate} onCancel={() => setCreating(false)} />
          </section>
        )}

        {loading ? (
          <div aria-busy="true" aria-label="Loading plans">
            <div className="plans__panel plan-card--skeleton plans__skeleton-header" />
            <div className="plan-card plan-card--skeleton plans__skeleton-row" />
            <div className="plan-card plan-card--skeleton plans__skeleton-row" />
          </div>
        ) : plans.length === 0 && !error ? (
          <section className="plans__empty">
            <p className="plans__empty-title">No plans yet</p>
            <p>Tap ♡ on any event to save it to Want to go, or create a plan like "Date night".</p>
            {!creating && (
              <button type="button" className="plans__primary" onClick={() => setCreating(true)}>
                Create your first plan
              </button>
            )}
          </section>
        ) : (
          plans.map((plan) => (
            <PlanSection
              key={plan.id}
              plan={plan}
              onChange={(update) => changePlan(plan.id, update)}
              onDeleted={() => removePlan(plan)}
            />
          ))
        )}
      </main>
    </>
  )
}

export default MyPlansPage
