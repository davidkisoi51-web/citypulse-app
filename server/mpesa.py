"""Daraja (M-PESA Express) client. Secrets are read only from app config / .env."""
import base64
import re
from datetime import datetime

import requests
from flask import current_app

TIMEOUT = 15


class MpesaError(Exception):
    def __init__(self, message, code="mpesa_error"):
        self.message = message
        self.code = code
        super().__init__(message)


def normalize_phone(raw):
    """Accepts 07XXXXXXXX, 01XXXXXXXX, 7XXXXXXXX, +2547XXXXXXXX or 2547XXXXXXXX.
    Returns 2547XXXXXXXX (or 2541XXXXXXXX). Raises ValueError if invalid."""
    digits = re.sub(r"\D", "", str(raw or ""))
    if len(digits) == 10 and digits.startswith("0"):
        digits = "254" + digits[1:]
    elif len(digits) == 9 and digits[0] in "17":
        digits = "254" + digits
    if not re.fullmatch(r"254[17]\d{8}", digits):
        raise ValueError("Enter a valid Safaricom number, e.g. 0712345678")
    return digits


def _config(name):
    value = current_app.config.get(name)
    if not value:
        raise MpesaError(f"{name} is not configured on the server", code="mpesa_not_configured")
    return value


def get_access_token():
    base = _config("MPESA_BASE_URL")
    try:
        response = requests.get(
            f"{base}/oauth/v1/generate?grant_type=client_credentials",
            auth=(_config("MPESA_CONSUMER_KEY"), _config("MPESA_CONSUMER_SECRET")),
            timeout=TIMEOUT,
        )
    except requests.RequestException as exc:
        raise MpesaError(f"Could not reach M-PESA: {exc}", code="network_error") from exc
    if not response.ok:
        raise MpesaError(f"M-PESA auth failed ({response.status_code})", code="auth_failed")
    return response.json()["access_token"]


def stk_push(phone, amount, account_reference, description):
    """Starts an STK push. Returns {"CheckoutRequestID": ..., "MerchantRequestID": ...}."""
    shortcode = _config("MPESA_SHORTCODE")
    passkey = _config("MPESA_PASSKEY")
    callback = f"{_config('MPESA_CALLBACK_URL')}/{_config('MPESA_CALLBACK_SECRET')}"
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone,
        "PartyB": shortcode,
        "PhoneNumber": phone,
        "CallBackURL": callback,
        "AccountReference": account_reference[:12],
        "TransactionDesc": description[:13],
    }
    token = get_access_token()
    try:
        response = requests.post(
            f"{_config('MPESA_BASE_URL')}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
    except requests.RequestException as exc:
        raise MpesaError(f"Could not reach M-PESA: {exc}", code="network_error") from exc

    body = response.json() if response.content else {}
    if not response.ok or str(body.get("ResponseCode")) != "0":
        message = body.get("errorMessage") or body.get("ResponseDescription") or "M-PESA rejected the request"
        raise MpesaError(message, code="stk_push_failed")
    return {
        "CheckoutRequestID": body["CheckoutRequestID"],
        "MerchantRequestID": body.get("MerchantRequestID"),
    }