import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

// Avatar + first name + chevron; opens a small menu with the account details and Log out.
function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const menuId = useId()
  const firstName = user.name.trim().split(/\s+/)[0]

  // Close when clicking outside the menu or pressing Escape (focus returns to the button).
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="account-menu__trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="nav__avatar" aria-hidden="true">
          {firstName.charAt(0).toUpperCase()}
        </span>
        <span className="nav__name">{firstName}</span>
        <svg className="account-menu__chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
        <span className="visually-hidden">Account menu</span>
      </button>

      {open && (
        <div id={menuId} className="account-menu__panel">
          <div className="account-menu__info">
            <p className="account-menu__full-name">{user.name}</p>
            {user.email && <p className="account-menu__email">{user.email}</p>}
          </div>
          <Link className="account-menu__item" to="/my-tickets" onClick={() => setOpen(false)}>
            My tickets
          </Link>
          <button
            type="button"
            className="account-menu__item"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

export default AccountMenu
