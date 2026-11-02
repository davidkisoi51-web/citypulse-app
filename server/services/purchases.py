import math
import secrets
from datetime import datetime, timezone

from extensions import db
from models import Payment, Tickets
from sqlalchemy.exc import IntegrityError, SQLAlchemyError


class PurchaseValidationError(ValueError):
    def __init__(self, message, code="validation_error", status_code=422):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


def _text(payload, key, *, required=False, limit=None):
    value = payload.get(key)
    if value is None and not required:
        return None
    if not isinstance(value, str) or (required and not value.strip()):
        raise PurchaseValidationError(f"{key} must be a non-empty string.")
    value = value.strip()
    if limit is not None and len(value) > limit:
        raise PurchaseValidationError(f"{key} must be {limit} characters or fewer.")
    return value or None


def create_purchase(payload, user_id):
    if not isinstance(payload, dict):
        raise PurchaseValidationError("A JSON object is required.", status_code=400)

    event_id = _text(payload, "eventId", required=True, limit=64)
    event_name = _text(payload, "eventName", required=True, limit=255)
    event_date = _text(payload, "eventDate", limit=80)
    event_time = _text(payload, "eventTime", limit=80)
    event_venue = _text(payload, "eventVenue", limit=255)
    event_city = _text(payload, "eventCity", limit=120)
    event_category = _text(payload, "eventCategory", limit=120)
    ticket_type = _text(payload, "ticketType", required=True, limit=120)
    currency = _text(payload, "currency", limit=8) or "KES"
    method = _text(payload, "method", required=True, limit=40)
    mpesa_code = _text(payload, "mpesaCode", limit=32)
    paid_to = _text(payload, "paidTo", limit=160)

    quantity = payload.get("quantity")
    unit_price = payload.get("unitPrice")
    if isinstance(quantity, bool) or not isinstance(quantity, int) or not 1 <= quantity <= 10:
        raise PurchaseValidationError("quantity must be between 1 and 10.")
    if isinstance(unit_price, bool) or not isinstance(unit_price, (int, float)):
        raise PurchaseValidationError("unitPrice must be a non-negative number.")
    if not math.isfinite(unit_price) or unit_price < 0:
        raise PurchaseValidationError("unitPrice must be a non-negative number.")

    total = round(float(unit_price) * quantity, 2)
    payment_id = payload.get("paymentId")
    if method == "Free":
        if total != 0:
            raise PurchaseValidationError("Free tickets must have a zero total.")
        if payment_id is not None:
            raise PurchaseValidationError("Free tickets cannot reference a payment.")
    elif method == "M-PESA Express (STK Push)":
        if isinstance(payment_id, bool) or not isinstance(payment_id, int) or payment_id < 1:
            raise PurchaseValidationError("A confirmed M-PESA payment is required.")
        payment = db.session.get(Payment, payment_id)
        if (
            payment is None
            or payment.user_id != user_id
            or payment.status != "paid"
            or payment.amount != math.floor(total + 0.5)
            or payment.quantity != quantity
            or payment.event_id != event_id
        ):
            raise PurchaseValidationError(
                "The M-PESA payment could not be confirmed for this purchase.",
                code="payment_not_confirmed",
                status_code=409,
            )
        if Tickets.query.filter_by(payment_id=payment.id).first():
            raise PurchaseValidationError(
                "This M-PESA payment has already been used.",
                code="payment_already_used",
                status_code=409,
            )
        mpesa_code = payment.mpesa_receipt or mpesa_code
        paid_to = paid_to or "M-PESA Express (STK Push)"
    else:
        raise PurchaseValidationError("Paid purchases must use a confirmed M-PESA STK payment.")

    ticket = Tickets(
        user_id=user_id,
        paid_at=datetime.now(timezone.utc).isoformat(),
        event_id=event_id,
        event_name=event_name,
        event_date=event_date,
        event_time=event_time,
        event_venue=event_venue,
        event_city=event_city,
        event_category=event_category,
        ticket_type=ticket_type,
        price=float(unit_price),
        no_of_tickets=quantity,
        transferable=True,
        receipt_no=secrets.token_hex(8).upper(),
        currency=currency,
        total=total,
        method=method,
        mpesa_no=mpesa_code,
        mpesa_code=mpesa_code,
        paid_to=paid_to,
        payment_id=payment_id,
    )
    db.session.add(ticket)
    try:
        db.session.commit()
    except IntegrityError as exc:
        db.session.rollback()
        if payment_id is not None:
            raise PurchaseValidationError(
                "This M-PESA payment has already been used.",
                code="payment_already_used",
                status_code=409,
            ) from exc
        raise
    except SQLAlchemyError:
        db.session.rollback()
        raise
    return ticket
