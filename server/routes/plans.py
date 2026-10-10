from datetime import date
from flask import Blueprint, g, jsonify, request
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from auth import require_user
from extensions import db
from models import Plan, SavedEvent

plans_bp = Blueprint("plans", __name__)


def error(code, message, status):
    return jsonify(error={"code": code, "message": message}), status


def parse_plan_date(value):
    if value in (None, ""):
        return None
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValueError("plan_date must use YYYY-MM-DD format")


@plans_bp.get("")
@plans_bp.get("/")
@require_user
def list_plans():
    plans = Plan.query.filter_by(user_id=g.current_user.id).order_by(Plan.created_at.desc()).all()
    return jsonify(data=[plan.to_dict() for plan in plans]), 200


@plans_bp.post("")
@plans_bp.post("/")
@require_user
def create_plan():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return error("invalid_json", "A JSON object is required", 400)
    title = body.get("title")
    if not isinstance(title, str) or not title.strip():
        return error("validation_error", "title is required", 422)
    if len(title.strip()) > 160:
        return error("validation_error", "title must be 160 characters or fewer", 422)
    try:
        plan_date = parse_plan_date(body.get("plan_date"))
    except ValueError as exc:
        return error("validation_error", str(exc), 422)

    plan = Plan(user_id=g.current_user.id, title=title.strip(),
                description=body.get("description"), plan_date=plan_date,
                city=body.get("city"))
    db.session.add(plan)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Could not create plan", 500)
    return jsonify(data=plan.to_dict()), 201


@plans_bp.get("/<int:plan_id>")
@require_user
def get_plan(plan_id):
    plan = Plan.query.filter_by(id=plan_id, user_id=g.current_user.id).first()
    if plan is None:
        return error("not_found", "Plan not found", 404)
    return jsonify(data=plan.to_dict(include_events=True)), 200


@plans_bp.patch("/<int:plan_id>")
@require_user
def update_plan(plan_id):
    plan = Plan.query.filter_by(id=plan_id, user_id=g.current_user.id).first()
    if plan is None:
        return error("not_found", "Plan not found", 404)
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return error("invalid_json", "A JSON object is required", 400)
    if "title" in body:
        if not isinstance(body["title"], str) or not body["title"].strip():
            return error("validation_error", "title cannot be empty", 422)
        plan.title = body["title"].strip()
    if "description" in body: plan.description = body["description"]
    if "city" in body: plan.city = body["city"]
    if "plan_date" in body:
        try: plan.plan_date = parse_plan_date(body["plan_date"])
        except ValueError as exc: return error("validation_error", str(exc), 422)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Could not update plan", 500)
    return jsonify(data=plan.to_dict()), 200


@plans_bp.delete("/<int:plan_id>")
@require_user
def delete_plan(plan_id):
    plan = Plan.query.filter_by(id=plan_id, user_id=g.current_user.id).first()
    if plan is None:
        return error("not_found", "Plan not found", 404)
    db.session.delete(plan)
    try: db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Could not delete plan", 500)
    return "", 204


@plans_bp.get("/<int:plan_id>/events")
@require_user
def list_saved_events(plan_id):
    plan = Plan.query.filter_by(id=plan_id, user_id=g.current_user.id).first()
    if plan is None: return error("not_found", "Plan not found", 404)
    return jsonify(data=[event.to_dict() for event in plan.saved_events]), 200


@plans_bp.post("/<int:plan_id>/events")
@require_user
def save_event(plan_id):
    plan = Plan.query.filter_by(id=plan_id, user_id=g.current_user.id).first()
    if plan is None: return error("not_found", "Plan not found", 404)
    body = request.get_json(silent=True)
    if not isinstance(body, dict): return error("invalid_json", "A JSON object is required", 400)
    ticketmaster_id, name = body.get("ticketmaster_id"), body.get("name")
    if not isinstance(ticketmaster_id, str) or not ticketmaster_id.strip() or not isinstance(name, str) or not name.strip():
        return error("validation_error", "ticketmaster_id and name are required", 422)
    status = body.get("status", "interested")
    if status not in ("interested", "going"):
        return error("validation_error", "status must be interested or going", 422)
    event = SavedEvent(plan_id=plan.id, ticketmaster_id=ticketmaster_id.strip(), name=name.strip(),
        url=body.get("url"), image=body.get("image"), date=body.get("date"), time=body.get("time"),
        venue=body.get("venue"), city=body.get("city"), category=body.get("category"),
        price_min=body.get("price_min"), price_max=body.get("price_max"), currency=body.get("currency"),
        note=body.get("note"), status=status)
    db.session.add(event)
    try: db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error("duplicate_event", "This event is already saved in this plan", 409)
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Could not save event", 500)
    return jsonify(data=event.to_dict()), 201


@plans_bp.patch("/<int:plan_id>/events/<int:event_id>")
@require_user
def update_saved_event(plan_id, event_id):
    plan = Plan.query.filter_by(id=plan_id, user_id=g.current_user.id).first()
    if plan is None: return error("not_found", "Plan not found", 404)
    event = SavedEvent.query.filter_by(id=event_id, plan_id=plan.id).first()
    if event is None: return error("not_found", "Saved event not found", 404)
    body = request.get_json(silent=True)
    if not isinstance(body, dict): return error("invalid_json", "A JSON object is required", 400)
    if "note" in body:
        if body["note"] is not None and not isinstance(body["note"], str):
            return error("validation_error", "note must be a string or null", 422)
        event.note = body["note"]
    if "status" in body:
        if body["status"] not in ("interested", "going"):
            return error("validation_error", "status must be interested or going", 422)
        event.status = body["status"]
    try: db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Could not update saved event", 500)
    return jsonify(data=event.to_dict()), 200


@plans_bp.delete("/<int:plan_id>/events/<int:event_id>")
@require_user
def delete_saved_event(plan_id, event_id):
    plan = Plan.query.filter_by(id=plan_id, user_id=g.current_user.id).first()
    if plan is None: return error("not_found", "Plan not found", 404)
    event = SavedEvent.query.filter_by(id=event_id, plan_id=plan.id).first()
    if event is None: return error("not_found", "Saved event not found", 404)
    db.session.delete(event)
    try: db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Could not delete saved event", 500)
    return "", 204
