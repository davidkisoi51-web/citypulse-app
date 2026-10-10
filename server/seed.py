"""Idempotent minimal local development seed."""
from werkzeug.security import generate_password_hash
from app import create_app
from extensions import db
from models import User, Plan

app = create_app()
with app.app_context():
    user = User.query.filter_by(email="david.local@example.test").first()
    if user is None:
        user = User(name="Local Developer", email="david.local@example.test",
                    password_hash=generate_password_hash("local-only-not-for-production"))
        db.session.add(user)
        db.session.flush()
    if not Plan.query.filter_by(user_id=user.id, title="Want to go").first():
        db.session.add(Plan(user_id=user.id, title="Want to go", description="Default saved events plan"))
    db.session.commit()
    print(f"Seed complete. Development user id: {user.id}")
