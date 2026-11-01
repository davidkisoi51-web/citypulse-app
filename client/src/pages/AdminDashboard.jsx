import { useEffect, useState } from 'react'
import { filterPurchases, purchaseOptions, purchasesToCsv } from '../admin/purchaseFilters'
import { listAllPurchases, summarizePurchases } from '../payment/purchases'
import { formatAmount } from '../payment/paymentUtils'
import { downloadPdf, receiptFileName, receiptPdfForPurchase } from '../payment/receipt'

const NO_FILTERS = { date: '', month: '', category: 'all', event: 'all' }

// Saves text as a file via a temporary download link.
function downloadText(text, fileName, type) {
  // A BOM makes Excel read the CSV as UTF-8 (names with accents, "Ksh", etc.).
  const url = URL.createObjectURL(new Blob(['﻿', text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const today = () => new Date().toLocaleDateString('en-CA')

// Admin portal › Dashboard (the default admin page): every ticket purchase from any customer
// and device (from the server), with totals, filters by purchase date / month / event type /
// event, and CSV downloads of the filtered list or the whole history.
function AdminDashboard() {
  // null while loading; then every purchase, or an error message.
  const [loaded, setLoaded] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [filters, setFilters] = useState(NO_FILTERS)

  useEffect(() => {
    let cancelled = false
    listAllPurchases()
      .then((list) => !cancelled && setLoaded(list))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [attempt])

  const reload = () => {
    setError('')
    setLoaded(null)
    setAttempt((n) => n + 1)
  }

  // A day and a month together would usually match nothing, so picking one clears the other.
  const setFilter = (name, value) =>
    setFilters((f) => ({
      ...f,
      [name]: value,
      ...(name === 'date' && value ? { month: '' } : {}),
      ...(name === 'month' && value ? { date: '' } : {}),
    }))
  const filtering = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)

  const purchases = loaded ?? []
  const categories = purchaseOptions(purchases, 'eventCategory')
  const eventNames = purchaseOptions(purchases, 'eventName')
  const shown = filterPurchases(purchases, filters)
  const { count, tickets, revenue } = summarizePurchases(shown)
  const revenueText =
    Object.entries(revenue)
      .map(([currency, amount]) => formatAmount(amount, currency))
      .join(' + ') || formatAmount(0)

  const exportCsv = (list, label) =>
    downloadText(purchasesToCsv(list), `CityPulse-purchases-${label}-${today()}.csv`, 'text/csv;charset=utf-8')

  return (
    <>
      <header className="admin__header admin-dash__header">
        <div>
          <h1 className="admin__title">Dashboard</h1>
          <p>Every ticket bought on CityPulse, by any customer on any device.</p>
        </div>
        <button type="button" className="admin__refresh" onClick={reload} disabled={loaded === null && !error}>
          Refresh
        </button>
      </header>

      <dl className="admin__stats admin-dash__stats">
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

      <section className="admin__panel admin__purchases" aria-labelledby="admin-purchases-title">
        <div className="admin__purchases-head">
          <h2 id="admin-purchases-title" className="admin__subtitle">
            Ticket purchases
            {filtering && loaded && (
              <span className="admin-dash__count">
                {' '}
                ({shown.length} of {purchases.length})
              </span>
            )}
          </h2>
          <div className="admin-dash__downloads">
            <button
              type="button"
              className="admin__refresh"
              onClick={() => exportCsv(shown, 'filtered')}
              disabled={!shown.length || !filtering}
              title={filtering ? undefined : 'Choose a filter first'}
            >
              Download filtered (CSV)
            </button>
            <button
              type="button"
              className="admin-dash__primary"
              onClick={() => exportCsv(purchases, 'all')}
              disabled={!purchases.length}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16" />
              </svg>
              Download full history
            </button>
          </div>
        </div>

        <div className="admin-dash__filters" role="group" aria-label="Filter purchases">
          <label>
            <span>Day bought</span>
            <input type="date" value={filters.date} max={today()} onChange={(e) => setFilter('date', e.target.value)} />
          </label>
          <label>
            <span>Month</span>
            <input type="month" value={filters.month} onChange={(e) => setFilter('month', e.target.value)} />
          </label>
          <label>
            <span>Event type</span>
            <select className="select-chevron" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
              <option value="all">All types</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Event</span>
            <select className="select-chevron" value={filters.event} onChange={(e) => setFilter('event', e.target.value)}>
              <option value="all">All events</option>
              {eventNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {filtering && (
            <button type="button" className="admin-dash__clear" onClick={() => setFilters(NO_FILTERS)}>
              Clear filters
            </button>
          )}
        </div>

        {error ? (
          <p className="admin__empty" role="alert">
            Couldn't load purchases. {error}
          </p>
        ) : loaded === null ? (
          <p className="admin__empty" role="status">
            Loading purchases…
          </p>
        ) : purchases.length === 0 ? (
          <p className="admin__empty">No ticket purchases yet. They'll appear here after someone pays.</p>
        ) : shown.length === 0 ? (
          <p className="admin__empty">No purchases match these filters.</p>
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
                    <td>{new Date(p.paidAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td>
                      <span className="admin__cell-main">{p.buyerName}</span>
                      <span className="admin__cell-sub">{p.buyerEmail}</span>
                    </td>
                    <td>
                      <span className="admin__cell-main">{p.eventName}</span>
                      {p.eventCategory && <span className="admin__cell-sub">{p.eventCategory}</span>}
                    </td>
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
    </>
  )
}

export default AdminDashboard
