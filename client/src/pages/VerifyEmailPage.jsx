import { useState } from "react";
import { useLocation, useNavigate, useSearchParams, Link } from "react-router-dom";
import { authPost } from "../api/plansApi";
import AuthLayout from "./AuthLayout";
import FormField from "./FormField";

export default function VerifyEmailPage(){
    const [searchParams] = useSearchParams()
    const location = useLocation()
    const email = (searchParams.get("email") || "").toLowerCase()
    const [code, setCode] = useState("")
    const [error, setError] = useState("")
    const [notice, setNotice] = useState(
        location.state?.verificationSent === false
            ? "Your account was created, but the verification email could not be delivered. Try sending a new code."
            : "",
    )
    const [submitting, setSubmitting] = useState(false)
    const [resending, setResending] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setSubmitting(true)
        try {
            await authPost("verify-email", {email, code: code.trim()})
            navigate("/login", { state: { verified: true } })
        } catch (err) {
            setError(err.message || "Invalid code")
        } finally {
            setSubmitting(false)
        }
    }

    const resendCode = async () => {
        setError("")
        setNotice("")
        setResending(true)
        try {
            const result = await authPost("resend-verification", {email})
            setNotice(result.message || "A new verification code was sent.")
        } catch (err) {
            setError(err.message || "We couldn't send a new verification code.")
        } finally {
            setResending(false)
        }
    }

    return(
        <AuthLayout
            title="Verify account"
            subtitle={email ? `Enter the code sent to ${email}` : "Open this page from your signup email address to verify your account."}
            notice={notice}
            footer={
                <Link to="/login"> Login </Link>
            }
            >
            {error && <p className="auth__form-error" role="alert"> {error} </p>}
            {email && <form className="auth__form" onSubmit={handleSubmit} noValidate>
                <FormField
                    id="code"
                    label="Verification Code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={5}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                />
                <button type="submit" className="auth__submit" disabled={submitting || code.trim().length !== 5}>
                    {submitting ? "Verifying…" : "Verify"}
                </button>
                <button type="button" className="auth__resend" onClick={resendCode} disabled={resending}>
                    {resending ? "Sending…" : "Resend verification code"}
                </button>
            </form>}
            </AuthLayout>
    )
}