# server/tests/test_events.py
from unittest.mock import patch
from datetime import datetime, timezone
import requests

RAW_RESPONSE = {
    "_embedded": {
        "events": [
            {
                "id": "evt-1",
                "name": "Test Concert",
                "url": "https://ticketmaster.com/evt-1",
                "dates": {"start": {"localDate": "2026-12-01", "localTime": "19:00:00"}},
                "images": [{"url": "img.jpg", "ratio": "16_9", "width": 640}],
                "_embedded": {"venues": [{"name": "Test Arena", "city": {"name": "Nairobi"}}]},
                "classifications": [{"segment": {"name": "Music"}}],
                "priceRanges": [{"min": 1000, "max": 5000, "currency": "KES"}],
            }
        ]
    }
}


def test_list_events_success(client):
    with patch("ticketmaster.requests.get") as mock_get:
        mock_get.return_value.ok = True
        mock_get.return_value.json.return_value = RAW_RESPONSE

        response = client.get("/api/events?city=Nairobi")

        assert response.status_code == 200
        data = response.json["data"]
        assert data[0]["id"] == "evt-1"
        assert data[0]["venue"] == "Test Arena"
        assert data[0]["priceMin"] == 1000
        assert data[0]["currency"] == "KES"


def test_list_events_passes_filters_to_ticketmaster(client):
    with patch("ticketmaster.requests.get") as mock_get:
        mock_get.return_value.ok = True
        mock_get.return_value.json.return_value = {"_embedded": {"events": []}}

        client.get("/api/events?city=Nairobi&category=Music&startDate=2026-01-01&endDate=2026-01-31&keyword=jazz")

        sent = mock_get.call_args.kwargs["params"]
        assert sent["city"] == "Nairobi"
        assert sent["classificationName"] == "Music"
        assert sent["startDateTime"] == "2026-01-01T00:00:00Z"
        assert sent["endDateTime"] == "2026-01-31T23:59:59Z"
        assert sent["keyword"] == "jazz"


def test_list_events_zero_results(client):
    with patch("ticketmaster.requests.get") as mock_get:
        mock_get.return_value.ok = True
        mock_get.return_value.json.return_value = {}

        response = client.get("/api/events?city=Nowhereville")

        assert response.status_code == 200
        assert response.json["data"] == []


def test_list_events_upstream_http_error(client):
    with patch("ticketmaster.requests.get") as mock_get:
        mock_get.return_value.ok = False
        mock_get.return_value.status_code = 500

        response = client.get("/api/events")

        assert response.status_code == 502
        assert response.json["error"]["code"] == "upstream_error"


def test_list_events_network_failure(client):
    with patch("ticketmaster.requests.get", side_effect=requests.ConnectionError("down")):
        response = client.get("/api/events")

        assert response.status_code == 502
        assert response.json["error"]["code"] == "network_error"


def test_list_events_missing_api_key(client):
    original = client.application.config.get("TICKETMASTER_API_KEY")
    client.application.config["TICKETMASTER_API_KEY"] = None
    try:
        response = client.get("/api/events")
        assert response.status_code == 500
        assert response.json["error"]["code"] == "missing_api_key"
    finally:
        client.application.config["TICKETMASTER_API_KEY"] = original


def test_list_events_defaults_start_to_now(client):
    with patch("ticketmaster.requests.get") as mock_get:
        mock_get.return_value.ok = True
        mock_get.return_value.json.return_value = {}

        before = datetime.now(timezone.utc).replace(microsecond=0)
        client.get("/api/events")
        after = datetime.now(timezone.utc)

        sent = mock_get.call_args.kwargs["params"]["startDateTime"]
        sent_dt = datetime.strptime(sent, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        assert before <= sent_dt <= after