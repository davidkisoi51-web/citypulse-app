import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { paymentPath, paysOnSite } from '../payment/paymentUtils'

// "Get tickets" link that requires an account. Logged-in users go straight to the
// ticket page; logged-out users are sent to /login, which opens the ticket page
// once they've logged in or signed up.
// Admin events without a ticket link go to our own M-PESA payment page instead.
function TicketLink({ url, eventName, event, className, onClick, children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const payPath = paysOnSite(event) ? paymentPath(event) : null

  const handleClick = (e) => {
    onClick?.(e)
    if (payPath) {
      e.preventDefault()
      if (user) navigate(payPath)
      else navigate('/login', { state: { from: payPath, eventName } })
      return
    }
    if (user) return
    e.preventDefault()
    navigate('/login', { state: { from: pathname, ticketUrl: url, eventName } })
  }

  if (payPath) {
    return (
      <a className={className} href={payPath} onClick={handleClick}>
        {children}
      </a>
    )
  }

  return (
    <a className={className} href={url} target="_blank" rel="noopener noreferrer" onClick={handleClick}>
      {children}
    </a>
  )
}

export default TicketLink
