import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import { authPost } from "../api/plansApi";
import AuthLayout from "./AuthLayout";
import FormField from "./FormField";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError(""); setMessage("");

        try {
            const data = await authPost("forgot-password", {email: email.trim().toLowerCase()});
            setMessage(data.message);
            navigate(`/verify-code?email=${email.trim().toLowerCase()}`, 
                {state: {email: email.trim().toLowerCase()}});
        } catch (err) {
            setError(err.message);
        }
    };
    return (
        <AuthLayout
            title="Forgot Password"
            subtitle="Enter your email to receive a password reset code."
            footer={
                <>
                    Remembered your password?{" "}
                    <Link to="/login">Log in</Link>
                </>
            }
        >
            <form className="auth__form" onSubmit={handleForgotPassword} noValidate>
                {error && <p className="auth__form-error" role="alert"> {error} </p>}
                {message && <p className="auth__form-message" role="alert"> {message} </p>}
                <FormField
                    id="email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" className="auth__submit">
                    Send Reset Link
                </button>
            </form>
        </AuthLayout>
    );
}