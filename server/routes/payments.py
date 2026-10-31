"""M-PESA Express payments: start an STK push, poll status, receive Daraja's callback."""
import hmac
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

import mpesa
from models import Payment, db  # adjust if your db lives elsewhere

payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")

PENDING_TIMEOUT_SECONDS = 180
MAX_AMOUNT = 150000


def _error(code, message, status):
    return jsonify({"error": {"code": code, "message": message}}), status


def _age_seconds(payment):
    created = payment.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - created).total_seconds()


@payments_bp.post("/mpesa/stk-push", strict_slashes=False)
@jwt_required()
def start_payment():
    body = request.get_json(silent=True) or {}

    try:
        phone = mpesa.normalize_phone(body.get("phone"))
    except ValueError as exc:
        return _error("invalid_phone", str(exc), 400)

    try:
        amount = int(body.get("amount"))
        quantity = int(body.get("quantity", 1))
    except (TypeError, ValueError):
        return _error("invalid_amount", "amount and quantity must be whole numbers", 400)
    if not 1 <= amount <= MAX_AMOUNT or quantity < 1:
        return _error("invalid_amount", f"amount must be between 1 and {MAX_AMOUNT}", 400)

    event_id = str(body.get("eventId") or "")[:64]

    try:
        result = mpesa.stk_push(
            phone=phone,
            amount=amount,
            account_reference="CityPulse",
            description="Tickets",
        )
    except mpesa.MpesaError as exc:
        return _error(exc.code, exc.message, 502)

    payment = Payment(
        user_id=int(get_jwt_identity()),
        event_id=event_id,
        quantity=quantity,
        amount=amount,
        phone=phone,
        status="pending",
        checkout_request_id=result["CheckoutRequestID"],
        merchant_request_id=result["MerchantRequestID"],
    )
    db.session.add(payment)
    db.session.commit()
    return jsonify({"data": payment.to_dict()}), 201


@payments_bp.get("/<int:payment_id>", strict_slashes=False)
@jwt_required()
def get_payment(payment_id):
    payment = db.session.get(Payment, payment_id)
    # Same 404 for "not yours" and "doesn't exist", so ids can't be probed.
    if payment is None or payment.user_id != int(get_jwt_identity()):
        return _error("not_found", "Payment not found", 404)

    if payment.status == "pending" and _age_seconds(payment) > PENDING_TIMEOUT_SECONDS:
        payment.status = "timeout"
        payment.result_desc = "No response from M-PESA"
        db.session.commit()
    return jsonify({"data": payment.to_dict()})


@payments_bp.post("/mpesa/callback/<token>", strict_slashes=False)
def mpesa_callback(token):
    expected = current_app.config.get("MPESA_CALLBACK_SECRET") or ""
    if not expected or not hmac.compare_digest(token, expected):
        return _error("forbidden", "Invalid callback token", 403)

    ack = jsonify({"ResultCode": 0, "ResultDesc": "Accepted"})
    callback = ((request.get_json(silent=True) or {}).get("Body") or {}).get("stkCallback")
    if not callback:
        return ack

    payment = Payment.query.filter_by(checkout_request_id=callback.get("CheckoutRequestID")).first()
    if payment is None or payment.status != "pending":
        return ack  # unknown or already handled: Daraja may send the same callback twice

    code = callback.get("ResultCode")
    payment.result_code = code
    payment.result_desc = (callback.get("ResultDesc") or "")[:255]
    if code == 0:
        items = (callback.get("CallbackMetadata") or {}).get("Item") or []
        meta = {item.get("Name"): item.get("Value") for item in items}
        payment.status = "paid"
        payment.mpesa_receipt = meta.get("MpesaReceiptNumber")
    else:
        payment.status = "failed"  # includes 1032 (user cancelled) and wrong PIN
    db.session.commit()
    return ack