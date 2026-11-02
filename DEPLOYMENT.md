# CityPulse: local testing and Render deployment

## What changed in this repair

- Moved GitHub Actions CI to the repository-root `.github/workflows/ci.yml` so GitHub can discover it.
- CI now runs client unit tests, UI tests, ESLint, and the production build, plus API tests against PostgreSQL.
- Fixed client lint failures caused by a leftover authentication helper and duplicate login/signup requests.
- Connected signup/login to the Flask JWT endpoints instead of relying only on localStorage demo accounts.
- Fixed password hashing/checking and the protected-route authentication adapter.
- Normalized Render's `postgres://`/`postgresql://` database URLs for the installed psycopg 3 driver.
- Replaced the inconsistent Alembic revision chain with one baseline migration for a fresh deployment database.
- Added `render.yaml` for the Flask API, React static site, and PostgreSQL database.
- Removed local `.env` files from the deliverable and added safer ignore rules.

## Local setup

### 1. API

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `server/.env` with a strong `FLASK_SECRET_KEY`, a separate strong `JWT_SECRET_KEY`, your local PostgreSQL `DATABASE_URL`, and your Ticketmaster key. For local development only, `DEV_AUTH_STUB=true` is shown in the example; protected routes use the stub only under Flask testing mode. Do not enable a development auth bypass in a deployed service.

Create the local database, then run:

```bash
flask --app app db upgrade
flask --app app run --host 127.0.0.1 --port 5001
```

In a second terminal, check health:

```bash
curl -i http://127.0.0.1:5001/api/health
```

### 2. Client

```bash
cd client
npm ci
cp .env.example .env
npm run dev
```

Set `VITE_API_URL=http://localhost:5001/api` in `client/.env`. Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

## Run checks before pushing

Client, from `client/`:

```bash
npm ci
npm test
npm run test:ui
npm run lint
npm run build
```

API, from `server/` with the dependencies installed and a test database available:

```bash
pip install -r requirements.txt
TEST_DATABASE_URL='postgresql+psycopg://USER:PASSWORD@localhost:5432/citypulse_test' pytest -q
```

The API tests create and drop their tables, so use a dedicated disposable test database, never your development or production database. CI provisions its own PostgreSQL service.

## Render deployment

1. Push the repaired repository to GitHub.
2. In Render, choose **New + → Blueprint** and select the repository. Render will read `render.yaml`.
3. Configure `TICKETMASTER_API_KEY`, `ADMIN_EMAILS`, and the SMTP sender credentials (`SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`) when prompted. Use a provider app password where required. Do not add a `VITE_` prefix to server-only secrets.
4. Confirm the API service has `DEV_AUTH_STUB=false`, `FLASK_DEBUG=false`, and both generated secret keys.
5. Confirm the static site's `VITE_API_URL` points to the API's public URL plus `/api` (the blueprint defaults to `https://citypulse-api.onrender.com/api`). If Render gives the services different names/URLs, update this value and redeploy the static site.
6. Set the API's `CORS_ORIGINS` to the exact public static-site origin, with no trailing slash. If you add a custom domain, include that origin too.
7. Let the API's pre-deploy command run `flask --app app db upgrade`. Confirm `/api/health` returns HTTP 200 and `{"status":"ok","database":"connected"}`.
8. Open the frontend URL and test signup, logout/login, event loading, saving an event to a plan, editing a plan, and deleting a saved event.

### Database migration

The current migration adds the purchase/transfer schema and removes the unintended unique
constraint on user names. Apply it with `flask --app app db upgrade` before deploying the
updated API. Back up an existing production database before upgrading, and verify its Alembic
revision if it was created outside the checked-in migration history.

### Secrets

The uploaded archive included local environment files and a Ticketmaster-looking credential. Those local `.env` files are not included in this repaired package. If that credential is real or was ever committed/shared, revoke and rotate it in the Ticketmaster developer portal, and check Git history for other exposed secrets. Keep all production secrets in Render environment settings.
