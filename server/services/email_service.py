import os
from html import escape
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
FROM_EMAIL = os.getenv("FROM_EMAIL", "CityPulse <noreply@CityPulse.com>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
IS_DEV = os.getenv("EMAIL_DRY_RUN", os.getenv("FLASK_DEBUG", "false")).lower() == "true"

try:
    from ticketmaster import fetch_events, TicketmasterError
except ImportError:
    try:
        from server.ticketmaster import fetch_events, TicketmasterError
    except ImportError:
        fetch_events = None
        TicketmasterError = Exception

def _get_events_block():
    """Get 3 events for email - from Ticketmaster API """
    events_text = ""
    try:
        if fetch_events is None:
            raise ValueError("fetch_events not available")
        result = fetch_events(
            keyword=None,
            city="Nairobi",
            category=None,
            start_date=None,
            end_date=None,
        )
        if isinstance(result, list):
            events = result[:3]
        elif isinstance(result, dict):
            events = result.get("data", [])[:3] or result.get("events", [])[:3]
        else:
            events = []
        if not events:
            raise ValueError("Empty events from Ticketmaster")
        lines = []
        for e in events:
            name = e.get("name") or e.get("title") or "CityPulse Event"
            date = e.get("dates", {}).get("start", {}).get("localDate") if isinstance(e.get("dates"), dict) else None
            date = date or e.get("date") or e.get("start_date") or e.get("city") or "Upcoming"
            lines.append(f"  • {name} - {date}")
        events_text = "\n".join(lines)
    except Exception as exc:
        print(f"(events email using fallback: {exc})")
        #events_text = "\n".join([f"  • {ev['name']} - {ev['date']}" for ev in STATIC_FALLBACK])
    return f"""
Upcoming on CityPulse:
{events_text}

View all: {FRONTEND_URL}/events
"""     
def _send_email(to_email, subject, html_body, text_body=None):
    if IS_DEV:
        print("\n" + "="*50)
        print(f"EMAIL TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print("-"*50)
        print(text_body or html_body)
        print("="*50 + "\n")
        return True
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = FROM_EMAIL
        msg["To"] = to_email

        msg.attach(MIMEText(text_body or html_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        print(f"Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Email failed to {to_email}: {e}")
        return False

def send_verification_email(to_email, code, name="there"):
    subject = "Your CityPulse verification code"
    safe_name = escape(str(name or "there"))
    safe_code = escape(str(code))

    text = f"""
Hi {name},

Your CityPulse verification code is:

    {code}

This code expires in 5 minutes.

If you didn't request this, ignore this email.

- CityPulse Team
{FRONTEND_URL}
"""
    html = f"""
    <div>
        <h2>Welcome to CityPulse!</h2>
        <p>Hi {safe_name},</p>
        <p>Your verification code is:</p>
        <h1>{safe_code}</h1>
        <p>This code expires in <b>5 minutes</b>.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    return _send_email(to_email, subject, html, text)


def send_welcome_email(to_email, name="there"):
    subject = "Welcome to CityPulse 🎉"
    events_block = _get_events_block()

    text = f"""
Welcome to CityPulse, {name}!

Your account is verified and ready.

{events_block}

Let's explore your events together.

- The CityPulse Team
{FRONTEND_URL}
"""
    safe_name = escape(str(name or "there"))
    safe_events = escape(events_block).replace("\n", "<br>")
    safe_frontend_url = escape(FRONTEND_URL, quote=True)

    html = f"""
    <div>
        <h2>Welcome to CityPulse, {safe_name}!</h2>
        <p>Your account is verified and ready to go.</p>
        <div>
            <h3>{safe_events}</h3>
        </div>
        <a href="{safe_frontend_url}/events">Explore Events</a>
        <p>- The CityPulse Team</p>
    </div>
    """
    return _send_email(to_email, subject, html, text)


def send_password_reset_email(to_email, code, name="there"):
    subject = "Reset your CityPulse password"
    safe_name = escape(str(name or "there"))
    safe_code = escape(str(code))

    text = f"""
Hi {name},

Your CityPulse password reset code is:

    {code}

This code expires in 5 minutes.

If you didn't request this, you can safely ignore this email.

- CityPulse Team
"""
    html = f"""
    <div>
        <h2>Reset your CityPulse password</h2>
        <p>Hi {safe_name},</p>
        <p>Your password reset code is:</p>
        <h1>{safe_code}</h1>
        <p>This code expires in <b>5 minutes</b>.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    return _send_email(to_email, subject, html, text)


def send_password_changed_email(to_email, name="there"):
    subject = "Your CityPulse password was changed."
    safe_name = escape(str(name or "there"))
    safe_frontend_url = escape(FRONTEND_URL, quote=True)

    text = f"""Hi {name},

Your CityPulse password was just changed successfully.
Login here: {FRONTEND_URL}/login

- CityPulse Team
"""
    html = f"""
    <div>
        <h2>CityPulse</h2>
        <h2>Password changed, {safe_name}</h2>
        <p>Your password was successfully changed on CityPulse.</p>
        <p>You can now log in with your new password.</p>
        <a href="{safe_frontend_url}/login">Log in to CityPulse</a>
        <p>- The CityPulse Team<br/>This is a security notice.</p>
    </div>
    """
    return _send_email(to_email, subject, html, text)


def send_event_reminder(to_email, name, events):
    """Send one daily digest for events saved by a user and happening tomorrow."""
    subject = "Your CityPulse events are coming up tomorrow"
    rows = []

    for event in events:
        title = escape(str(event.get("name") or "Your saved event"))
        when = escape(" ".join(
            str(part) for part in (event.get("date"), event.get("time")) if part
        ))
        where = escape(", ".join(
            str(part) for part in (event.get("venue"), event.get("city")) if part
        ))
        rows.append(
            f"<li><strong>{title}</strong> — {when}"
            + (f" · {where}" if where else "")
            + "</li>"
        )

    safe_name = escape(str(name or "there"))
    safe_frontend_url = escape(FRONTEND_URL, quote=True)

    html = (
        f"<div><h2>Tomorrow on CityPulse, {safe_name}</h2>"
        "<p>Here are the events you saved that are coming up tomorrow:</p>"
        f"<ul>{''.join(rows)}</ul>"
        f'<p><a href="{safe_frontend_url}/my-plans">View your plans</a></p>'
        "<p>— The CityPulse Team</p></div>"
    )

    text_lines = [f"Hi {name or 'there'},", "", "Your saved events happening tomorrow:"]
    for event in events:
        when = " ".join(str(part) for part in (event.get("date"), event.get("time")) if part)
        where = ", ".join(str(part) for part in (event.get("venue"), event.get("city")) if part)
        text_lines.append(
            f"- {event.get('name') or 'Your saved event'} — {when}"
            + (f" · {where}" if where else "")
        )

    text_lines.extend([
        "",
        f"View your plans: {FRONTEND_URL}/my-plans",
        "",
        "— The CityPulse Team",
    ])
    return _send_email(to_email, subject, html, "\n".join(text_lines))
