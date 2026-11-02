"""Registration and JWT login endpoints."""
import secrets
from datetime import timedelta, datetime, timezone

from flask import Blueprint, current_app, g, jsonify, request
from services.auth_rate_limiter import check_rate_limit, RateLimitBackendError
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

import datetime

from extensions import db
from models import User, Tickets, Transfer
from sqlalchemy.exc import SQLAlchemyError
from auth import require_user

from services.email_service import send_welcome_email
from services.roles import is_admin
auth_bp = Blueprint("auth", __name__)

def public_user(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "isAdmin": is_admin(user.email),
    }


def _session(user):
    """What register and login return: the user and a login token."""
    return {
        "user": public_user(user),
        "token": create_access_token(identity=str(user.id), expires_delta=timedelta(hours=1)),
    }


def generate_code():
    """Generate a cryptographically secure five-digit code."""
    return str(secrets.randbelow(90000) + 10000)


def code_is_expired(expires_at):
    """Treat missing expiry timestamps as expired."""
    if expires_at is None:
        return True
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return datetime.datetime.now(timezone.utc) >= expires_at


def enforce_rate_limit(scope, email, max_attempts, window_seconds):
    """Return a response when limited or when the database cannot enforce limits."""
    try:
        allowed, retry_after = check_rate_limit(
            scope, email, max_attempts, window_seconds
        )
    except RateLimitBackendError:
        return jsonify(error={
            "code": "rate_limit_unavailable",
            "message": "Authentication is temporarily unavailable. Please try again."
        }), 503

    if not allowed:
        response = jsonify(error={
            "code": "rate_limited",
            "message": "Too many attempts. Please try again later.",
            "retry_after": retry_after,
        })
        response.headers["Retry-After"] = str(retry_after)
        return response, 429

    return None


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = {}
    name = data.get("name", "").strip() if isinstance(data.get("name"), str) else ""
    email = data.get("email", "").strip().lower() if isinstance(data.get("email"), str) else ""
    password = data.get("password")
    if not name or not email or not isinstance(password, str) or len(password) < 8:
        return jsonify(error={"code": "validation_error", "message": "Name, email, and a password of at least 8 characters are required."}), 422
    if User.query.filter(User.email == email).first():
        return jsonify(error={
            "code": "account_exists",
            "message": "An account with that email already exists. Please login."
        }), 409
    # No email verification: the account is ready straight away and the user is logged in.
    user = User(name=name, email=email, password_hash="")
    user.set_password(password)
    user.is_verified = True
    db.session.add(user)
    db.session.commit()
    try:
        if not send_welcome_email(email, name):
            current_app.logger.warning("Welcome email delivery failed for user id %s", user.id)
    except Exception:
        current_app.logger.exception("Welcome email delivery failed for user id %s", user.id)
    return jsonify(data=_session(user)), 201


@auth_bp.post("/login") 
def login():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = {}
    email = data.get("email", "").strip().lower() if isinstance(data.get("email"), str) else ""
    password = data.get("password")

    if not email or not isinstance(password, str):
        return jsonify(error={
            "code": "validation_error",
            "message": "Email and password are required."
        }), 422

    user = User.query.filter_by(email=email).first()

    if user is None or not user.password_check(password):
        limited = enforce_rate_limit("login", email, 10, 900)
        if limited is not None:
            return limited

        return jsonify(error={
            "code": "unauthorized",
            "message": "Invalid email or password."
        }), 401

    return jsonify(data=_session(user)), 200


@auth_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = {}

    raw_email = data.get("email")
    email = raw_email.strip().lower() if isinstance(raw_email, str) else ""

    if not email:
        return jsonify(error={
            "code": "validation_error",
            "message": "Email is required."
        }), 422

    limited = enforce_rate_limit("forgot_password", email, 3, 3600)
    if limited is not None:
        return limited

    user = User.query.filter_by(email=email).first()

    # Use the same response whether or not the account exists.
    if user is not None:
        code = generate_code()
        user.reset_code = code
        user.reset_expires_at = datetime.datetime.now(timezone.utc) + timedelta(minutes=5)
        db.session.commit()

        try:
            from services.email_service import send_password_reset_email
            name = getattr(user, "name", None) or "there"
            sent = send_password_reset_email(user.email, code, name=name)
            if not sent:
                print(f"[PASSWORD RESET] Email delivery failed for {email}")
        except Exception as e:
            print(f"[PASSWORD RESET] Email error: {e}")

    return jsonify(data={
        "message": "If an account exists for that email, a reset code has been sent."
    }), 200

