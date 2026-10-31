from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from unittest.mock import patch

from extensions import db
from models import SavedEvent, User


def test_daily_reminder_command_sends_once_per_user(client, app):
    with app.app_context():
        user = db.session.get(User, 1)
        user.is_verified = True
        tomorrow = (datetime.now(ZoneInfo("Africa/Nairobi")).date() + timedelta(days=1)).isoformat()
        saved = SavedEvent(
            plan_id=1,
            ticketmaster_id="event-1",
            name="City Festival",
            date=tomorrow,
            time="18:00:00",
            venue="City Hall",
            city="Nairobi",
        )
        duplicate = SavedEvent(
            plan_id=1,
            ticketmaster_id="event-2",
            name="Evening Concert",
            date=tomorrow,
            time="20:00:00",
            venue="Arena",
            city="Nairobi",
        )
        db.session.add_all([saved, duplicate])
        db.session.commit()

    runner = app.test_cli_runner()
    with patch("services.email_service.send_event_reminder", return_value=True) as send:
        result = runner.invoke(args=["send-event-reminders"])
        assert result.exit_code == 0, result.output
        send.assert_called_once()
        assert len(send.call_args.args[2]) == 2

    with app.app_context():
        saved_rows = SavedEvent.query.filter(SavedEvent.date == tomorrow).all()
        assert all(row.reminder_sent_at is not None for row in saved_rows)

    with patch("services.email_service.send_event_reminder", return_value=True) as send_again:
        result = runner.invoke(args=["send-event-reminders"])
        assert result.exit_code == 0, result.output
        send_again.assert_not_called()


def test_reminder_email_escapes_html_content():
    from services.email_service import send_event_reminder

    malicious_name = '<img src=x onerror="alert(1)">'
    malicious_event = '<script>alert("event")</script>'

    with patch("services.email_service._send_email", return_value=True) as send:
        send_event_reminder(
            "test@example.test",
            malicious_name,
            [{
                "name": malicious_event,
                "date": "2026-10-31",
                "time": "18:00",
                "venue": "<b>City Hall</b>",
                "city": "Nairobi",
            }],
        )

    html = send.call_args.args[2]

    assert "<script>" not in html
    assert "<img " not in html
    assert "<b>City Hall</b>" not in html
    assert "&lt;script&gt;" in html
    assert "&lt;img " in html
    assert "&lt;b&gt;City Hall&lt;/b&gt;" in html
