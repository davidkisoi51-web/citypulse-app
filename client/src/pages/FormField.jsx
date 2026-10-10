import { useState } from 'react'

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m3 3 18 18" />
  </svg>
)

// Labelled input with an inline error that screen readers announce with the field.
// Password inputs get an eye button to show/hide what's been typed.
function FormField({ id, label, error, hint, type = 'text', ...inputProps }) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ')

  return (
    <div className={`auth-field${error ? ' auth-field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="auth-field__control">
        <input
          id={id}
          name={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-field__reveal"
            aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={revealed}
            aria-controls={id}
            onClick={() => setRevealed((r) => !r)}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="auth-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="auth-field__error">
          {error}
        </p>
      )}
    </div>
  )
}

export default FormField
