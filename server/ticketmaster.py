"""Ticketmaster Discovery API client; credentials remain server-side only."""
from datetime import date, datetime, timezone

import requests
from flask import current_app

BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json"
REQUEST_TIMEOUT_SECONDS = 15


class TicketmasterError(Exception):
    def __init__(self, message, code="upstream_error"):
        self.message = message
        self.code = code
        super().__init__(message)


def _validate_date(value, field_name):
    if not value:
        return None
    try:
        return date.fromisoformat(value).isoformat()
    except (TypeError, ValueError) as exc:
        raise TicketmasterError(f"{field_name} must use YYYY-MM-DD format", "invalid_date") from exc


def fetch_events(keyword=None, city=None, category=None, start_date=None, end_date=None):
    api_key = current_app.config.get("TICKETMASTER_API_KEY")
    if not api_key:
        raise TicketmasterError(
            "Event search is temporarily unavailable. The server Ticketmaster key is not configured.",
            code="missing_api_key",
        )

    start_date = _validate_date(start_date, "startDate")
    end_date = _validate_date(end_date, "endDate")
    if start_date and end_date and end_date < start_date:
        raise TicketmasterError("endDate must be on or after startDate", "invalid_date_range")

    params = {
        "apikey": api_key,
        "size": 50,
        "sort": "date,asc",
        "countryCode": current_app.config.get("EVENTS_COUNTRY_CODE", "KE"),
    }
    if keyword:
        params["keyword"] = keyword.strip()
    if city:
        params["city"] = city.strip()
    if category:
        params["classificationName"] = category.strip()

    if start_date:
        params["startDateTime"] = f"{start_date}T00:00:00Z"
    else:
        params["startDateTime"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if end_date:
        params["endDateTime"] = f"{end_date}T23:59:59Z"

    try:
        response = requests.get(BASE_URL, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
    except requests.Timeout as exc:
        raise TicketmasterError("Ticketmaster did not respond before the timeout.", "upstream_timeout") from exc
    except requests.RequestException as exc:
        raise TicketmasterError("Could not connect to Ticketmaster.", "network_error") from exc

    if response.status_code in (401, 403):
        raise TicketmasterError("Ticketmaster rejected the server API key. Check the Render secret.", "invalid_api_key")
    if response.status_code == 429:
        raise TicketmasterError("Ticketmaster rate limit reached. Please try again shortly.", "rate_limited")
    if not response.ok:
        raise TicketmasterError(f"Ticketmaster returned HTTP {response.status_code}.", "upstream_error")

    try:
        raw = response.json()
    except (ValueError, requests.exceptions.JSONDecodeError) as exc:
        raise TicketmasterError("Ticketmaster returned an invalid JSON response.", "invalid_upstream_response") from exc

    if not isinstance(raw, dict):
        raise TicketmasterError("Ticketmaster returned an unexpected response format.", "invalid_upstream_response")

    embedded = raw.get("_embedded") or {}
    raw_events = embedded.get("events") or []
    if not isinstance(raw_events, list):
        raise TicketmasterError("Ticketmaster returned an invalid events collection.", "invalid_upstream_response")

    return [normalize_event(item) for item in raw_events if isinstance(item, dict) and item.get("id")]


def normalize_event(raw):
    """Return the single canonical CityPulse event shape consumed by React."""
    embedded = raw.get("_embedded")
    if not isinstance(embedded, dict):
        embedded = {}

    def first_mapping(value):
        if isinstance(value, list) and value and isinstance(value[0], dict):
            return value[0]
        return {}

    venue = first_mapping(embedded.get("venues"))
    city = venue.get("city") if isinstance(venue.get("city"), dict) else {}
    price = first_mapping(raw.get("priceRanges"))
    classification = first_mapping(raw.get("classifications"))
    segment = classification.get("segment") if isinstance(classification.get("segment"), dict) else {}
    dates = raw.get("dates") if isinstance(raw.get("dates"), dict) else {}
    start = dates.get("start") if isinstance(dates.get("start"), dict) else {}

    return {
        "id": raw.get("id"),
        "name": raw.get("name") or "Untitled event",
        "url": raw.get("url"),
        "image": _pick_image(raw.get("images")),
        "date": start.get("localDate"),
        "time": start.get("localTime"),
        "venue": venue.get("name"),
        "city": city.get("name"),
        "category": segment.get("name"),
        "priceMin": price.get("min"),
        "priceMax": price.get("max"),
        "currency": price.get("currency") or "KES",
    }


def _pick_image(images):
    if not isinstance(images, list) or not images:
        return None
    candidates = [img for img in images if isinstance(img, dict) and img.get("url")]
    if not candidates:
        return None
    wide = [img for img in candidates if img.get("ratio") == "16_9"]
    pool = wide or candidates
    return min(pool, key=lambda img: abs((img.get("width") or 640) - 640)).get("url")
