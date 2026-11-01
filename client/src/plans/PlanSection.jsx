import { useState } from 'react'
import { Link } from 'react-router-dom'
import EventCard from '../components/EventCard'
import { deletePlan, removeSavedEvent, updatePlan, updateSavedEvent } from '../api/plansApi'
import PlanForm from './PlanForm'
import { STATUSES, countByStatus, eventCountLabel, filterByStatus, formatPlanDate, planToForm, savedEventToEvent } from './planUtils'

// One plan's info (editable) and its saved events (shown with the shared EventCard), each with
// Interested/Going status, a personal note and remove. Used by My Plans and Plan Details.
// Changes are shown only after the server confirms them, so a failed request never looks saved.
// `onChange(updater)` updates the parent's copy of the plan; `onDeleted()` runs after a delete.
function PlanSection({ plan, onChange, onDeleted, titleAs: Title = 'h2' }) {
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [filter, setFilter] = useState('all')
  const [busyIds, setBusyIds] = useState([]) // saved events with a request in flight
  const [deletingPlan, setDeletingPlan] = useState(false)

  const savedEvents = plan.saved_events ?? []
  const counts = countByStatus(savedEvents)
  const shown = filterByStatus(savedEvents, filter)
  const titleId = `plan-${plan.id}-title`

  const setBusy = (id, busy) => setBusyIds((ids) => (busy ? [...ids, id] : ids.filter((x) => x !== id)))
  const startRequest = (id) => {
    if (busyIds.includes(id)) return false // ignore repeated clicks while a request is running
    setBusy(id, true)
    setError('')
    setNotice('')
    return true
  }

  // Status / note: send the change, then show what the server saved.
  const changeEvent = async (ev, changes, successMessage) => {
    if (!startRequest(ev.id)) return false
    try {
      const saved = await updateSavedEvent(ev.id, changes)
      onChange((p) => ({
        ...p,
        saved_events: p.saved_events.map((e) => (e.id === ev.id ? { ...e, ...(saved || changes) } : e)),
      }))
      if (successMessage) setNotice(successMessage)
      return true
    } catch (err) {
      setError(`Couldn't update "${ev.name}": ${err.message}`)
      return false
    } finally {
      setBusy(ev.id, false)
    }
  }

  const handleRemove = async (ev) => {
    if (!window.confirm(`Remove "${ev.name}" from this plan?`)) return
    if (!startRequest(ev.id)) return
    try {
      await removeSavedEvent(ev.id)
      onChange((p) => ({
        ...p,
        saved_events: p.saved_events.filter((e) => e.id !== ev.id),
        event_count: Math.max(0, (p.event_count ?? p.saved_events.length) - 1),
      }))
      setNotice(`Removed "${ev.name}".`)
    } catch (err) {
      setError(`Couldn't remove "${ev.name}": ${err.message}`)
    } finally {
      setBusy(ev.id, false)
    }
  }

  const handleUpdatePlan = async (payload) => {
    const updated = await updatePlan(plan.id, payload)
    // Keep our saved events: the PATCH response may not include them.
    onChange((p) => ({ ...p, ...updated, saved_events: p.saved_events }))
    setEditing(false)
    setNotice('Plan saved.')
  }

  const handleDeletePlan = async () => {
    const events = savedEvents.length ? ` and its ${eventCountLabel(savedEvents.length)}` : ''
    if (!window.confirm(`Delete "${plan.title}"${events}? This can't be undone.`)) return
    setDeletingPlan(true)
    setError('')
    try {
      await deletePlan(plan.id)
      onDeleted()
    } catch (err) {
      setError(`Couldn't delete the plan: ${err.message}`)
      setDeletingPlan(false)
    }
  }

  return (
    <section className="plan-section" aria-labelledby={titleId}>
      {editing ? (
        <div className="plans__panel">
          <Title id={titleId} className="plans__subtitle">
            Edit plan
          </Title>
          <PlanForm
            initialValues={planToForm(plan)}
            submitLabel="Save changes"
            onSubmit={handleUpdatePlan}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <header className="plan-hero">
          <div>
            <Title id={titleId} className="plans__title">
              {plan.title}
            </Title>
            <p className="plan-card__meta">
              {[formatPlanDate(plan.event_date), plan.city, eventCountLabel(savedEvents.length)].filter(Boolean).join(' · ')}
            </p>
            {plan.description && <p className="plan-hero__desc">{plan.description}</p>}
          </div>
          <div className="plan-card__actions">
            <button type="button" className="plans__secondary" onClick={() => setEditing(true)} disabled={deletingPlan}>
              Edit plan
            </button>
            <button type="button" className="plans__danger" onClick={handleDeletePlan} disabled={deletingPlan}>
              {deletingPlan ? 'Deleting…' : 'Delete plan'}
            </button>
          </div>
        </header>
      )}

      {notice && (
        <p className="plans__notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="plans__alert" role="alert">
          {error}
        </p>
      )}

      {savedEvents.length === 0 ? (
        <div className="plans__empty">
          <p className="plans__empty-title">No events in this plan yet</p>
          <p>Browse events, open one and use "Save to plan", or tap ♡ to save it to Want to go.</p>
          <Link className="plans__primary" to="/events">
            Browse events
          </Link>
        </div>
      ) : (
        <>
          <div className="plans__tabs" role="tablist" aria-label={`Filter ${plan.title} events by status`}>
            {[['all', 'All'], ...STATUSES.map((s) => [s.value, s.label])].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                className={filter === value ? 'is-active' : undefined}
                onClick={() => setFilter(value)}
              >
                {label} <span className="plans__tab-count">{counts[value]}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="plans__empty-inline">No events marked "{STATUSES.find((s) => s.value === filter)?.label}" yet.</p>
          ) : (
            <ul className="saved-grid">
              {shown.map((ev) => (
                <SavedEventItem
                  key={ev.id}
                  event={ev}
                  busy={busyIds.includes(ev.id)}
                  onStatus={(status) => changeEvent(ev, { status }, `Marked "${ev.name}" as ${STATUSES.find((s) => s.value === status).label}.`)}
                  onNote={(note) => changeEvent(ev, { note }, note ? 'Note saved.' : 'Note removed.')}
                  onRemove={() => handleRemove(ev)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

// One saved event: the shared EventCard (its heart removes it from this plan), then the
// plan-specific controls: Interested/Going and a personal note.
function SavedEventItem({ event: ev, busy, onStatus, onNote, onRemove }) {
  const [editingNote, setEditingNote] = useState(false)
  const [draft, setDraft] = useState(ev.note ?? '')
  const status = ev.status || 'interested'
  const noteId = `note-${ev.id}`

  const saveNote = async (e) => {
    e.preventDefault()
    const ok = await onNote(draft.trim() || null)
    if (ok) setEditingNote(false)
  }

  return (
    <li className="saved-item" aria-busy={busy || undefined}>
      <EventCard event={savedEventToEvent(ev)} saved saving={busy} onToggleSave={onRemove} />

      <div className="saved-item__controls">
        <div className="plans__toggle" role="radiogroup" aria-label={`Status for ${ev.name}`}>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={status === s.value}
              className={status === s.value ? 'is-active' : undefined}
              disabled={busy}
              onClick={() => status !== s.value && onStatus(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {busy && (
          <span className="saved-item__saving" role="status">
            Saving…
          </span>
        )}
        <button type="button" className="plans__link-button plans__link-button--danger" onClick={onRemove} disabled={busy}>
          Remove<span className="visually-hidden"> {ev.name}</span>
        </button>
      </div>

      {editingNote ? (
        <form className="saved-item__note-form" onSubmit={saveNote}>
          <label htmlFor={noteId} className="visually-hidden">
            Note for {ev.name}
          </label>
          <textarea
            id={noteId}
            className="plan-form__textarea"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Buy tickets by Friday, meet at the gate"
            disabled={busy}
            autoFocus
          />
          <div className="plan-form__actions">
            <button type="submit" className="plans__primary plans__primary--small" disabled={busy}>
              {busy ? 'Saving…' : 'Save note'}
            </button>
            <button
              type="button"
              className="plans__secondary plans__secondary--small"
              disabled={busy}
              onClick={() => {
                setDraft(ev.note ?? '')
                setEditingNote(false)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : ev.note ? (
        <p className="saved-item__note">
          <span>{ev.note}</span>
          <button type="button" className="plans__link-button" onClick={() => setEditingNote(true)} disabled={busy}>
            Edit note
          </button>
        </p>
      ) : (
        <button type="button" className="plans__link-button" onClick={() => setEditingNote(true)} disabled={busy}>
          + Add a note
        </button>
      )}
    </li>
  )
}

export default PlanSection
