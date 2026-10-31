from datetime import datetime, timedelta, timezone

import routes.auth as auth_routes
import services.email_service as email_service
from extensions import db
from models import User


def create_user(
    email="auth-test@example.test",
    password="OriginalPass123",
    verified=False,
    verification_code=None,
    code_expires_at=None,
    reset_code=None,
    reset_expires_at=None,
):
    user = User(
        name=f"Test {email}",
        email=email,
        password_hash="",
        is_verified=verified,
        verification_code=verification_code,
        code_expires_at=code_expires_at,
        reset_code=reset_code,
        reset_expires_at=reset_expires_at,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


# --------------------------------------------------
# REGISTRATION
# --------------------------------------------------

def test_register_success(client, app, monkeypatch):
    sent_emails = []

    monkeypatch.setattr(
        auth_routes,
        "send_verification_email",
        lambda email, code, name: sent_emails.append((email, code, name)) or True,
    )

    response = client.post("/api/auth/register", json={
        "name": "New User",
        "email": "newuser@example.test",
        "password": "StrongPass123",
    })

    assert response.status_code == 201
    assert response.json["data"]["email"] == "newuser@example.test"
    assert response.json["data"]["need_verification"] is True
    assert len(sent_emails) == 1

    with app.app_context():
        user = User.query.filter_by(email="newuser@example.test").first()
        assert user is not None
        assert user.is_verified is False
        assert user.verification_code is not None
        assert len(user.verification_code) == 5
        assert user.code_expires_at is not None


def test_register_rejects_non_object_json(client):
    response = client.post("/api/auth/register", json=["not", "an", "object"])
    assert response.status_code == 422


def test_register_rejects_short_password(client):
    response = client.post("/api/auth/register", json={
        "name": "Short Password",
        "email": "shortpass@example.test",
        "password": "123",
    })

    assert response.status_code == 422


# --------------------------------------------------
# EMAIL VERIFICATION
# --------------------------------------------------

def test_verify_email_success(client, app, monkeypatch):
    monkeypatch.setattr(
        auth_routes,
        "send_welcome_email",
        lambda email, name: True,
    )

    with app.app_context():
        create_user(
            email="verify@example.test",
            verification_code="12345",
            code_expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

    response = client.post("/api/auth/verify-email", json={
        "email": "verify@example.test",
        "code": "12345",
    })

    assert response.status_code == 200

    with app.app_context():
        user = User.query.filter_by(email="verify@example.test").first()
        assert user.is_verified is True
        assert user.verification_code is None
        assert user.code_expires_at is None


def test_verify_email_rejects_expired_code(client, app):
    with app.app_context():
        create_user(
            email="expired-verify@example.test",
            verification_code="12345",
            code_expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )

    response = client.post("/api/auth/verify-email", json={
        "email": "expired-verify@example.test",
        "code": "12345",
    })

    assert response.status_code == 400


def test_verify_email_rejects_missing_expiry(client, app):
    with app.app_context():
        create_user(
            email="missing-expiry@example.test",
            verification_code="12345",
            code_expires_at=None,
        )

    response = client.post("/api/auth/verify-email", json={
        "email": "missing-expiry@example.test",
        "code": "12345",
    })

    assert response.status_code == 400


# --------------------------------------------------
# LOGIN
# --------------------------------------------------

def test_login_success(client, app):
    with app.app_context():
        create_user(
            email="login@example.test",
            password="CorrectPass123",
            verified=True,
        )

    response = client.post("/api/auth/login", json={
        "email": "login@example.test",
        "password": "CorrectPass123",
    })

    assert response.status_code == 200
    assert response.json["data"]["token"]
    assert response.json["data"]["user"]["email"] == "login@example.test"


def test_login_rejects_wrong_password(client, app):
    with app.app_context():
        create_user(
            email="wrong-password@example.test",
            password="CorrectPass123",
            verified=True,
        )

    response = client.post("/api/auth/login", json={
        "email": "wrong-password@example.test",
        "password": "WrongPass123",
    })

    assert response.status_code == 401


def test_login_rejects_unverified_user(client, app):
    with app.app_context():
        create_user(
            email="unverified-login@example.test",
            verified=False,
        )

    response = client.post("/api/auth/login", json={
        "email": "unverified-login@example.test",
        "password": "OriginalPass123",
    })

    assert response.status_code == 403


def test_login_rejects_non_object_json(client):
    response = client.post("/api/auth/login", json=["invalid"])
    assert response.status_code == 422


# --------------------------------------------------
# FORGOT PASSWORD
# --------------------------------------------------

def test_forgot_password_returns_generic_response_for_unknown_email(client):
    response = client.post("/api/auth/forgot-password", json={
        "email": "does-not-exist@example.test",
    })

    assert response.status_code == 200
    assert "If an account exists" in response.json["data"]["message"]


def test_forgot_password_sends_code_for_existing_user(client, app, monkeypatch):
    sent_emails = []

    monkeypatch.setattr(
        email_service,
        "send_password_reset_email",
        lambda email, code, name="there": (
            sent_emails.append((email, code, name)) or True
        ),
    )

    with app.app_context():
        create_user(email="forgot@example.test", verified=True)

    response = client.post("/api/auth/forgot-password", json={
        "email": "forgot@example.test",
    })

    assert response.status_code == 200
    assert len(sent_emails) == 1

    with app.app_context():
        user = User.query.filter_by(email="forgot@example.test").first()
        assert user.reset_code is not None
        assert len(user.reset_code) == 5
        assert user.reset_expires_at is not None


# --------------------------------------------------
# PASSWORD RESET
# --------------------------------------------------

def test_reset_password_rejects_missing_code(client, app):
    with app.app_context():
        create_user(email="no-code@example.test", verified=True)

    response = client.post("/api/auth/reset-password", json={
        "email": "no-code@example.test",
        "new_password": "NewPassword123",
        "confirm_password": "NewPassword123",
    })

    assert response.status_code == 400


def test_reset_password_rejects_expired_code(client, app):
    with app.app_context():
        create_user(
            email="expired-reset@example.test",
            verified=True,
            reset_code="54321",
            reset_expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )

    response = client.post("/api/auth/reset-password", json={
        "email": "expired-reset@example.test",
        "code": "54321",
        "new_password": "NewPassword123",
        "confirm_password": "NewPassword123",
    })

    assert response.status_code == 400

    with app.app_context():
        user = User.query.filter_by(email="expired-reset@example.test").first()
        assert user.password_check("OriginalPass123")


def test_reset_password_success_and_consumes_code(client, app, monkeypatch):
    monkeypatch.setattr(
        email_service,
        "send_password_changed_email",
        lambda email, name="there": True,
    )

    with app.app_context():
        create_user(
            email="reset-success@example.test",
            verified=True,
            reset_code="67890",
            reset_expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

    response = client.post("/api/auth/reset-password", json={
        "email": "reset-success@example.test",
        "code": "67890",
        "new_password": "NewPassword123",
        "confirm_password": "NewPassword123",
    })

    assert response.status_code == 200

    with app.app_context():
        user = User.query.filter_by(email="reset-success@example.test").first()
        assert user.password_check("NewPassword123")
        assert user.reset_code is None
        assert user.reset_expires_at is None


def test_reset_password_rejects_code_reuse(client, app):
    with app.app_context():
        create_user(
            email="reuse@example.test",
            verified=True,
            reset_code="67890",
            reset_expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

    payload = {
        "email": "reuse@example.test",
        "code": "67890",
        "new_password": "NewPassword123",
        "confirm_password": "NewPassword123",
    }

    first = client.post("/api/auth/reset-password", json=payload)
    second = client.post("/api/auth/reset-password", json=payload)

    assert first.status_code == 200
    assert second.status_code == 400


def test_reset_password_rejects_mismatched_passwords(client, app):
    with app.app_context():
        create_user(
            email="mismatch@example.test",
            verified=True,
            reset_code="67890",
            reset_expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

    response = client.post("/api/auth/reset-password", json={
        "email": "mismatch@example.test",
        "code": "67890",
        "new_password": "NewPassword123",
        "confirm_password": "DifferentPassword123",
    })

    assert response.status_code == 400

    with app.app_context():
        user = User.query.filter_by(email="mismatch@example.test").first()
        assert user.password_check("OriginalPass123")


# --------------------------------------------------
# AUTHENTICATION RATE LIMITS
# --------------------------------------------------

def test_verify_email_rate_limit(client, app):
    with app.app_context():
        create_user(
            email="verify-limit@example.test",
            verification_code="12345",
            code_expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

    payload = {
        "email": "verify-limit@example.test",
        "code": "99999",
    }

    for _ in range(5):
        response = client.post("/api/auth/verify-email", json=payload)
        assert response.status_code == 400

    response = client.post("/api/auth/verify-email", json=payload)

    assert response.status_code == 429
    assert response.json["error"]["code"] == "rate_limited"
    assert int(response.headers["Retry-After"]) > 0


def test_login_rate_limit(client, app):
    with app.app_context():
        create_user(
            email="login-limit@example.test",
            password="CorrectPass123",
            verified=True,
        )

    payload = {
        "email": "login-limit@example.test",
        "password": "WrongPassword123",
    }

    for _ in range(10):
        response = client.post("/api/auth/login", json=payload)
        assert response.status_code == 401

    response = client.post("/api/auth/login", json=payload)

    assert response.status_code == 429
    assert response.json["error"]["code"] == "rate_limited"


def test_forgot_password_rate_limit(client):
    payload = {"email": "unknown-limit@example.test"}

    for _ in range(3):
        response = client.post("/api/auth/forgot-password", json=payload)
        assert response.status_code == 200
        assert "If an account exists" in response.json["data"]["message"]

    response = client.post("/api/auth/forgot-password", json=payload)

    assert response.status_code == 429
    assert response.json["error"]["code"] == "rate_limited"


def test_verify_reset_code_rate_limit(client):
    payload = {
        "email": "reset-limit@example.test",
        "code": "99999",
    }

    for _ in range(5):
        response = client.post("/api/auth/verify-reset-code", json=payload)
        assert response.status_code == 400

    response = client.post("/api/auth/verify-reset-code", json=payload)

    assert response.status_code == 429
    assert response.json["error"]["code"] == "rate_limited"


def test_reset_code_limit_is_shared_between_verification_and_submission(client):
    email = "shared-reset-limit@example.test"

    for _ in range(5):
        response = client.post("/api/auth/verify-reset-code", json={
            "email": email,
            "code": "99999",
        })
        assert response.status_code == 400

    response = client.post("/api/auth/reset-password", json={
        "email": email,
        "code": "99999",
        "new_password": "NewPassword123",
        "confirm_password": "NewPassword123",
    })

    assert response.status_code == 429
    assert response.json["error"]["code"] == "rate_limited"


def test_rate_limit_database_failure_fails_closed(client, monkeypatch):
    def database_failure(*args, **kwargs):
        raise auth_routes.RateLimitBackendError("Simulated database failure")

    monkeypatch.setattr(auth_routes, "check_rate_limit", database_failure)

    response = client.post("/api/auth/verify-email", json={
        "email": "backend-failure@example.test",
        "code": "12345",
    })

    assert response.status_code == 503
    assert response.json["error"]["code"] == "rate_limit_unavailable"
