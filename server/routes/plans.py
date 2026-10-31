"""Authenticated plan and saved-event API routes."""
from datetime import date, timedelta

from flask import Blueprint, g, jsonify, request
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from auth import require_user
from extensions import db
from models import Plan, SavedEvent, ReminderPreference

plans_bp = Blueprint("plans", __name__)
EVENT_STATUSES = {"interested", "going"}
PLAN_STATUSES = {"saved", "planning", "completed", "cancelled"}
ALLOWED_REMINDER_FREQUENCIES = {"60", "120", "1440", "2880"}

def error(code, message, status):
    return jsonify(error={"code": code, "message": message}), status


def parse_date(value, field_name="event_date"):
    if value in (None, ""):
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must use YYYY-MM-DD format")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{field_name} must use YYYY-MM-DD format") from exc


def get_owned_plan(plan_id):
    plan = Plan.query.filter_by(id=plan_id, user_id=g.current_user.id).first()
    if plan is None:
        return None, error("not_found", "Plan not found", 404)
    return plan, None


def get_owned_event(event_id):
    return (
        SavedEvent.query.join(Plan, SavedEvent.plan_id == Plan.id)
        .filter(SavedEvent.id == event_id, Plan.user_id == g.current_user.id)
        .first()
    )


def event_payload(payload, event=None):
    """Validate and apply only fields explicitly supplied in the request."""
    if not isinstance(payload, dict):
        raise ValueError("A JSON object is required")
    required = {"ticketmaster_id", "name"}
    if event is None:
        missing = [key for key in required if not isinstance(payload.get(key), str) or not payload[key].strip()]
        if missing:
            raise ValueError("ticketmaster_id and name are required")

    string_fields = {
        "ticketmaster_id": 120, "name": 255, "url": None, "image": None,
        "date": 80, "time": 80, "venue": 255, "city": 120,
        "category": 120, "currency": 8, "note": None,
    }
    for field, max_length in string_fields.items():
        if field not in payload:
            continue
        value = payload[field]
        if value is not None and not isinstance(value, str):
            raise ValueError(f"{field} must be a string or null")
        if max_length and isinstance(value, str) and len(value) > max_length:
            raise ValueError(f"{field} must be {max_length} characters or less")
        setattr(event, field, value.strip() if isinstance(value, str) else None)

    for field in ("price_min", "price_max"):
        if field in payload:
            value = payload[field]
            if value is None or value == "":
                setattr(event, field, None)
            elif isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0:
                raise ValueError(f"{field} must be a non-negative number or null")
            else:
                setattr(event, field, float(value))

    if "status" in payload:
        status = payload["status"]
        if status not in EVENT_STATUSES:
            raise ValueError("status must be 'interested' or 'going'")
        event.status = status
    return event


# Plans CRUD
@plans_bp.get("")
@plans_bp.get("/")
@require_user
def fetch_plans():
    plans = Plan.query.filter_by(user_id=g.current_user.id).order_by(Plan.created_at.desc()).all()
    return jsonify(data=[plan.serialize() for plan in plans]), 200


@plans_bp.post("")
@plans_bp.post("/")
@require_user
def add_plan():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error("invalid_json", "A JSON object is required", 400)
    title = payload.get("title")
    if not isinstance(title, str) or not title.strip():
        return error("validation_error", "title is required", 422)
    if len(title.strip()) > 160:
        return error("validation_error", "title must be 160 characters or less", 422)
    status = payload.get("status", "saved")
    if status not in PLAN_STATUSES:
        return error("validation_error", "Invalid plan status", 422)
    try:
        event_date = parse_date(payload.get("event_date"))
    except ValueError as exc:
        return error("validation_error", str(exc), 422)

    plan = Plan(
        user_id=g.current_user.id,
        title=title.strip(),
        description=str(payload.get("description") or "").strip() or None,
        event_date=event_date,
        city=str(payload.get("city") or "").strip() or None,
        is_public=payload.get("is_public", False) if isinstance(payload.get("is_public", False), bool) else False,
        status=status,
    )
    db.session.add(plan)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Failed to create plan", 500)
    return jsonify(data=plan.serialize()), 201


@plans_bp.get("/<int:plan_id>")
@require_user
def fetch_plan(plan_id):
    plan, failure = get_owned_plan(plan_id)
    if failure:
        return failure
    return jsonify(data=plan.serialize(include_events=True)), 200


@plans_bp.patch("/<int:plan_id>")
@require_user
def edit_plan(plan_id):
    plan, failure = get_owned_plan(plan_id)
    if failure:
        return failure
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error("invalid_json", "A JSON object is required", 400)
    if "title" in payload:
        title = payload["title"]
        if not isinstance(title, str) or not title.strip() or len(title.strip()) > 160:
            return error("validation_error", "title must contain 1–160 characters", 422)
        plan.title = title.strip()
    if "description" in payload:
        plan.description = str(payload["description"] or "").strip() or None
    if "city" in payload:
        plan.city = str(payload["city"] or "").strip() or None
    if "is_public" in payload:
        if not isinstance(payload["is_public"], bool):
            return error("validation_error", "is_public must be a boolean", 422)
        plan.is_public = payload["is_public"]
    if "event_date" in payload:
        try:
            plan.event_date = parse_date(payload["event_date"])
        except ValueError as exc:
            return error("validation_error", str(exc), 422)
    if "status" in payload:
        if payload["status"] not in PLAN_STATUSES:
            return error("validation_error", "Invalid plan status", 422)
        plan.status = payload["status"]
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Failed to update plan", 500)
    return jsonify(data=plan.serialize()), 200


