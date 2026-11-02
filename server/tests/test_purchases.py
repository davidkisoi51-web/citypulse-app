from flask_jwt_extended import create_access_token

from extensions import db
from models import Payment, Tickets, Transfer, User


def auth_headers(app, user_id=1):
    with app.app_context():
        token = create_access_token(identity=str(user_id))
    return {"Authorization": f"Bearer {token}"}


def purchase_payload(**updates):
    return {
        "eventId": "event-1",
        "eventName": "Live in Nairobi",
        "eventDate": "2026-12-01",
        "eventTime": None,
        "eventVenue": "City Hall",
        "eventCity": "Nairobi",
        "eventCategory": "Music",
        "ticketType": "Standard",
        "quantity": 2,
        "unitPrice": 0,
        "currency": "KES",
        "method": "Free",
        "mpesaCode": None,
        "paidTo": None,
        **updates,
    }


def test_purchase_creation_and_history_use_client_contract(client, app):
    response = client.post(
        "/api/purchases",
        json=purchase_payload(),
        headers=auth_headers(app),
    )

    assert response.status_code == 201
    purchase = response.json["data"]
    assert purchase["eventName"] == "Live in Nairobi"
    assert purchase["quantity"] == 2
    assert purchase["unitPrice"] == 0
    assert purchase["total"] == 0
    assert purchase["receiptNo"]

    mine = client.get("/api/purchases/mine", headers=auth_headers(app))
    assert mine.status_code == 200
    assert mine.json["data"] == [purchase]


def test_purchase_requires_authentication(client, app):
    app.config["DEV_AUTH_STUB"] = False
    response = client.post("/api/purchases", json=purchase_payload())
    assert response.status_code == 401


def test_purchase_rejects_unconfirmed_stk_payment(client, app):
    response = client.post(
        "/api/purchases",
        json=purchase_payload(
            unitPrice=500,
            method="M-PESA Express (STK Push)",
            paymentId=999,
        ),
        headers=auth_headers(app),
    )
    assert response.status_code == 409
    assert response.json["error"]["code"] == "payment_not_confirmed"


def test_unverified_manual_mpesa_codes_cannot_create_paid_tickets(client, app):
    response = client.post(
        "/api/purchases",
        json=purchase_payload(
            unitPrice=500,
            method="M-PESA",
            mpesaCode="MADEUP123",
        ),
        headers=auth_headers(app),
    )
    assert response.status_code == 422


def test_stk_payment_can_only_be_used_once(client, app):
    with app.app_context():
        payment = Payment(
            user_id=1,
            event_id="event-1",
            quantity=2,
            amount=1000,
            phone="254712345678",
            status="paid",
            mpesa_receipt="QWERTY123",
        )
        db.session.add(payment)
        db.session.commit()
        payment_id = payment.id

    payload = purchase_payload(
        unitPrice=500,
        method="M-PESA Express (STK Push)",
        paymentId=payment_id,
        mpesaCode=None,
    )
    headers = auth_headers(app)
    created = client.post("/api/purchases", json=payload, headers=headers)
    duplicate = client.post("/api/purchases", json=payload, headers=headers)

    assert created.status_code == 201
    assert created.json["data"]["mpesaCode"] == "QWERTY123"
    assert duplicate.status_code == 409
    assert duplicate.json["error"]["code"] == "payment_already_used"


def test_admin_purchase_history_is_restricted(client, app):
    user_headers = auth_headers(app)
    denied = client.get("/api/purchases", headers=user_headers)
    assert denied.status_code == 403

    with app.app_context():
        app.config["ADMIN_EMAILS"] = {"admin@example.test"}
        app.config["DEV_AUTH_STUB"] = False
        admin = User(
            name="Admin User",
            email="admin@example.test",
            password_hash="",
            is_verified=True,
        )
        admin.set_password("StrongPass123")
        db.session.add(admin)
        db.session.commit()
        admin_id = admin.id

    allowed = client.get("/api/purchases", headers=auth_headers(app, admin_id))
    assert allowed.status_code == 200
    assert isinstance(allowed.json["data"], list)


def test_transfer_moves_owned_purchase_to_verified_recipient(client, app):
    purchase = client.post(
        "/api/purchases",
        json=purchase_payload(),
        headers=auth_headers(app),
    )
    with app.app_context():
        recipient = User(
            name="Recipient User",
            email="recipient@example.test",
            password_hash="",
            is_verified=True,
        )
        db.session.add(recipient)
        db.session.commit()
        recipient_id = recipient.id

    response = client.post(
        "/api/auth/transfer",
        json={"email": "recipient@example.test", "ticketId": purchase.json["data"]["id"]},
        headers=auth_headers(app),
    )

    assert response.status_code == 200
    assert response.json["data"]["transfereeEmail"] == "recipient@example.test"
    with app.app_context():
        ticket = db.session.get(Tickets, purchase.json["data"]["id"])
        transfer = Transfer.query.one()
        assert ticket.user_id == recipient_id
        assert transfer.ticket == str(ticket.id)
