"""Registration and JWT login endpoints."""
from datetime import timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from auth import require_user
import datetime

from extensions import db
from models import User, Tickets, TicketsSchema

auth_bp = Blueprint("auth", __name__)


def public_user(user):
    return {"id": user.id, "name": user.name, "email": user.email}


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip() if isinstance(data.get("name"), str) else ""
    email = data.get("email", "").strip().lower() if isinstance(data.get("email"), str) else ""
    password = data.get("password")
    if not name or not email or not isinstance(password, str) or len(password) < 8:
        return jsonify(error={"code": "validation_error", "message": "Name, email, and a password of at least 8 characters are required."}), 422
    if User.query.filter((User.email == email) | (User.name == name)).first():
        return jsonify(error={"code": "account_exists", "message": "An account with that email or name already exists."}), 409
    user = User(name=name, email=email, password_hash="")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=3))
    return jsonify(data={"user": public_user(user), "token": token}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower() if isinstance(data.get("email"), str) else ""
    password = data.get("password")
    if not email or not isinstance(password, str):
        return jsonify(error={"code": "validation_error", "message": "Email and password are required."}), 422
    user = User.query.filter_by(email=email).first()
    if user is None or not user.password_check(password):
        return jsonify(error={"code": "unauthorized", "message": "Invalid email or password."}), 401
    token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=3))
    return jsonify(data={"user": public_user(user), "token": token}), 200

@auth_bp.get("/tickets/<int:user_id>")
def tickets(user_id): 
    #specify user_id is the logged in user when working on front end
    #when they sleect multiple tickets, makje sure it shows the amount of tickets
     
    retrieval = db.session.scalars(db.select(Tickets).where(Tickets.user_id == user_id))

    output = {"data": [each.dict() for each in retrieval]}

    if output["data"] == [] : 
            return {"msg": "No Tickets available for this user, *Back to Events*"}
        
    return jsonify(output)

@auth_bp.post("/tickets")
#@require_user
def create_ticket():
    data = request.get_json() or {}
    event_id = data["eventID"]
    event_name = data["eventName"]
    event_date = data["eventDate"]
    event_time = data['eventTime']
    event_venue = data["eventVenue"]
    event_city = data["eventCity"]
    ticket_type = data["ticketType"]
    quantity = data["quantity"]
    unit_price = data["unitPrice"]
    paidAt = data["paidAt"]
    transferable = True

    #need to reference user_id from the auth
    ticket = Tickets(user_id = "", event_id = event_id, paid_at = datetime.datetime.now(), event_name = event_name, event_date = event_date, event_time = event_time, event_venue = event_venue ,event_city = event_city, ticket_type = ticket_type, price = unit_price, no_of_tickets = quantity, transferable = transferable)
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
