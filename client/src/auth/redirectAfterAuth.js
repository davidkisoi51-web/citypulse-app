// After a successful login/signup: return to where the user came from, and if they
// were trying to buy tickets, open that ticket page. Runs inside the form submit, so
// the browser treats window.open as user-initiated and doesn't block it.
export function redirectAfterAuth(navigate, { from = '/', ticketUrl } = {}) {
  navigate(from, { replace: true })
  if (ticketUrl) window.open(ticketUrl, '_blank', 'noopener,noreferrer')
}
