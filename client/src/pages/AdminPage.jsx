import { useRef, useState } from 'react'
import { useAdminEvents } from '../admin/adminEventsContext'
import { emptyEventForm, eventToForm, isUploadedImage, validateEventForm } from '../admin/adminEventUtils'
import { resizeImageFile } from '../admin/resizeImage'
import { formatDate, formatPrice } from '../utils/formatEvent'
import FormField from './FormField'
import './AuthPage.css'
import './AdminPage.css'

const CATEGORY_SUGGESTIONS = ['Music', 'Sports', 'Arts & Theatre', 'Comedy', 'Family', 'Film', 'Miscellaneous']

// Admin portal › Events: create, list, edit and delete admin events (shown on the events
// page). Rendered inside AdminLayout, which handles login, admin access and the sidebar.
function AdminPage() {
  const { events, addEvent, updateEvent, deleteEvent, saveFailed } = useAdminEvents()
  const [form, setForm] = useState(emptyEventForm)
  const [errors, setErrors] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [status, setStatus] = useState('')
  // Image source: upload a file from the computer, or paste a link.
  const [imageMode, setImageMode] = useState('upload')
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState('')
  const formRef = useRef(null)

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const resetForm = () => {
    setForm(emptyEventForm)
    setErrors({})
    setEditingId(null)
    setImageMode('upload')
    setImageError('')
  }

  const setImage = (image) => setForm((f) => ({ ...f, image }))

  const switchImageMode = (mode) => {
    setImageMode(mode)
    setImageError('')
    // An uploaded image would show up as a huge data string in the link box, so clear it.
    if (mode === 'link' && isUploadedImage(form.image)) setImage('')
  }

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow choosing the same file again later
    if (!file) return
    setImageError('')
    setImageBusy(true)
    try {
      setImage(await resizeImageFile(file))
    } catch (err) {
      setImageError(err.message)
    } finally {
      setImageBusy(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const found = validateEventForm(form)
    setErrors(found)
    if (Object.keys(found).length) {
      setStatus('')
      return
    }
    // Success message only if it actually saved; otherwise the storage-full alert explains why.
    if (editingId) {
      const saved = updateEvent(editingId, form)
      setStatus(saved ? `Saved changes to "${form.name.trim()}".` : '')
    } else {
      const saved = addEvent(form)
      setStatus(saved ? `Added "${form.name.trim()}". It now shows on the events page.` : '')
    }
    resetForm()
  }

  const startEdit = (event) => {
    setForm(eventToForm(event))
    setErrors({})
    setEditingId(event.id)
    setStatus('')
    setImageError('')
    setImageMode(event.image && !isUploadedImage(event.image) ? 'link' : 'upload')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    formRef.current?.querySelector('input')?.focus({ preventScroll: true })
  }

  const handleDelete = (event) => {
    if (!window.confirm(`Delete "${event.name}"? This can't be undone.`)) return
    const saved = deleteEvent(event.id)
    if (editingId === event.id) resetForm()
    setStatus(saved ? `Deleted "${event.name}".` : '')
  }

  return (
    <>
        <header className="admin__header">
          <h1 className="admin__title">Events</h1>
          <p>Add, edit and delete events. Saved events appear on the events page alongside live listings.</p>
        </header>

        {status && (
          <p className="admin__status" role="status">
            {status}
          </p>
        )}
        {saveFailed && (
          <p className="admin__status admin__status--error" role="alert">
            Your last change couldn't be saved: browser storage is full. Remove some uploaded images (or use image links
            instead) and try again. Unsaved changes are lost when the page is refreshed.
          </p>
        )}

        <div className="admin__layout">
          <section className="admin__panel" ref={formRef} aria-labelledby="admin-form-title">
            <h2 id="admin-form-title" className="admin__subtitle">
              {editingId ? 'Edit event' : 'Add an event'}
            </h2>

            <form className="admin__form" onSubmit={handleSubmit} noValidate>
              <FormField id="name" label="Event name *" value={form.name} onChange={update} error={errors.name} />
              <div className="admin__row">
                <FormField id="date" label="Date *" type="date" value={form.date} onChange={update} error={errors.date} />
                <FormField id="time" label="Time" type="time" value={form.time} onChange={update} />
              </div>
              <div className="admin__row">
                <FormField id="venue" label="Venue" value={form.venue} onChange={update} />
                <FormField id="city" label="City *" value={form.city} onChange={update} error={errors.city} />
              </div>
              <FormField
                id="category"
                label="Category *"
                list="admin-categories"
                value={form.category}
                onChange={update}
                error={errors.category}
                hint="Pick a suggestion or type your own."
              />
              <datalist id="admin-categories">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <div className="admin__row admin__row--prices">
                <FormField id="priceMin" label="Min price" type="number" min="0" inputMode="numeric" value={form.priceMin} onChange={update} error={errors.priceMin} />
                <FormField id="priceMax" label="Max price" type="number" min="0" inputMode="numeric" value={form.priceMax} onChange={update} error={errors.priceMax} />
                <FormField id="currency" label="Currency" value={form.currency} onChange={update} maxLength={3} />
              </div>
              <fieldset className="admin__image">
                <legend>Image</legend>
                <div className="admin__toggle">
                  {[
                    ['upload', 'Upload image'],
                    ['link', 'Paste link'],
                  ].map(([mode, text]) => (
                    <label key={mode} className={imageMode === mode ? 'is-active' : undefined}>
                      <input
                        type="radio"
                        name="imageMode"
                        value={mode}
                        checked={imageMode === mode}
                        onChange={() => switchImageMode(mode)}
                      />
                      {text}
                    </label>
                  ))}
                </div>

                {imageMode === 'upload' ? (
                  <div className="admin__upload">
                    <label className="admin__secondary admin__file-button">
                      <input type="file" accept="image/*" onChange={handleImageFile} disabled={imageBusy} />
                      {imageBusy ? 'Processing…' : form.image ? 'Choose a different image' : 'Choose an image'}
                    </label>
                    <p className="auth-field__hint">JPG, PNG or WebP. Large photos are shrunk automatically.</p>
                  </div>
                ) : (
                  <FormField
                    id="image"
                    label="Image link"
                    value={form.image}
                    onChange={update}
                    error={errors.image}
                    hint="https:// link, or a file in public/ such as /Bien.jpeg"
                  />
                )}

                {imageError && (
                  <p className="auth-field__error" role="alert">
                    {imageError}
                  </p>
                )}

                {form.image.trim() && !errors.image && (
                  <div className="admin__preview-wrap">
                    <img className="admin__preview" src={form.image.trim()} alt="Preview of the event image" />
                    <button type="button" className="admin__danger admin__remove" onClick={() => setImage('')}>
                      Remove image
                    </button>
                  </div>
                )}
              </fieldset>
              <FormField id="url" label="Ticket link" type="url" value={form.url} onChange={update} error={errors.url} hint="Where 'Get tickets' should go." />

              <div className="admin__actions">
                <button className="admin__primary" type="submit">
                  {editingId ? 'Save changes' : 'Add event'}
                </button>
                {editingId && (
                  <button className="admin__secondary" type="button" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="admin__panel" aria-labelledby="admin-list-title">
            <h2 id="admin-list-title" className="admin__subtitle">
              Your events <span className="admin__count">({events.length})</span>
            </h2>

            {events.length === 0 ? (
              <p className="admin__empty">No events yet. Add one with the form.</p>
            ) : (
              <ul className="admin__list">
                {events.map((event) => {
                  const price = formatPrice(event.priceMin, event.priceMax, event.currency)
                  return (
                    <li key={event.id} className={`admin__item${editingId === event.id ? ' admin__item--editing' : ''}`}>
                      {event.image ? (
                        <img className="admin__thumb" src={event.image} alt="" />
                      ) : (
                        <span className="admin__thumb admin__thumb--empty" aria-hidden="true">
                          {event.name.charAt(0)}
                        </span>
                      )}
                      <div className="admin__info">
                        <p className="admin__name">{event.name}</p>
                        <p className="admin__meta">
                          {formatDate(event.date, event.time)}
                          {' · '}
                          {[event.venue, event.city].filter(Boolean).join(', ')}
                        </p>
                        <p className="admin__meta">
                          {event.category}
                          {price && ` · ${price}`}
                        </p>
                      </div>
                      <div className="admin__item-actions">
                        <button type="button" className="admin__secondary" onClick={() => startEdit(event)}>
                          Edit<span className="visually-hidden"> {event.name}</span>
                        </button>
                        <button type="button" className="admin__danger" onClick={() => handleDelete(event)}>
                          Delete<span className="visually-hidden"> {event.name}</span>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

    </>
  )
}

export default AdminPage
