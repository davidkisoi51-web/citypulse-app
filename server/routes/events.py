"""CityPulse events proxy."""
from flask import Blueprint, current_app, jsonify, request

from ticketmaster import TicketmasterError, fetch_events

events_bp = Blueprint("events", __name__)


@events_bp.get("")
@events_bp.get("/")
def list_events():
    city = request.args.get("city") if "city" in request.args else current_app.config.get("DEFAULT_EVENT_CITY", "Nairobi")
    try:
        events = fetch_events(
            keyword=request.args.get("keyword"),
            city=city,
            category=request.args.get("category"),
            start_date=request.args.get("startDate"),
            end_date=request.args.get("endDate"),
        )
    except TicketmasterError as exc:
        status = 400 if exc.code in {"invalid_date", "invalid_date_range"} else 503 if exc.code in {
            "missing_api_key", "invalid_api_key", "rate_limited"
        } else 504 if exc.code == "upstream_timeout" else 502
        current_app.logger.warning("Event provider request failed [%s]: %s", exc.code, exc.message)
        return jsonify(error={"code": exc.code, "message": exc.message}), status

    return jsonify(data=events, meta={"count": len(events), "source": "ticketmaster"}), 200
