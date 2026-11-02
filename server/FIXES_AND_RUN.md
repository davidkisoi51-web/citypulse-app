# CityPulse server — fixes and local setup

## Important
This archive contains the Flask API server only, not the React frontend. The local `.env`,
SQLite database, Python virtual environment, and generated cache files have intentionally
been excluded. Create your own `.env` from `.env.example`; do not commit real credentials.

## Main fixes
- Removed an unused `flask_jwt_extended` import that was not declared as a dependency and
  prevented the API from importing in a clean environment.
- Corrected saved-event listing and bulk deletion so they operate on `SavedEvent` records,
  not `Plan` records.
- Added create/list/update/delete operations for saved events, including duplicate detection
  and ownership checks through the parent plan.
- Fixed saved-event date helper properties to use the actual `date` field.
- Added request validation for plan dates, event fields, event statuses, and bulk-delete IDs.
- Added API regression tests for these behaviors.

## Run locally
From this directory:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Configure DATABASE_URL, SMTP credentials, and ADMIN_EMAILS in .env.
flask --app app db upgrade
python seed.py
python -m pytest -q
python app.py
```

The API listens on `http://127.0.0.1:5001`. Health check: `GET /api/health`.

Set `ADMIN_EMAILS` to a comma-separated list of administrator email addresses. Admin status
is included in login and `/api/auth/me` responses and is enforced by admin-only API routes.

Signup and login do not require email verification. Password-reset and event-reminder emails
require working SMTP credentials. For local testing, `EMAIL_DRY_RUN=true` prints email
contents to the server console. Use an app password when your email provider requires one;
do not commit `.env`.

Run database migrations (`flask --app app db upgrade`) on every environment before deploying
the updated server. `DEV_AUTH_STUB=true` is only for local development tests; keep it disabled
in deployed environments.
