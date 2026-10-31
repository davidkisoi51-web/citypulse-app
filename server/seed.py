"""Idempotent minimal local development seed."""
#from werkzeug.security import generate_password_hash
from app import create_app
from extensions import db
from models import User, Plan, Tickets
import datetime

app = create_app()
with app.app_context():
    db.create_all()

    db.session.query(User).delete()
    db.session.query(Plan).delete()
    db.session.query(Tickets).delete()
    
    print("Database tables created and previous data wiped.")
    user = User.query.filter_by(email="david.local@example.test").first()
    if user is None:
        user = User(name="Local Developer", email="david.local@example.test", password_hash="")
        user.set_password("test-password-change-me")
        db.session.add(user)
        db.session.commit()

    if not Plan.query.filter_by(user_id=user.id, title="Want to go").first():
        db.session.add(Plan(user_id=user.id, title="Want to go", description="Default saved events plan"))
        db.session.commit()
        
    if not Tickets.query.filter_by(user_id = user.id).first():
        db.session.add(Tickets(user_id = user.id, event_id = "mock-3", paid_at = "202043242", event_name = "Event_Name", event_date = "2026-10-31", event_time = "10:30 PM", event_venue = "Test_Stadium",event_city = "Nairobi", mpesa_no = "SJK4H7XXXX", ticket_type = "VIP", price = 2500, no_of_tickets = 1, transferable = True))
    db.session.commit()
    print(f"Seed complete. Development user id: {user.id}")
