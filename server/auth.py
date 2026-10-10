"""Temporary auth adapter. Replace with Amina's JWT implementation before release."""
from functools import wraps
from flask import current_app, g, jsonify, request
from models import User


def require_user(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        # This deliberately does not pretend a bearer token is verified.
        # Until the JWT implementation is merged, the stub must be explicitly enabled.
        if not current_app.config.get("DEV_AUTH_STUB"):
            return jsonify(error={"code": "auth_not_configured", "message": "JWT authentication is not configured yet"}), 503
        user = db_user = User.query.get(current_app.config["DEV_AUTH_USER_ID"])
        if user is None:
            return jsonify(error={"code": "dev_user_missing", "message": "Run python seed.py to create the development user"}), 503
        g.current_user = db_user
        return view(*args, **kwargs)
    return wrapped
