# CityPulse Flask API starter

This is a starter for the Phase 2 server. It includes SQLAlchemy models, Flask-Migrate, a health check, initial Plans CRUD, saved-event snapshot endpoints, and basic tests. It is not production-ready until the team's JWT authentication and Ticketmaster proxy are integrated and tested.

## Local setup (Ubuntu)

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Create PostgreSQL database (assuming PostgreSQL is installed and your local role is configured):

```bash
createdb citypulse_dev
```

Set `DATABASE_URL` in `.env` to match your PostgreSQL username/password. Initialize migrations once:

```bash
flask --app app db init
flask --app app db migrate -m "initial CityPulse schema"
flask --app app db upgrade
python seed.py
flask --app app run --port 5001
```

Test in another terminal:

```bash
curl http://127.0.0.1:5001/api/health
curl http://127.0.0.1:5001/api/plans
pytest -q
```

The temporary local auth bridge is controlled by `DEV_AUTH_STUB=true`. It does not validate JWTs and must only be used locally. Set it to `false` and integrate the JWT guard before deploying. Do not commit `.env` or real API keys.

## Endpoints included

- `GET /api/health`
- `GET /api/plans`
- `POST /api/plans`
- `GET /api/plans/<id>`
- `PATCH /api/plans/<id>`
- `DELETE /api/plans/<id>`
- `GET /api/plans/<id>/events`
- `POST /api/plans/<id>/events`
- `PATCH /api/plans/<id>/events/<event_id>`
- `DELETE /api/plans/<id>/events/<event_id>`

## Integration notes

- Amina should replace `auth.require_user` with the agreed JWT verification and current-user lookup. Keep ownership checks in the Plans routes.
- Stephen should add the `/api/events` Ticketmaster proxy and related tests.
- Align the schema and response shapes with the team before merging. `data` wraps successful JSON payloads; errors use `{ "error": { "code": "...", "message": "..." } }`.
- The test suite uses SQLite in memory; CI should also run an integration job against PostgreSQL.
