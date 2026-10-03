import { useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { useAuth } from '../auth/authContext'
import { isAdmin } from '../auth/admins'
import { useAdminEvents } from '../admin/adminEventsContext'
import { emptyEventForm, eventToForm, isUploadedImage, validateEventForm } from '../admin/adminEventUtils'
import { resizeImageFile } from '../admin/resizeImage'
import { formatDate, formatPrice } from '../utils/formatEvent'
import { loadPurchases, summarizePurchases } from '../payment/purchases'
import { formatAmount } from '../payment/paymentUtils'
import { downloadPdf, receiptFileName, receiptPdfForPurchase } from '../payment/receipt'
import FormField from './FormField'
import './AuthPage.css'
import './AdminPage.css'

const CATEGORY_SUGGESTIONS = ['Music', 'Sports', 'Arts & Theatre', 'Comedy', 'Family', 'Film', 'Miscellaneous']

// Admin portal: create, list, edit and delete admin events (shown on the events page).
function AdminPage() {
  const { user } = useAuth()
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
  // Purchase log (read when the portal opens; purchases happen on other pages).
  const [purchases] = useState(() => loadPurchases())
  const [purchaseFilter, setPurchaseFilter] = useState('all')

  // Not logged in: log in first, then come back here.
  if (!user) return <Navigate to="/login" replace state={{ from: '/admin' }} />

  if (!isAdmin(user)) {
    return (
      <>
        <NavBar />
        <main className="admin admin--denied">
          <section className="admin__panel">
            <h1 className="admin__title">Admins only</h1>
            <p>Your account ({user.email}) doesn't have access to the admin portal.</p>
            <Link className="admin__link" to="/">
              ← Back to events
            </Link>
          </section>
        </main>
      </>
    )
  }

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
      <NavBar />
      <main className="admin">
        <header className="admin__header">
          <Link className="admin__back" to="/">
            ← Back to events
          </Link>
          <h1 className="admin__title">Admin portal</h1>
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

        <PurchaseLog purchases={purchases} filter={purchaseFilter} onFilterChange={setPurchaseFilter} />
      </main>
    </>
  )
}

// Everyone who bought tickets (newest first), with totals and a filter by event.
function PurchaseLog({ purchases, filter, onFilterChange }) {
  const eventNames = [...new Set(purchases.map((p) => p.eventName))].sort()
  const shown = filter === 'all' ? purchases : purchases.filter((p) => p.eventName === filter)
  const { count, tickets, revenue } = summarizePurchases(shown)
  const revenueText =
    Object.entries(revenue)
      .map(([currency, amount]) => formatAmount(amount, currency))
      .join(' + ') || formatAmount(0)

  return (
    <section className="admin__panel admin__purchases" aria-labelledby="admin-purchases-title">
      <div className="admin__purchases-head">
        <h2 id="admin-purchases-title" className="admin__subtitle">
          Ticket purchases
        </h2>
        {purchases.length > 0 && (
          <label className="admin__filter">
            <span className="visually-hidden">Filter purchases by event</span>
            <select className="select-chevron" value={filter} onChange={(e) => onFilterChange(e.target.value)}>
              <option value="all">All events</option>
              {eventNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <dl className="admin__stats">
        <div>
          <dt>Purchases</dt>
          <dd>{count}</dd>
        </div>
        <div>
          <dt>Tickets sold</dt>
          <dd>{tickets}</dd>
        </div>
        <div>
          <dt>Revenue</dt>
          <dd>{revenueText}</dd>
        </div>
      </dl>

      {shown.length === 0 ? (
        <p className="admin__empty">No ticket purchases yet. They'll appear here after someone pays.</p>
      ) : (
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Buyer</th>
                <th scope="col">Event</th>
                <th scope="col">Tickets</th>
                <th scope="col">Total</th>
                <th scope="col">M-PESA code</th>
                <th scope="col">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.receiptNo}>
                  <td>
                    {new Date(p.paidAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td>
                    <span className="admin__cell-main">{p.buyerName}</span>
                    <span className="admin__cell-sub">{p.buyerEmail}</span>
                  </td>
                  <td>{p.eventName}</td>
                  <td>
                    {p.quantity} × {p.ticketType}
                  </td>
                  <td>{p.total ? formatAmount(p.total, p.currency) : 'Free'}</td>
                  <td className="admin__mono">{p.mpesaCode ?? '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="admin__link-button admin__mono"
                      onClick={() => downloadPdf(receiptPdfForPurchase(p), receiptFileName(p))}
                    >
                      {p.receiptNo}
                      <span className="visually-hidden"> (download PDF)</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default AdminPage
