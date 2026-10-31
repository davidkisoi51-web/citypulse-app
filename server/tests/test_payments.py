from unittest.mock import patch

import pytest
from flask_jwt_extended import create_access_token

CALLBACK = "/api/payments/mpesa/callback/testsecret"


@pytest.fixture
def auth(app):
    app.config["JWT_SECRET_KEY"] = "citypulse-test-secret-key-at-least-32-bytes-long"
    app.config["MPESA_CALLBACK_SECRET"] = "testsecret"
    with app.app_context():
        return {
            "user1": {"Authorization": f"Bearer {create_access_token(identity='1')}"},
            "user2": {"Authorization": f"Bearer {create_access_token(identity='2')}"},
        }


def start(client, auth, checkout_id="ws_CO_1", **overrides):
    body = {"phone": "0712345678", "amount": 100, "eventId": "abc", "quantity": 1, **overrides}
    fake = {"CheckoutRequestID": checkout_id, "MerchantRequestID": "m1"}
    with patch("routes.payments.mpesa.stk_push", return_value=fake):
        return client.post("/api/payments/mpesa/stk-push", json=body, headers=auth["user1"])


def callback_body(checkout_id, code=0):
    cb = {"CheckoutRequestID": checkout_id, "ResultCode": code, "ResultDesc": "done"}
    if code == 0:
        cb["CallbackMetadata"] = {"Item": [{"Name": "MpesaReceiptNumber", "Value": "QWE123"}]}
    return {"Body": {"stkCallback": cb}}


def test_stk_push_requires_login(client):
    assert client.post("/api/payments/mpesa/stk-push", json={}).status_code == 401


def test_stk_push_creates_pending_payment(client, auth):
    res = start(client, auth)
    assert res.status_code == 201
    assert res.get_json()["data"]["status"] == "pending"


def test_invalid_phone_rejected(client, auth):
    res = start(client, auth, phone="12345")
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "invalid_phone"


def test_invalid_amount_rejected(client, auth):
    assert start(client, auth, amount=0).status_code == 400


def test_successful_callback_marks_paid(client, auth):
    payment_id = start(client, auth).get_json()["data"]["id"]
    assert client.post(CALLBACK, json=callback_body("ws_CO_1")).status_code == 200
    data = client.get(f"/api/payments/{payment_id}", headers=auth["user1"]).get_json()["data"]
    assert data["status"] == "paid"
    assert data["receipt"] == "QWE123"


def test_cancelled_callback_marks_failed(client, auth):
    payment_id = start(client, auth).get_json()["data"]["id"]
    client.post(CALLBACK, json=callback_body("ws_CO_1", code=1032))
    data = client.get(f"/api/payments/{payment_id}", headers=auth["user1"]).get_json()["data"]
    assert data["status"] == "failed"


def test_duplicate_callback_does_not_change_paid_payment(client, auth):
    payment_id = start(client, auth).get_json()["data"]["id"]
    client.post(CALLBACK, json=callback_body("ws_CO_1"))
    client.post(CALLBACK, json=callback_body("ws_CO_1", code=1032))
    data = client.get(f"/api/payments/{payment_id}", headers=auth["user1"]).get_json()["data"]
    assert data["status"] == "paid"


def test_callback_with_wrong_token_is_forbidden(client, auth):
    assert client.post("/api/payments/mpesa/callback/wrong", json={}).status_code == 403


def test_other_user_cannot_read_payment(client, auth):
    payment_id = start(client, auth).get_json()["data"]["id"]
    res = client.get(f"/api/payments/{payment_id}", headers=auth["user2"])
    assert res.status_code == 404