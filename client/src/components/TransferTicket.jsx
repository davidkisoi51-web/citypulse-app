import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { listMyPurchases, transferPurchase } from '../payment/purchases'
import NavBar from './NavBar'
import './TransferTickets.css'

export function TransferTickets() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState([])
  const [ticketId, setTicketId] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    listMyPurchases()
      .then((list) => !cancelled && setPurchases(list))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user) return <Navigate to="/login" replace state={{ from: '/transfer-ticket' }} />

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!ticketId) {
      setError('Choose a ticket purchase to transfer.')
      return
    }
    setSubmitting(true)
    try {
      const transferred = await transferPurchase(Number(ticketId), email.trim().toLowerCase())
      setPurchases((current) => current.filter((purchase) => purchase.id !== transferred.ticketId))
      setTicketId('')
      setEmail('')
      setNotice(`Tickets for ${transferred.eventName} were transferred to ${transferred.transfereeEmail}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <NavBar />
      <Link className="back_to_events" to="/">
        ← Back to events
      </Link>
      <h3>Transfer Tickets</h3>
      <p className="transfer_desc">Transfer a ticket purchase to another CityPulse account.</p>
      <main className="ticket_transfer">
        <form className="transfer_form" onSubmit={handleSubmit}>
          {error && <p className="auth__form-error" role="alert">{error}</p>}
          {notice && <p className="auth__notice" role="status">{notice}</p>}

          <label className="p_transfer" htmlFor="transfer_email">Recipient email</label>
          <input
            id="transfer_email"
            className="transfer_input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <div className="select_transfer">
            <label className="p_transfer" htmlFor="ticket_select">Ticket purchase</label>
            <select
              id="ticket_select"
              className="ticket_select"
              value={ticketId}
              onChange={(event) => setTicketId(event.target.value)}
              disabled={loading || purchases.length === 0}
              required
            >
              <option value="">
                {loading ? 'Loading tickets…' : purchases.length ? 'Select a ticket purchase' : 'No tickets available'}
              </option>
              {purchases.map((purchase) => (
                <option key={purchase.id} value={purchase.id}>
                  {purchase.eventName} — {purchase.quantity} {purchase.quantity === 1 ? 'ticket' : 'tickets'}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="transfer_ticket_btn" disabled={submitting || loading || !purchases.length}>
            {submitting ? 'Transferring…' : 'Transfer'}
          </button>
        </form>
      </main>
    </>
  )
}

export default TransferTickets