@plans_bp.delete("/<int:plan_id>")
@require_user
def delete_plan(plan_id):
    plan, failure = get_owned_plan(plan_id)
    if failure:
        return failure
    db.session.delete(plan)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Failed to delete plan", 500)
    return "", 204


# Saved events
@plans_bp.get("/saved")
@require_user
def get_all_saved_events():
    query = SavedEvent.query.join(Plan, SavedEvent.plan_id == Plan.id).filter(Plan.user_id == g.current_user.id)
    status = request.args.get("status")
    if status:
        if status not in EVENT_STATUSES:
            return error("validation_error", "Invalid event status", 422)
        query = query.filter(SavedEvent.status == status)
    section = request.args.get("section", "all")
    today = date.today()
    events = query.order_by(SavedEvent.date.asc(), SavedEvent.id.asc()).all()
    if section in {"upcoming", "previous", "interested_soon"}:
        filtered = []
        for event in events:
            try:
                event_day = parse_date(event.date[:10] if event.date else None, "date")
            except ValueError:
                event_day = None
            if section == "upcoming" and event_day and event_day >= today:
                filtered.append(event)
            elif section == "previous" and event_day and event_day < today:
                filtered.append(event)
            elif section == "interested_soon" and event.status == "interested" and event_day and 0 <= (event_day - today).days <= 5:
                filtered.append(event)
        events = filtered
    elif section != "all":
        return error("validation_error", "Invalid section", 422)
    return jsonify(data=[event.serialize() for event in events]), 200


@plans_bp.get("/<int:plan_id>/events")
@require_user
def list_plan_events(plan_id):
    plan, failure = get_owned_plan(plan_id)
    if failure:
        return failure
    return jsonify([event.serialize() for event in plan.saved_events]), 200


@plans_bp.post("/<int:plan_id>/events")
@require_user
def add_saved_event(plan_id):
    plan, failure = get_owned_plan(plan_id)
    if failure:
        return failure
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error("invalid_json", "A JSON object is required", 400)
    event = SavedEvent(plan_id=plan.id)
    try:
        event_payload(payload, event)
    except ValueError as exc:
        return error("validation_error", str(exc), 422)
    db.session.add(event)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error("duplicate_event", "This event is already saved in this plan", 409)
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Failed to save event", 500)
    return jsonify(data=event.serialize()), 201


@plans_bp.patch("/events/<int:event_id>")
@require_user
def update_saved_event(event_id):
    event = get_owned_event(event_id)
    if event is None:
        return error("not_found", "Saved event not found", 404)
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error("invalid_json", "A JSON object is required", 400)
    try:
        event_payload(payload, event)
    except ValueError as exc:
        return error("validation_error", str(exc), 422)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error("duplicate_event", "This event is already saved in this plan", 409)
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Failed to update saved event", 500)
    return jsonify(data=event.serialize()), 200


@plans_bp.delete("/events/<int:event_id>")
@require_user
def delete_saved_event(event_id):
    event = get_owned_event(event_id)
    if event is None:
        return error("not_found", "Saved event not found", 404)
    db.session.delete(event)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Failed to delete saved event", 500)
    return "", 204


@plans_bp.delete("/bulk-delete")
@require_user
def bulk_delete_saved_events():
    payload = request.get_json(silent=True)
    ids = payload.get("ids") if isinstance(payload, dict) else None
    if not isinstance(ids, list) or not ids or any(type(item) is not int or item < 1 for item in ids):
        return error("validation_error", "A non-empty list of positive integer event IDs is required", 422)
    owned_event_ids = db.session.query(SavedEvent.id).join(
        Plan, SavedEvent.plan_id == Plan.id
    ).filter(Plan.user_id == g.current_user.id, SavedEvent.id.in_(set(ids)))
    deleted = SavedEvent.query.filter(SavedEvent.id.in_(owned_event_ids)).delete(
        synchronize_session=False
    )
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Failed to delete saved events", 500)
    return jsonify(message=f"Deleted {deleted} events", deleted=deleted), 200


@plans_bp.get("/notifications/upcoming")
@require_user
def get_notifications():
    today = date.today()
    next_week = today + timedelta(days=7)
    events = SavedEvent.query.join(Plan, SavedEvent.plan_id == Plan.id).filter(
        Plan.user_id == g.current_user.id,
        SavedEvent.date >= today.isoformat(),
        SavedEvent.date <= next_week.isoformat(),
    ).order_by(SavedEvent.date.asc()).all()
    return jsonify(count=len(events), data=[event.serialize() for event in events], has_notifications=bool(events)), 200

@plans_bp.get("/notifications/preferences")
@require_user
def get_reminder_preferences():
    preference = ReminderPreference.query.filter_by(user_id=g.current_user.id).first()
    
    if preference is None:
        preference = ReminderPreference(user_id=g.current_user.id, enabled=True, minutes_before=60)

        db.session.add(preference)
        db.session.commit()
        
    return jsonify(data=preference.serialize()), 200

@plans_bp.put("/notifications/preferences")
@require_user
def update_reminder_preferences():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error("invalid_json", "A JSON object is required", 400)

    enabled = payload.get("enabled")
    minutes_before = payload.get("minutes_before")

    if type(enabled) is not bool:
        return error("validation_error", "enabled must be true or false", 422)

    if (type(minutes_before) is not int or minutes_before not in ALLOWED_REMINDER_FREQUENCIES): 
        return error("validation_error", "minutes_before must be a positive integer", 422)

    preference = ReminderPreference.query.filter_by(user_id=g.current_user.id).first()
    
    if preference is None:
        preference = ReminderPreference(user_id=g.current_user.id)
        db.session.add(preference)

    preference.enabled = enabled
    preference.minutes_before = minutes_before

    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error("database_error", "Failed to save reminder preferences", 500)
    
    return jsonify(data=preference.serialize()), 200