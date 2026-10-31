"""Database-backed rate limiting for authentication endpoints."""

import hashlib
import hmac
import math
from datetime import datetime, timedelta, timezone

from flask import current_app
from sqlalchemy import case
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from extensions import db
from models import AuthRateLimit


class RateLimitBackendError(RuntimeError):
    """Raised when the database cannot enforce a rate limit safely."""


def _normalize_email(email):
    if not isinstance(email, str):
        raise ValueError("A valid account identifier is required.")
    normalized = email.strip().lower()
    if not normalized:
        raise ValueError("A valid account identifier is required.")
    return normalized


def _key_hash(email):
    secret = current_app.config.get("SECRET_KEY")
    if not isinstance(secret, str) or not secret:
        raise RateLimitBackendError("Application SECRET_KEY is unavailable.")

    return hmac.new(
        secret.encode("utf-8"),
        _normalize_email(email).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def check_rate_limit(scope, email, max_attempts, window_seconds):
    """
    Atomically record one attempt.

    Returns (allowed, retry_after_seconds). Counters are committed
    independently so failed authentication attempts are still recorded.
    """
    if not isinstance(scope, str) or not scope or len(scope) > 40:
        raise ValueError("Invalid rate-limit scope.")
    if max_attempts < 1 or window_seconds < 1:
        raise ValueError("Rate-limit values must be positive.")

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=window_seconds)
    digest = _key_hash(email)
    table = AuthRateLimit.__table__

    try:
        dialect = db.engine.dialect.name

        if dialect == "postgresql":
            insert_statement = pg_insert(table)
        elif dialect == "sqlite":
            insert_statement = sqlite_insert(table)
        else:
            raise RuntimeError(
                f"Unsupported database dialect: {dialect}"
            )

        expired = table.c.window_started_at <= cutoff

        statement = insert_statement.values(
            scope=scope,
            key_hash=digest,
            window_started_at=now,
            attempts=1,
            updated_at=now,
        ).on_conflict_do_update(
            index_elements=[table.c.scope, table.c.key_hash],
            set_={
                "window_started_at": case(
                    (expired, now),
                    else_=table.c.window_started_at,
                ),
                "attempts": case(
                    (expired, 1),
                    else_=table.c.attempts + 1,
                ),
                "updated_at": now,
            },
        ).returning(
            table.c.attempts,
            table.c.window_started_at,
        )

        row = db.session.execute(statement).one()
        db.session.commit()

    except Exception as exc:
        db.session.rollback()
        raise RateLimitBackendError(
            "The database could not record the authentication attempt."
        ) from exc

    attempts = row.attempts
    window_started_at = row.window_started_at

    if window_started_at.tzinfo is None:
        window_started_at = window_started_at.replace(tzinfo=timezone.utc)

    allowed = attempts <= max_attempts

    if allowed:
        return True, 0

    retry_at = window_started_at + timedelta(seconds=window_seconds)
    retry_after = max(1, math.ceil((retry_at - now).total_seconds()))

    return False, retry_after