@auth_bp.post("/verify-reset-code")
def verify_reset_code():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = {}

    raw_email = data.get("email")
    raw_code = data.get("code")
    email = raw_email.strip().lower() if isinstance(raw_email, str) else ""
    code = raw_code.strip() if isinstance(raw_code, str) else ""

    if not email or not code:
        return jsonify(error={
            "code": "validation_error",
            "message": "Email and reset code are required."
        }), 422

    limited = enforce_rate_limit("reset_code", email, 5, 600)
    if limited is not None:
        return limited

    user = User.query.filter_by(email=email).first()

    if user is None or user.reset_code != code:
        return jsonify(error={
            "code": "invalid_code",
            "message": "Invalid reset code."
        }), 400

    if code_is_expired(user.reset_expires_at):
        return jsonify(error={
            "code": "expired_code",
            "message": "Reset code has expired. Request a new one."
        }), 400

    return jsonify(data={"message": "Code verified."}), 200

@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = {}

    raw_email = data.get("email")
    raw_code = data.get("code")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    email = raw_email.strip().lower() if isinstance(raw_email, str) else ""
    code = raw_code.strip() if isinstance(raw_code, str) else ""

    if not email or not code:
        return jsonify(error={
            "code": "validation_error",
            "message": "Email and reset code are required."
        }), 400

    if not isinstance(new_password, str) or len(new_password) < 8:
        return jsonify(error={
            "code": "validation_error",
            "message": "Password must be at least 8 characters long."
        }), 400

    if not isinstance(confirm_password, str) or new_password != confirm_password:
        return jsonify(error={
            "code": "validation_error",
            "message": "Passwords do not match."
        }), 400

    limited = enforce_rate_limit("reset_code", email, 5, 600)
    if limited is not None:
        return limited

    user = User.query.filter_by(email=email).first()

    if user is None or user.reset_code != code:
        return jsonify(error={
            "code": "invalid_code",
            "message": "Invalid reset code."
        }), 400

    if code_is_expired(user.reset_expires_at):
        return jsonify(error={
            "code": "expired_code",
            "message": "Reset code has expired. Request a new one."
        }), 400

    user.set_password(new_password)

    # Consume the code so it cannot be reused.
    user.reset_code = None
    user.reset_expires_at = None
    db.session.commit()

    try:
        from services.email_service import send_password_changed_email
        name = getattr(user, "name", None) or "there"
        sent = send_password_changed_email(user.email, name)
        if not sent:
            print(f"[PASSWORD CHANGED] Notification email failed for {email}")
    except Exception as e:
        print(f"[PASSWORD CHANGED] Notification email error: {e}")

    return jsonify(data={
        "message": "Password reset successfully. Please log in."
    }), 200


@auth_bp.post("/transfer")
@require_user
def transfer_tickets():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error={"code": "validation_error", "message": "A JSON object is required."}), 400
    transferee_email = data.get("email")
    ticket_id = data.get("ticketId")
    if not isinstance(transferee_email, str) or not transferee_email.strip():
        return jsonify(error={"code": "validation_error", "message": "Recipient email is required."}), 422
    if isinstance(ticket_id, bool) or not isinstance(ticket_id, int) or ticket_id < 1:
        return jsonify(error={"code": "validation_error", "message": "A valid ticket purchase is required."}), 422

    sender = g.current_user
    recipient = User.query.filter_by(email=transferee_email.strip().lower()).first()
    if recipient is None:
        return jsonify(error={"code": "recipient_not_found", "message": "No account exists for that email."}), 404
    if recipient.id == sender.id:
        return jsonify(error={"code": "invalid_recipient", "message": "You cannot transfer a ticket to yourself."}), 422
    ticket = Tickets.query.filter_by(id=ticket_id, user_id=sender.id).first()
    if ticket is None:
        return jsonify(error={"code": "not_found", "message": "Ticket purchase not found."}), 404
    if not ticket.transferable:
        return jsonify(error={"code": "not_transferable", "message": "This ticket purchase cannot be transferred."}), 409

    transfer = Transfer(
        user_email=sender.email,
        transferee_email=recipient.email,
        ticket=str(ticket.id),
    )
    ticket.user_id = recipient.id
    db.session.add(transfer)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("Ticket transfer failed")
        return jsonify(error={"code": "transfer_failed", "message": "Ticket transfer failed. Please try again."}), 500
    return jsonify(data={
        "ticketId": ticket.id,
        "eventName": ticket.event_name,
        "transfereeEmail": recipient.email,
    }), 200


@auth_bp.post("/tickets")
@require_user
def create_ticket():
    from services.purchases import create_purchase, PurchaseValidationError

    try:
        ticket = create_purchase(request.get_json(silent=True), g.current_user.id)
    except PurchaseValidationError as exc:
        return jsonify(error={"code": exc.code, "message": str(exc)}), exc.status_code
    except SQLAlchemyError:
        current_app.logger.exception("Purchase could not be saved")
        return jsonify(error={
            "code": "purchase_save_failed",
            "message": "Your purchase could not be saved. Please try again.",
        }), 500
    return jsonify(data=ticket.purchase_dict()), 201


@auth_bp.get("/me")
@jwt_required()
def current_user_verification():
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return jsonify(error={"code": "unauthorized", "message": "Invalid token identity."}), 401
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error={"code": "unauthorized", "message": "User no longer exists."}), 401
    return jsonify(data={"user": public_user(user)}), 200
