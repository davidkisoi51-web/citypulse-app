"""CityPulse Flask API entry point."""
from flask import Flask, jsonify
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import os
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from config import Config
from extensions import db, bcrypt
from routes.health import health_bp
from routes.plans import plans_bp
from routes.auth import auth_bp
from routes.events import events_bp 
from routes.payments import payments_bp


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    JWTManager(app)
    db.init_app(app)
    bcrypt.init_app(app)
    Migrate(app, db)



    # Import models so Flask-Migrate can discover metadata.
    from models import User, Plan, SavedEvent, AuthRateLimit  # noqa: F401

    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(plans_bp, url_prefix="/api/plans")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(events_bp, url_prefix="/api/events")
    app.register_blueprint(payments_bp, url_prefix="/api/payments")
  

    @app.cli.command("send-event-reminders")
    def send_event_reminders():
        """Send a daily digest for verified users with saved events tomorrow."""
        from models import SavedEvent, Plan, User
        from services.email_service import send_event_reminder

        timezone_name = os.getenv("CITYPULSE_TIMEZONE", "Africa/Nairobi")
        local_today = datetime.now(ZoneInfo(timezone_name)).date()
        target_date = (local_today + timedelta(days=1)).isoformat()
        rows = (
            db.session.query(SavedEvent, User)
            .join(Plan, SavedEvent.plan_id == Plan.id)
            .join(User, Plan.user_id == User.id)
            .filter(
                SavedEvent.date == target_date,
                SavedEvent.reminder_sent_at.is_(None),
                User.is_verified.is_(True),
            )
            .all()
        )
        grouped = {}
        for saved_event, user in rows:
            entry = grouped.setdefault(user.id, {"user": user, "events": {}})
            event_group = entry["events"].setdefault(
                saved_event.ticketmaster_id,
                {"payload": saved_event.serialize(), "rows": []},
            )
            event_group["rows"].append(saved_event)

        sent = 0
        for entry in grouped.values():
            user = entry["user"]
            event_groups = list(entry["events"].values())
            payloads = [group["payload"] for group in event_groups]
            try:
                delivered = send_event_reminder(user.email, user.name, payloads)
                if delivered:
                    sent_at = datetime.now(ZoneInfo("UTC"))
                    for group in event_groups:
                        for saved_event in group["rows"]:
                            saved_event.reminder_sent_at = sent_at
                    db.session.commit()
                    sent += 1
                else:
                    db.session.rollback()
                    app.logger.error("Reminder email failed for user id %s", user.id)
            except Exception:
                db.session.rollback()
                app.logger.exception("Reminder processing failed for user id %s", user.id)
        print(f"CityPulse reminders: {sent} email digest(s) sent for {target_date}.")

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify(error={"code": "not_found", "message": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(_error):
        app.logger.exception("Unhandled server error")
        return jsonify(error={"code": "internal_error", "message": "An unexpected error occurred"}), 500

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=app.config["DEBUG"])
