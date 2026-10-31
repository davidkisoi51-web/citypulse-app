from datetime import datetime, timedelta, timezone

from extensions import db
from models import AuthRateLimit
from services.auth_rate_limiter import check_rate_limit


def test_allows_attempts_up_to_limit(client):
    for _ in range(5):
        allowed, retry_after = check_rate_limit(
            "verify_email", " Person@Example.com ", 5, 600
        )
        assert allowed is True
        assert retry_after == 0

    allowed, retry_after = check_rate_limit(
        "verify_email", "person@example.com", 5, 600
    )
    assert allowed is False
    assert retry_after > 0


def test_email_is_normalized_for_same_counter(client):
    check_rate_limit("login", " PERSON@example.com ", 10, 900)
    check_rate_limit("login", "person@example.com", 10, 900)

    rows = AuthRateLimit.query.filter_by(scope="login").all()
    assert len(rows) == 1
    assert rows[0].attempts == 2


def test_different_scopes_have_separate_counters(client):
    check_rate_limit("verify_reset_code", "person@example.com", 5, 600)
    check_rate_limit("forgot_password", "person@example.com", 3, 3600)

    rows = AuthRateLimit.query.filter(
        AuthRateLimit.scope.in_([
            "verify_reset_code",
            "forgot_password",
        ])
    ).all()

    assert len(rows) == 2
    assert {row.scope for row in rows} == {
        "verify_reset_code",
        "forgot_password",
    }


def test_expired_window_resets_counter(client):
    check_rate_limit("login", "person@example.com", 10, 900)

    row = AuthRateLimit.query.filter_by(scope="login").one()
    row.window_started_at = datetime.now(timezone.utc) - timedelta(minutes=20)
    row.attempts = 10
    db.session.commit()

    allowed, retry_after = check_rate_limit(
        "login", "person@example.com", 10, 900
    )

    db.session.refresh(row)
    assert allowed is True
    assert retry_after == 0
    assert row.attempts == 1

def test_raw_email_is_not_stored(client):
    email = "private.person@example.com"
    check_rate_limit("login", email, 10, 900)

    row = AuthRateLimit.query.filter_by(scope="login").one()
    assert email not in row.key_hash
    assert len(row.key_hash) == 64
