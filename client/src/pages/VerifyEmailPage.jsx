import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import FormField from "./FormField";

export default function VerifyEmailPage(){
    const [searchParams] = useSearchParams()
    const email = (searchParams.get("email") || "").toLowerCase()
    const [code, setCode] = useState("")
    const [error, setError] = useState("")
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        const res = await fetch("/api/auth/verify-email", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({email, code: code.trim()})
        })
        const data = await res.json()
        if (!res.ok){
            setError(data.error?.message || "Invalid code")
            return
        }
        navigate("/login")
    }
    return(
        <AuthLayout
            title="Verify account"
            subtitle={`Enter code sent to ${email}`}
            footer={
                <Link to="/login"> Login </Link>
            }
            >
            {error && <p className="auth__form-error" role="alert"> {error} </p>}
            <form className="auth__form" onSubmit={handleSubmit} noValidate>
                <FormField
                    id="code"
                    label="Verification Code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                />
                <button type="submit" className="auth__submit">
                    Verify
                </button>
            </form>
            </AuthLayout>
    )
}