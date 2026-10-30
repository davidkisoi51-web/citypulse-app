# server/ticketmaster.py
"""Ticketmaster Discovery API client and normalization.

The API key lives only here (server .env). routes/events.py proxies all
requests through this module so the key never reaches the browser.
"""
import requests
from flask import current_app
from datetime import datetime, timezone

BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json"
REQUEST_TIMEOUT_SECONDS = 8


class TicketmasterError(Exception):
    def __init__(self, message, code="upstream_error"):
        self.message = message
        self.code = code
        super().__init__(message)


def fetch_events(keyword=None, city=None, category=None, start_date=None, end_date=None):
    api_key = current_app.config.get("TICKETMASTER_API_KEY")
    if not api_key:
        raise TicketmasterError(
            "No Ticketmaster API key configured on the server", code="missing_api_key"
        )

    params = {"apikey": api_key}
    if keyword:
        params["keyword"] = keyword
    if city:
        params["city"] = city
    if category:
        params["classificationName"] = category
    if start_date:
        params["startDateTime"] = f"{start_date}T00:00:00Z"
    else:
        # No explicit start date: only upcoming events
        params["startDateTime"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")    
    if end_date:
        params["endDateTime"] = f"{end_date}T23:59:59Z"

    try:
        response = requests.get(BASE_URL, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
    except requests.RequestException as exc:
        raise TicketmasterError(f"Could not reach Ticketmaster: {exc}", code="network_error") from exc

    
    if not response.ok:
        raise TicketmasterError(
            f"Ticketmaster returned HTTP {response.status_code}",
            code="upstream_error",
        )

    try:
        raw = response.json()
    except requests.exceptions.JSONDecodeError as exc:
        raise TicketmasterError(
            "Ticketmaster returned an invalid JSON response",
            code="invalid_upstream_response",
        ) from exc

    if not isinstance(raw, dict):
        raise TicketmasterError(
            "Ticketmaster returned an unexpected response format",
            code="invalid_upstream_response",
        )

    events = raw.get("_embedded", {}).get("events", [])
    return [normalize_event(event) for event in events]



def normalize_event(raw):
    """Maps a raw Ticketmaster event into the canonical CityPulse Event
    shape (RULES.md 3.1) — same field names the client's normalizeEvent.js
    already produces, so React components need no changes."""
    venues = raw.get("_embedded", {}).get("venues") or [{}]
    venue = venues[0]
    city = venue.get("city") or {}
    price_ranges = raw.get("priceRanges") or [{}]
    price = price_ranges[0]
    classifications = raw.get("classifications") or [{}]
    segment = classifications[0].get("segment") or {}
    dates = raw.get("dates", {}).get("start", {})

    return {
        "id": raw.get("id"),
        "name": raw.get("name"),
        "url": raw.get("url"),
        "image": _pick_image(raw.get("images")),
        "date": dates.get("localDate"),
        "time": dates.get("localTime"),
        "venue": venue.get("name"),
        "city": city.get("name"),
        "category": segment.get("name"),
        "priceMin": price.get("min"),
        "priceMax": price.get("max"),
        "currency": price.get("currency"),
    }


def _pick_image(images):
    if not images:
        return None
    wide = [img for img in images if img.get("ratio") == "16_9"]
    pool = wide or images
    best = min(pool, key=lambda img: abs(img.get("width", 0) - 640))
    return best.get("url")