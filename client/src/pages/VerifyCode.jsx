import {useState} from "react";
import {useLocation, useNavigate, Link} from "react-router-dom";
import { authPost } from "../api/plansApi";
import AuthLayout from "./AuthLayout";
import FormField from "./FormField";

export default function VerifyCode() {
    const location = useLocation();
    const email = location.state?.email || new URLSearchParams(location.search).get("email");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await authPost("verify-reset-code", {email, code: code.trim()});
            navigate(`/reset-password?email=${encodeURIComponent(email)}`, {state: {email, code}});
        } catch (err) {
            setError(err.message);
        }
    }
    return (
        <AuthLayout
            title="Verify Code"
            subtitle={`A verification code has been sent to ${email}. Please enter the code below.`}
            footer={
                <>
                    Remembered your password?{" "}
                    <Link to="/login">Log in</Link>
                </>
            }
        >
            <form className="auth__form" onSubmit={handleVerifyCode} noValidate>
                {error && <p className="auth__form-error" role="alert"> {error} </p>}
                <FormField
                    id="code"
                    label="Verification Code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                />
                <button type="submit" className="auth__submit">
                    Verify Code
                </button>
            </form>
        </AuthLayout>
    );
}
  