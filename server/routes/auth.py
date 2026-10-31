"""Registration and JWT login endpoints."""
import secrets
from datetime import timedelta, datetime, timezone

from flask import Blueprint, jsonify, request
from services.auth_rate_limiter import check_rate_limit, RateLimitBackendError
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from auth import require_user
import datetime

from extensions import db
from models import User, Tickets, TicketsSchema

from services.email_service import send_verification_email, send_welcome_email
auth_bp = Blueprint("auth", __name__)

def public_user(user):
    return {"id": user.id, "name": user.name, "email": user.email}


def generate_code():
    """Generate a cryptographically secure five-digit code."""
    return str(secrets.randbelow(90000) + 10000)


def code_is_expired(expires_at):
    """Treat missing expiry timestamps as expired."""
    if expires_at is None:
        return True
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) >= expires_at


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
    code = generate_code()
    user = User(name=name, email=email, password_hash="")
    user.set_password(password)
    user.verification_code = code
    user.code_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    user.is_verified = False
    db.session.add(user)
    db.session.commit()
    try:
        sent = send_verification_email(email, code, email.split('@')[0])
        if not sent:
            print(f"[VERIFICATION EMAIL] Delivery failed for {email}")
    except Exception as e:
        print(f"[VERIFICATION EMAIL] Delivery error for {email}: {e}")
    return jsonify(data={
        "message": "Verification code sent to email", 
        "need_verification": True,
        "email": email
    }), 201

@auth_bp.post("/verify-email")
def verify_email():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = {}
    email = data.get("email", "").strip().lower() if isinstance(data.get("email"), str) else ""
    code = data.get("code", "").strip() if isinstance(data.get("code"), str) else ""
    
    if not email or not code:
        return jsonify(error={"code": "validation_error", "message": "Email and verification code are required."}), 422

    limited = enforce_rate_limit("verify_email", email, 5, 600)
    if limited is not None:
        return limited

    user = User.query.filter_by(email=email).first()
    if user is None:
        return jsonify(error={"code": "not_found", "message": "User not found."}), 404
    if user.is_verified:
        return jsonify(error={"message": "Account already verified. please log in"}), 400
    if user.verification_code != code:
        return jsonify(error={"code": "invalid_code", "message": "Invalid verification code."}), 400
    if code_is_expired(user.code_expires_at):
        return jsonify(error={"code": "expired_code", "message": "Verification code has expired, Register again."}), 400
    user.is_verified = True
    user.verification_code = None
    user.code_expires_at = None
    db.session.commit()
    try:
        name = getattr(user, 'name', None) or getattr(user, 'username', 'there')
        sent = send_welcome_email(user.email, name)
        if not sent:
            print(f"[WELCOME EMAIL] Delivery failed for {email}")
    except Exception as e:
        print(f"[WELCOME EMAIL] Delivery error for {email}: {e}")
    return jsonify(message="Email verified successfully"), 200

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

    if not user.is_verified:
        return jsonify(error={
            "code": "email_not_verified",
            "message": "Please verify your email before logging in."
        }), 403

    token = create_access_token(
        identity=str(user.id),
        expires_delta=timedelta(hours=1)
    )

    return jsonify(data={
        "user": public_user(user),
        "token": token
    }), 200

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
        user.reset_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
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

@auth_bp.get("/tickets")
def tickets(): 

    #authentication help!!
    user_id = 1
     
    retrieval = db.session.scalars(db.select(Tickets).where(Tickets.user_id == user_id))

    output = {"data": [each.dict() for each in retrieval]}

    if output["data"] == [] : 
            return {"msg": "No Tickets available for this user, *Back to Events*"}
        
    return jsonify(output)

#make a route for the tranfer tickets to change user_id for a specific ticket (by the ticket_id), 
# to the given user's (given by email), search user_email and add ticket to their data row.
@auth_bp.post("/tickets/transfer")
def transfer_tickets():
    data = request.get_json() or {}
    

@auth_bp.post("/tickets")
#@jwt_required()
def create_ticket():
    #not sure how to configure to get the user identity without causing a 422
    user_identity = 1
    data = request.get_json() or {}
    event_id = data.get("eventId")
    event_name = data["eventName"]
    event_date = data["eventDate"]
    event_time = data.get("eventTime")
    event_venue = data["eventVenue"]
    event_city = data["eventCity"]
    ticket_type = data["ticketType"]
    quantity = data["quantity"]
    unit_price = data["unitPrice"]
    transferable = True

    if not event_id or not isinstance(event_time,str):
        return {"key_error_msg": "please include event_id and/or event_time"}

    ticket = Tickets(user_id = user_identity, event_id = event_id, paid_at = datetime.datetime.now(), event_name = event_name, event_date = event_date, event_time = event_time, event_venue = event_venue ,event_city = event_city, ticket_type = ticket_type, price = unit_price, no_of_tickets = quantity, transferable = transferable)
    db.session.add(ticket)
    db.session.commit()

    new_ticket = TicketsSchema().dump(ticket)

    output = {
        "msg": new_ticket
    }
    return jsonify(output)


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
