"""Registration and JWT login endpoints."""
import random
from datetime import timedelta, datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from auth import require_user
import datetime

from extensions import db
from models import User, Tickets, TicketsSchema
from services.email_service import send_verification_email, send_welcome_email
auth_bp = Blueprint("auth", __name__)

def public_user(user):
    return {"id": user.id, "name": user.name, "email": user.email}

def send_fake_email(to, code):
    print("\n" + "=" * 40)
    print(f"Sending fake email to {to}")
    print(f"Your verification code is: {code}")
    print("=" * 40 + "\n")

@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip() if isinstance(data.get("name"), str) else ""
    email = data.get("email", "").strip().lower() if isinstance(data.get("email"), str) else ""
    password = data.get("password")
    if not name or not email or not isinstance(password, str) or len(password) < 8:
        return jsonify(error={"code": "validation_error", "message": "Name, email, and a password of at least 8 characters are required."}), 422
    if User.query.filter(User.email == email).first():
        return jsonify(error={"message": "An account with that email already exists. Please login."})
    code = str(random.randint(10000, 99999))
    user = User(name=name, email=email, password_hash="")
    user.set_password(password)
    user.verification_code = code
    user.code_expires_at = datetime.utcnow() + timedelta(minutes=5)
    user.is_verified = False
    db.session.add(user)
    db.session.commit()
    send_fake_email(email, code)
    try:
        send_verification_email(email, code, email.split('@')[0])
    except Exception as e:
        print(f"(real service skipped: {e})")
    return jsonify(data={
        "message": "Verification code sent to email", 
        "need_verification": True,
        "email": email
    }), 201

@auth_bp.post("/verify-email")
def verify_email():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower() 
    code = data.get("code", "").strip()
    
    if not email or not code:
        return jsonify(error={"code": "validation_error", "message": "Email and verification code are required."}), 422
    user = User.query.filter_by(email=email).first()
    if user is None:
        return jsonify(error={"code": "not_found", "message": "User not found."}), 404
    if user.is_verified:
        return jsonify(error={"message": "Account already verified. please log in"}), 400
    if user.verification_code != code:
        return jsonify(error={"code": "invalid_code", "message": "Invalid verification code."}), 400
    if user.code_expires_at and datetime.utcnow() > user.code_expires_at:
        return jsonify(error={"code": "expired_code", "message": "Verification code has expired, Register again."}), 400
    user.is_verified = True
    user.verification_code = None
    user.code_expires_at = None
    db.session.commit()
    try:
        name = getattr(user, 'name', None) or getattr(user, 'username', 'there')
        send_welcome_email(user.email, name)
    except Exception as e:
        print(f"([WELCOME EMAIL] To: {email} (fallback print, real failed: {e})")
    return jsonify(message="Email verified successfully"), 200

@auth_bp.post("/login") 
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower() if isinstance(data.get("email"), str) else ""
    password = data.get("password")
    if not email or not isinstance(password, str):
        return jsonify(error={"code": "validation_error", "message": "Email and password are required."}), 400
    user = User.query.filter_by(email=email).first()
    if user is None or not user.password_check(password):
        return jsonify(error={"code": "unauthorized", "message": "Invalid email or password."}), 401
    token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=3))
    return jsonify(data={"user": public_user(user), "token": token}), 200

@auth_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower() 
    user = User.query.filter_by(email=email).first()
    if not email:
        return jsonify(error={"code": "validation_error", "message": "Email is required."}), 400
    user = User.query.filter_by(email=email).first()
    if user is None:
        return jsonify(error={"code": "not_found", "message": "User not found."}), 404
    code = str(random.randint(10000, 99999))
    user.reset_code = code
    user.reset_expires_at = datetime.utcnow() + timedelta(minutes=5)
    db.session.commit()
    try:
        from services.email_service import send_password_reset_email
        name = getattr(user, 'name', None) or getattr(user, 'username', 'there')
        send_password_reset_email(user.email, code, name=name)
    except Exception as e:
       print(f"(reset email failed: {e})")
    send_fake_email(email, code)
    return jsonify(data={"message": "Reset code sent to email"}), 200

@auth_bp.post("/verify-reset-code")
def verify_reset_code():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    code = data.get("code", "").strip()
    user = User.query.filter_by(email=email).first()
    if not user or user.reset_code != code:
        return jsonify(error={"code": "invalid_code", "message": "Invalid reset code."}), 400
    if user.reset_expires_at and datetime.utcnow() > user.reset_expires_at:
        return jsonify(error={"code": "expired_code", "message": "Reset code has expired."}), 400
    return jsonify(data={"message": "Code Verified."}), 200

@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower() 
    new_password = data.get("new_password", "")
    confirm_password = data.get("confirm_password", "")
    if len(new_password) < 8:
        return jsonify(error={"code": "validation_error", "message": "Password must be at least have 8 characters."}), 400
    if not new_password or new_password != confirm_password:
        return jsonify(error={"code": "validation_error", "message": "Passwords do not match."}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(error={"code": "not_found", "message": "User not found."}), 404
    user.set_password(new_password)
    user.reset_code = None
    user.reset_expires_at = None
    db.session.commit()
    try:
        from services.email_service import send_password_changed_email
        name = getattr(user, 'name', None) or getattr(user, 'username', 'there')
        send_password_changed_email(user.email, name)
    except Exception as e:
        print(f"(password changed email failed: {e})")
    return jsonify(data={"message": "Password reset successfully, login now."}), 200

@auth_bp.get("/tickets")
@jwt_required
def tickets(user_id): 
    user_id = int(get_jwt_identity())
     
    retrieval = db.session.scalars(db.select(Tickets).where(Tickets.user_id == user_id))

    output = {"data": [each.dict() for each in retrieval]}

    if output["data"] == [] : 
            return {"msg": "No Tickets available for this user, *Back to Events*"}
        
    return jsonify(output)


@auth_bp.post("/tickets")
@jwt_required()
def create_ticket():
    user_identity = int(get_jwt_identity())

    data = request.get_json() or {}
    event_id = data.get("eventID")
    event_name = data["eventName"]
    event_date = data["eventDate"]
    event_time = data.get("eventTime")
    event_venue = data["eventVenue"]
    event_city = data["eventCity"]
    ticket_type = data["ticketType"]
    quantity = data["quantity"]
    unit_price = data["unitPrice"]
    paidAt = data["paidAt"]
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
