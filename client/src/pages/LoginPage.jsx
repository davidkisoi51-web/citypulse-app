import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { validateLogin } from '../auth/authUtils'
import { redirectAfterAuth } from '../auth/redirectAfterAuth'
import AuthLayout from './AuthLayout'
import FormField from './FormField'

function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  // Set by TicketLink when a logged-out user tried to buy tickets.
  const redirect = useLocation().state ?? {}

  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already logged in (e.g. opened /login directly): nothing to do here.
  if (user && !submitting) return <Navigate to={redirect.from ?? '/'} replace />

  const update = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = validateLogin(values)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length) return

    setSubmitting(true)
    try {
      await login(values)
      redirectAfterAuth(navigate, redirect)
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Welcome back. Log in to buy tickets."
      notice={redirect.eventName && `Log in to buy tickets for ${redirect.eventName}.`}
      footer={
        <>
          New here?{' '}
          <Link to="/signup" state={redirect}>
            Create an account
          </Link>
        </>
      }
    >
      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <p className="auth__form-error" role="alert">
            {formError}
          </p>
        )}
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={update}
          error={errors.email}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={update}
          error={errors.password}
        />
        <button className="auth__submit" type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  )
}

export default LoginPage
