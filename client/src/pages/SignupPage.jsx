import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { MIN_PASSWORD_LENGTH, validateSignup } from '../auth/authUtils'
import { redirectAfterAuth } from '../auth/redirectAfterAuth'
import AuthLayout from './AuthLayout'
import FormField from './FormField'

function SignupPage() {
  const { user, signup } = useAuth()
  const navigate = useNavigate()
  // Carried over from /login so the pending ticket purchase survives switching pages.
  const redirect = useLocation().state ?? {}

  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user && !submitting) return <Navigate to={redirect.from ?? '/'} replace />

  const update = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = validateSignup(values)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length) return

    setSubmitting(true)
    try {
      await signup(values)
      redirectAfterAuth(navigate, redirect)
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Sign up to buy tickets. Browsing stays free."
      notice={redirect.eventName && `Create an account to buy tickets for ${redirect.eventName}.`}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={redirect}>
            Log in
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
          id="name"
          label="Full name"
          autoComplete="name"
          value={values.name}
          onChange={update}
          error={errors.name}
        />
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
          autoComplete="new-password"
          value={values.password}
          onChange={update}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        />
        <FormField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={update}
          error={errors.confirmPassword}
        />
        <button className="auth__submit" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
    </AuthLayout>
  )
}

export default SignupPage
