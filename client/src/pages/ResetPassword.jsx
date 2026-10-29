import {useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import AuthLayout from "./AuthLayout";
import FormField from "./FormField";

export default function NewPassword() {
    const location = useLocation();
    const navigate = useNavigate();
    const emailFromState = location.state?.email;
    const emailFromUrl = new URLSearchParams(location.search).get("email")
    const email = emailFromState || emailFromUrl
    const code = location.state?.code || new URLSearchParams(location.search).get("code")|| ""
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError(""); setMessage("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }
        const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({email, code, new_password: newPassword, confirm_password: confirmPassword}),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error?.message || data.message || "Reset failed");
                return
            }
            navigate("/reset-success")
    };

    return (
        <AuthLayout
            title="Reset Password" >
            <form className="auth__form" onSubmit={handleResetPassword} noValidate>
                {error && <p className="auth__form-error" role="alert"> {error} </p>}
                {message && <p className="auth__form-message" role="alert"> {message} </p>}
                <FormField
                    id="newPassword"
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                />
                <FormField
                    id="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button type="submit" className="auth__submit">
                    Reset Password
                </button>
            </form>
        </AuthLayout>
    );
}
            