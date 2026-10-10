"""CityPulse Flask API entry point."""
from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from config import Config
from extensions import db
from routes.health import health_bp
from routes.plans import plans_bp


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    db.init_app(app)
    Migrate(app, db)

    # Import models so Flask-Migrate can discover metadata.
    from models import User, Plan, SavedEvent  # noqa: F401

    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(plans_bp, url_prefix="/api/plans")

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
