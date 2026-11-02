"""Who counts as an admin: anyone with an email at an admin domain, or listed in ADMIN_EMAILS."""
from flask import current_app


def is_admin(email):
    email = (email or "").strip().lower()
    if not email:
        return False
    if email in current_app.config.get("ADMIN_EMAILS", set()):
        return True
    name, at, domain = email.rpartition("@")
    return bool(name and at) and domain in current_app.config.get("ADMIN_DOMAINS", set())
