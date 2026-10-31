"""SQLAlchemy data models for CityPulse-owned data."""
from datetime import datetime, timezone, date
from extensions import db, bcrypt
from marshmallow import Schema, fields

def utc_now():
    return datetime.now(timezone.utc)
# User model
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_verified = db.Column(db.Boolean, nullable=False, default=False)
    verification_code = db.Column(db.String(5), nullable=True)
    code_expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    reset_code = db.Column(db.String(5), nullable=True)
    reset_expires_at = db.Column(db.DateTime(timezone=True), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    plans = db.relationship("Plan", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    reminder_preference = db.relationship("ReminderPreference", back_populates="user", uselist=False, cascade="all, delete-orphan", passive_deletes=True)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password.encode("utf-8")).decode("utf-8")

    def password_check(self, password):
        return bcrypt.check_password_hash(self.password_hash, password.encode("utf-8"))

    def __repr__(self):
        return f'User {self.name}'

# Plan model
class Plan(db.Model):
    __tablename__ = "plans"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text)
    event_date = db.Column(db.Date)
    city = db.Column(db.String(120))
    status = db.Column(db.String(20), nullable=False, default="saved", server_default="saved")
    is_public = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    user = db.relationship("User", back_populates="plans")
    saved_events = db.relationship("SavedEvent", back_populates="plan", cascade="all, delete-orphan", passive_deletes=True)

    def serialize(self, include_events=False):
        payload = {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "event_date": self.event_date.isoformat() if isinstance(self.event_date, date) else None,
            "city": self.city,
            "status": self.status,
            "is_public": self.is_public,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "event_count": len(self.saved_events),
        }  
        if include_events:
            payload["saved_events"] = [ev.serialize() for ev in self.saved_events]
        return payload
    def to_dict(self, include_events=False):
        return self.serialize(include_events=include_events)

# SavedEvent model
class SavedEvent(db.Model):
    __tablename__ = "saved_events"
    __table_args__ = (db.UniqueConstraint("plan_id", "ticketmaster_id", name="uq_saved_event_plan_ticketmaster"),)

    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True)
    ticketmaster_id = db.Column(db.String(120), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    url = db.Column(db.Text)
    image = db.Column(db.Text)
    date = db.Column(db.String(80))
    time = db.Column(db.String(80))
    venue = db.Column(db.String(255))
    city = db.Column(db.String(120))
    category = db.Column(db.String(120))
    price_min = db.Column(db.Float)
    price_max = db.Column(db.Float)
    currency = db.Column(db.String(8))
    note = db.Column(db.Text)
    status = db.Column(db.String(20), nullable=False, default="interested")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    reminder_sent_at = db.Column(db.DateTime(timezone=True), nullable=True)

    plan = db.relationship("Plan", back_populates="saved_events")

    @property
    def is_past(self):
        if not self.date:
            return False
        try:
            ev_date = date.fromisoformat(self.date[:10])
            return ev_date < date.today()
        except:
            return False
    @property
    def days_until(self):
        if not self.date or self.is_past:
            return None
        try:
            ev_date = date.fromisoformat(self.date[:10]) 
            delta = ev_date - date.today()
            return delta.days
        except:
            return None
        
    @property
    def days_ago(self):
        if not self.is_past:
            return 0
        try:
            ev_date = date.fromisoformat(self.date[:10]) 
            delta = date.today() - ev_date
            return delta.days
        except:
            return 0
    def serialize(self):
        return {
            "id": self.id,
            "plan_id": self.plan_id,
            "ticketmaster_id": self.ticketmaster_id,
            "name": self.name,
            "url": self.url,
            "image": self.image,
            "date": self.date,
            "time": self.time,
            "venue": self.venue,
            "city": self.city,
            "category": self.category,
            "price_min": self.price_min,
            "price_max": self.price_max,
            "currency": self.currency,
            "note": self.note,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
    
    def to_dict(self):
        return self.serialize()

# Reminder Preference model
class ReminderPreference(db.Model):
    __tablename__ = "reminder_preferences"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    enabled = db.Column(db.Boolean, nullable=False, default=True, server_default=db.true())
    minutes_before = db.Column(db.Integer, nullable=False, default=60, server_default="60")
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    user = db.relationship("User", back_populates="reminder_preference")

    def serialize(self):
        return {
            "enabled": self.enabled,
            "minutes_before": self.minutes_before,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


# User and Plan Marshmallow Schemas
class UserSchema(Schema):
    id = fields.Int(dump_only = True)
    name = fields.String()
    email = fields.String()

    plans = fields.List(fields.Nested(lambda:PlanSchema(exclude=("user",))))

class PlanSchema(Schema):
    id = fields.Int(dump_only = True)
    title = fields.String()
    description = fields.String()
    city = fields.String()

    user = fields.Nested(UserSchema(exclude = ("plans",)))
    savedevents = fields.List(fields.Nested(lambda:SavedEventsSchema(exclude = "plans",)))

class SavedEventsSchema(Schema):
    plans = fields.Nested(PlanSchema(exclude= ("savedevents",)))

#Payment model
class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    event_id = db.Column(db.String(64))
    quantity = db.Column(db.Integer, nullable=False, default=1)
    amount = db.Column(db.Integer, nullable=False)
    phone = db.Column(db.String(15), nullable=False)
    status = db.Column(db.String(16), nullable=False, default="pending")  # pending | paid | failed | timeout
    merchant_request_id = db.Column(db.String(64))
    checkout_request_id = db.Column(db.String(64), unique=True, index=True)
    mpesa_receipt = db.Column(db.String(32))
    result_code = db.Column(db.Integer)
    result_desc = db.Column(db.String(255))
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status,
            "amount": self.amount,
            "phone": self.phone,
            "eventId": self.event_id,
            "quantity": self.quantity,
            "receipt": self.mpesa_receipt,
            "message": self.result_desc,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }



# Authentication Rate Limit model
class AuthRateLimit(db.Model):
    """Persistent, account-keyed authentication rate-limit counters."""

    __tablename__ = "auth_rate_limits"
    __table_args__ = (
        db.UniqueConstraint(
            "scope",
            "key_hash",
            name="uq_auth_rate_limits_scope_key",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    scope = db.Column(db.String(40), nullable=False)
    key_hash = db.Column(db.String(64), nullable=False)
    window_started_at = db.Column(db.DateTime(timezone=True), nullable=False)
    attempts = db.Column(db.Integer, nullable=False, default=1)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False)
