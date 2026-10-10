import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { useAuth } from '../auth/authContext'
import { normalizeEmail } from '../auth/authUtils'
import { loadPurchases } from '../payment/purchases'
import { formatAmount } from '../payment/paymentUtils'
import { downloadPdf, receiptFileName, receiptPdfForPurchase } from '../payment/receipt'
import { formatDate } from '../utils/formatEvent'
import './PaymentPage.css'

// The logged-in customer's purchase history, with receipts they can download again.
function MyTicketsPage() {
  const { user } = useAuth()
  const [purchases] = useState(() => loadPurchases())

  if (!user) return <Navigate to="/login" replace state={{ from: '/my-tickets' }} />

  const mine = purchases.filter((p) => normalizeEmail(p.buyerEmail) === normalizeEmail(user.email))

  return (
    <>
      <NavBar />
      <main className="pay pay--wide">
        <Link className="pay__back" to="/">
          ← Back to events
        </Link>
        <h1 className="pay__title">My tickets</h1>
        <p className="pay__intro">Your ticket purchases. Download a receipt any time to show at the venue.</p>

        {mine.length === 0 ? (
          <section className="pay__card">
            <p>You haven't bought any tickets yet.</p>
            <Link className="pay__primary" to="/">
              Browse events
            </Link>
          </section>
        ) : (
          <ul className="tickets">
            {mine.map((p) => (
              <li key={p.receiptNo} className="tickets__item">
                <div className="tickets__info">
                  <p className="pay__event-name">{p.eventName}</p>
                  <p className="pay__meta">
                    {formatDate(p.eventDate, p.eventTime)}
                    {(p.eventVenue || p.eventCity) && ` · ${[p.eventVenue, p.eventCity].filter(Boolean).join(', ')}`}
                  </p>
                  <p className="pay__meta">
                    {p.quantity} × {p.ticketType} · {p.method === 'Free' ? 'Free' : formatAmount(p.total, p.currency)}
                    {p.mpesaCode && ` · M-PESA ${p.mpesaCode}`}
                  </p>
                  <p className="tickets__receipt">
                    Receipt {p.receiptNo} · paid{' '}
                    {new Date(p.paidAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <button
                  type="button"
                  className="pay__secondary tickets__download"
                  onClick={() => downloadPdf(receiptPdfForPurchase(p), receiptFileName(p))}
                >
                  Download receipt<span className="visually-hidden"> for {p.eventName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}

export default MyTicketsPage
