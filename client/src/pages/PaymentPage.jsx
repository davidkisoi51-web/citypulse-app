import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { useAuth } from '../auth/authContext'
import { useAdminEvents } from '../admin/adminEventsContext'
import {
  MAX_TICKETS,
  MPESA_NUMBER,
  MPESA_NUMBER_DISPLAY,
  formatAmount,
  normalizeMpesaCode,
  ticketOptions,
} from '../payment/paymentUtils'
import { newReceiptNumber } from '../payment/receiptPdf'
import { downloadPdf, receiptFileName, receiptPdfForPurchase } from '../payment/receipt'
import { recordPurchase } from '../payment/purchases'
import {
  STK_POLL_MS,
  getPayment,
  interpretPayment,
  isValidKenyanPhone,
  startStkPush,
} from '../payment/paymentsApi'
import { formatDate } from '../utils/formatEvent'
import './PaymentPage.css'

// Demo M-PESA checkout for admin events without a ticket link. Any code counts as paid.
function PaymentPage() {
  const { eventId } = useParams()
  const { user } = useAuth()
  const { events } = useAdminEvents()
  const event = events.find((e) => e.id === eventId)

  const options = event ? ticketOptions(event) : []
  const [optionId, setOptionId] = useState(options[0]?.id)
  const [quantity, setQuantity] = useState(1)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  // The logged purchase once payment is confirmed (drives the success screen and PDF).
  const [purchase, setPurchase] = useState(null)
  const [downloaded, setDownloaded] = useState(false)
  const [copied, setCopied] = useState(false)

    // M-PESA Express (STK push) state
  const [phone, setPhone] = useState('')
  const [stkState, setStkState] = useState('idle') // idle | sending | waiting | failed | timeout
  const [stkMessage, setStkMessage] = useState('')
  const [paymentId, setPaymentId] = useState(null)
  // Always points at the latest completePurchase, so the poller can call it when payment is confirmed.
  const completeRef = useRef(null)

  // While waiting for the customer to enter their PIN, ask the server for the status every few seconds.
  useEffect(() => {
    if (stkState !== 'waiting' || !paymentId) return undefined
    const startedAt = Date.now()
    let stopped = false
    const check = async () => {
      try {
        const payment = await getPayment(paymentId)
        if (stopped) return
        const result = interpretPayment(payment, Date.now() - startedAt)
        if (result.state === 'waiting') return
        stopped = true
        clearInterval(timer)
        if (result.state === 'paid') {
          completeRef.current?.(payment.receipt, {
            paidTo: 'M-PESA Express (STK Push)',
            paymentId: payment.id,
          })
        } else {
          setStkState(result.state)
          setStkMessage(result.message)
        }
      } catch {
        // A network blip: keep trying until the timeout.
      }
    }
    const timer = setInterval(check, STK_POLL_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [stkState, paymentId])

    const option = options.find((o) => o.id === optionId) ?? options[0]
  const total = option ? option.price * quantity : null
  const currency = event?.currency || 'KES'

  // Confirms the payment: shows the success screen and logs the purchase for the admin portal.
  const completePurchase = (mpesaCode, extra = {}) => {
    const record = {
      receiptNo: newReceiptNumber(),
      paidAt: new Date().toISOString(),
      buyerName: user.name,
      buyerEmail: user.email,
      eventId: event.id,
      eventName: event.name,
      eventDate: event.date,
      eventTime: event.time,
      eventVenue: event.venue,
      eventCity: event.city,
      ticketType: option.label,
      quantity,
      unitPrice: option.price,
      total,
      currency,
      method: mpesaCode === 'FREE' ? 'Free' : 'M-PESA',
      mpesaCode: mpesaCode === 'FREE' ? null : mpesaCode,
      paidTo: mpesaCode === 'FREE' ? null : MPESA_NUMBER_DISPLAY,
      ...extra,
    }
    recordPurchase(record)
    setPurchase(record)
  }

  // Keep the ref pointing at the latest completePurchase (updated after each render, never during it).
  useEffect(() => {
    completeRef.current = completePurchase
  })


  const [values, setValues] = useState({event_Id : eventId, eventName :"", eventDate :"",eventVenue :"", eventCity :"", ticketType :"",quantity: 0, unitPrice: 0, paidAt: ""})

  // Buying tickets needs an account (same rule as "Get tickets").
  if (!user) return <Navigate to="/login" replace state={{ from: `/pay/${eventId}`, eventName: event?.name }} />

  const page = (content) => (
    <>
      <NavBar />
      <main className="pay">
        <Link className="pay__back" to="/">
          ← Back to events
        </Link>
        {content}
      </main>
    </>
  )

  if (!event) {
    return page(
      <section className="pay__card">
        <h1 className="pay__title">Event not found</h1>
        <p>This event may have been removed by an admin.</p>
      </section>,
    )
  }

  const summary = (
    <div className="pay__event">
      {event.image && <img className="pay__thumb" src={event.image} alt="" />}
      <div>
        <p className="pay__event-name">{event.name}</p>
        <p className="pay__meta">{formatDate(event.date, event.time)}</p>
        <p className="pay__meta">{[event.venue, event.city].filter(Boolean).join(', ')}</p>
      </div>
    </div>
  )

  if (purchase) {
    const free = purchase.method === 'Free'
    const downloadReceipt = () => {
      downloadPdf(receiptPdfForPurchase(purchase), receiptFileName(purchase))
      setDownloaded(true)
    }

    return page(
      <section className="pay__card pay__card--success" aria-labelledby="pay-title">
        <div className="pay__check" aria-hidden="true">✓</div>
        <h1 id="pay-title" className="pay__title">
          Payment successful
        </h1>
        <p role="status">
          Thank you, {user.name.split(' ')[0]}! Your {purchase.quantity} {purchase.ticketType}{' '}
          {purchase.quantity === 1 ? 'ticket' : 'tickets'} for <strong>{purchase.eventName}</strong>{' '}
          {purchase.quantity === 1 ? 'is' : 'are'} confirmed.
        </p>
        <dl className="pay__receipt">
          <dt>Receipt no.</dt>
          <dd>{purchase.receiptNo}</dd>
          <dt>Amount</dt>
          <dd>{free ? 'Free' : formatAmount(purchase.total, purchase.currency)}</dd>
          {!free && (
            <>
              <dt>M-PESA code</dt>
              <dd>{purchase.mpesaCode}</dd>
              <dt>Paid to</dt>
              <dd>{purchase.paidTo}</dd>
            </>
          )}
        </dl>
        <p className="pay__notice" role="note">
          <strong>Download your PDF receipt.</strong> You'll need it as proof of payment at the venue. You can also
          download it later from <Link to="/my-tickets">My tickets</Link>.
        </p>
        <button type="button" className="pay__primary" onClick={downloadReceipt}>
          {downloaded ? 'Download PDF receipt again' : 'Download PDF receipt'}
        </button>
        {downloaded && (
          <p className="pay__saved" role="status">
            Receipt downloaded. Check your Downloads folder.
          </p>
        )}
        <Link className="pay__secondary" to="/my-tickets">
          View my tickets
        </Link>
        <Link className="pay__secondary" to="/">
          Back to events
        </Link>
      </section>,
    )
  }

  if (!option) {
    return page(
      <section className="pay__card">
        {summary}
        <h1 className="pay__title">Price to be confirmed</h1>
        <p>Tickets for this event aren't on sale yet. Please check back later or contact us.</p>
      </section>,
    )
  }

  const free = total === 0

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(MPESA_NUMBER)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: the number is visible to copy by hand.
    }
  }

  const busy = stkState === 'sending' || stkState === 'waiting'

  const handleStkPush = async () => {
    setStkMessage('')
    if (!isValidKenyanPhone(phone)) {
      setStkMessage('Enter a valid Safaricom number, e.g. 0712 345 678.')
      return
    }
    setStkState('sending')
    try {
      const payment = await startStkPush({
        phone,
        amount: Math.round(total),
        eventId: event.id,
        quantity,
      })
      setPaymentId(payment.id)
      setStkState('waiting')
    } catch (err) {
      setStkState('failed')
      setStkMessage(err.message)
    }
  }

  //handleSaveTicket -> complete purchase, 'FREE', recording the purchase that hsould change
  //
  const handleSubmit = (e) => {
    e.preventDefault()
    if (free) {
      completePurchase('FREE')
      return
    }
    const cleaned = normalizeMpesaCode(code)
    if (!cleaned) {
      setCodeError('Paste the M-PESA code from your confirmation SMS.')
      return
    }
    completePurchase(cleaned)
  }

  return page(
    <section className="pay__card" aria-labelledby="pay-title">
      <h1 id="pay-title" className="pay__title">
        Pay for your tickets
      </h1>
      {summary}

      <form className="pay__form" onSubmit={handleSubmit} noValidate>
        {options.length > 1 && (
          <fieldset className="pay__options">
            <legend>Ticket type</legend>
            {options.map((o) => (
              <label key={o.id} className={o.id === option.id ? 'is-active' : undefined}>
                <input
                  type="radio"
                  name="ticketType"
                  value={o.id}
                  checked={o.id === option.id}
                  onChange={() => setOptionId(o.id)}
                  disabled={busy}
                />
                <span>{o.label}</span>
                <span className="pay__option-price">{formatAmount(o.price, currency)}</span>
              </label>
            ))}
          </fieldset>
        )}

        <label className="pay__field">
          <span>Number of tickets</span>
          <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="select-chevron" disabled={busy}>
            {Array.from({ length: MAX_TICKETS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <p className="pay__total">
          Your price is <strong>{free ? 'Free' : formatAmount(total, currency)}</strong>
        </p>

        {free ? (
          <button className="pay__primary" type="submit">
            Confirm free tickets
          </button>
        ) : (
          <>
            <div className="pay__stk">
              <label className="pay__field">
                <span>M-PESA phone number</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    setStkMessage('')
                    if (stkState === 'failed' || stkState === 'timeout') setStkState('idle')
                  }}
                  placeholder="e.g. 0712345678"
                  autoComplete="tel"
                  disabled={busy}
                  aria-invalid={stkMessage ? true : undefined}
                />
              </label>
              {stkMessage && (
                <p className="pay__error" role="alert">
                  {stkMessage}
                </p>
              )}
              <button type="button" className="pay__primary pay__stk-btn" onClick={handleStkPush} disabled={busy}>
                {busy ? (
                  <>
                    <span className="pay__spinner" aria-hidden="true" /> Confirming payment…
                  </>
                ) : stkState === 'failed' || stkState === 'timeout' ? (
                  'Try again'
                ) : (
                  'Initiate M-PESA STK Push'
                )}
              </button>
              {stkState === 'waiting' && (
                <p className="pay__meta" role="status">
                  Check your phone and enter your M-PESA PIN to approve {formatAmount(total, currency)}.
                </p>
              )}
              <p className="pay__meta pay__or">Or pay manually:</p>
            </div>


            <div className="pay__mpesa">
              <p className="pay__mpesa-title">
                <span className="pay__mpesa-badge">M-PESA</span> Lipa na M-PESA
              </p>
              <ol className="pay__steps">
                <li>
                  Open M-PESA and choose <strong>Send Money</strong>.
                </li>
                <li>
                  Send <strong>{formatAmount(total, currency)}</strong> to{' '}
                  <strong className="pay__number">{MPESA_NUMBER_DISPLAY}</strong>
                  <button type="button" className="pay__copy" onClick={copyNumber}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </li>
                <li>Paste the M-PESA code from your confirmation SMS below.</li>
              </ol>
            </div>

            <label className="pay__field">
              <span>M-PESA code</span>
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setCodeError('')
                }}
                placeholder="e.g. SJK4H7QW2P"
                autoComplete="off"
                autoCapitalize="characters"
                aria-invalid={codeError ? true : undefined}
                aria-describedby={codeError ? 'mpesa-code-error' : undefined}
              />
              {codeError && (
                <span id="mpesa-code-error" className="pay__error">
                  {codeError}
                </span>
              )}
            </label>

            <button className="pay__primary" type="submit">
              Confirm payment
            </button>
          </>
        )}
      </form>
    </section>,
  )
}

export default PaymentPage
