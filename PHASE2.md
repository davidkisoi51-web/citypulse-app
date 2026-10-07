# CityPulse Phase 2 — Full-Stack Technical Plan

> **Stack:** React (Client) | Flask (REST API) | PostgreSQL + SQLAlchemy (Database) | Ticketmaster API (External Data)
>
> **Workflow:** Feature Branches → Pull Requests → `dev` → `main`

## 1. Executive Summary & Core Objective

Phase 2 transitions CityPulse from a frontend prototype into a full-stack web application.

* **Core Feature ("My Plans"):** Authenticated users can discover events, save them to default (**"Want to go"**) or custom plans, assign event statuses (`Interested` / `Going`), and attach personal notes.
* **Architectural Separation:** External Ticketmaster events are proxied through Flask. Persistent user domain data (Users, Plans, Saved Event Snapshots) is owned by CityPulse and stored in PostgreSQL.

## 2. System Architecture & Metaphor

```text
[ Ticketmaster API ] (External Supplier)
         │
         ▼
  [ Flask API ] (Kitchen: Auth, Validation, Proxy, Logic)
   │         ▲
   │ HTTP    │ SQLAlchemy
   ▼         ▼
[ React ]   [ PostgreSQL ] (Fridge: Persistent Source of Truth)
 (Dining)     (Database)
```

* **Data Ownership:** Ticketmaster data can change or expire. Saving an event writes a **point-in-time snapshot** to PostgreSQL, ensuring saved data remains intact.
* **API Proxy:** All Ticketmaster calls route through Flask (`/api/events`). The API key is stored exclusively on the server (`.env`), keeping client code secret-free.

## 3. Project Structure

```text
citypulse-app/
├── client/                 # React Frontend (Vite)
│   ├── src/
│   │   ├── api/            # Shared client & domain API endpoints
│   │   ├── components/     # Reusable UI (HeartButton, Modal, etc.)
│   │   └── pages/          # My Plans, Plan Details, etc.
│   └── .env.example
├── server/                 # Flask REST API
│   ├── app.py
│   ├── models.py
│   ├── seed.py
│   ├── routes/             # auth.py, events.py, plans.py
│   ├── tests/
│   └── .env.example
└── README.md
```

## 4. Database Schema

```text
users (1) ───────< (N) plans (1) ───────< (N) saved_events
```

### Tables

#### `users`

| **Column**      | **Type** | **Constraints**  | **Notes**             |
| --------------- | -------- | ---------------- | --------------------- |
| `id`            | Integer  | Primary Key      | Unique ID             |
| `name`          | String   | Not Null         | Display name          |
| `email`         | String   | Unique, Not Null | Account login         |
| `password_hash` | String   | Not Null         | Bcrypt / hashed value |
| `created_at`    | DateTime | Default UTC      | Timestamp             |

#### `plans`

| **Column**    | **Type** | **Constraints**                             | **Notes**                        |
| ------------- | -------- | ------------------------------------------- | -------------------------------- |
| `id`          | Integer  | Primary Key                                 | Unique ID                        |
| `user_id`     | Integer  | Foreign Key (`users.id`), ON DELETE CASCADE | Owner                            |
| `title`       | String   | Not Null                                    | e.g., "Want to go", "Date night" |
| `description` | Text     | Nullable                                    | Optional details                 |
| `plan_date`   | Date     | Nullable                                    | Planned event date               |
| `city`        | String   | Nullable                                    | Location filter                  |
| `created_at`  | DateTime | Default UTC                                 | Timestamp                        |

#### `saved_events`

| **Column**          | **Type** | **Constraints**                             | **Notes**                |
| ------------------- | -------- | ------------------------------------------- | ------------------------ |
| `id`                | Integer  | Primary Key                                 | Unique ID                |
| `plan_id`           | Integer  | Foreign Key (`plans.id`), ON DELETE CASCADE | Parent Plan              |
| `ticketmaster_id`   | String   | Not Null                                    | External event reference |
| `name`              | String   | Not Null                                    | Event Snapshot Data      |
| `url`               | String   | Nullable                                    | Ticketmaster Link        |
| `image`             | String   | Nullable                                    | Poster image URL         |
| `date` / `time`     | String   | Nullable                                    | Event schedule           |
| `venue` / `city`    | String   | Nullable                                    | Location snapshot        |
| `category`          | String   | Nullable                                    | Music, Sports, etc.      |
| `price_min` / `max` | Float    | Nullable                                    | Pricing info             |
| `currency`          | String   | Nullable                                    | e.g., `KES`, `USD`       |
| `note`              | Text     | Nullable                                    | Personal user note       |
| `status`            | String   | Default `'interested'`                      | `interested` or `going`  |
| `created_at`        | DateTime | Default UTC                                 | Timestamp                |

> **Constraint:** `UNIQUE(plan_id, ticketmaster_id)` prevents saving the same event multiple times within a single plan.

## 5. REST API Specification

All protected routes require a JWT bearer header:

```text
Authorization: Bearer <token>
```

### Authentication (`/api/auth`)

* `POST /register` → `{ name, email, password }` → Returns user object & JWT.
* `POST /login` → `{ email, password }` → Returns user object & JWT.
* `GET /me` → Returns details for currently authenticated user token.

### Events Proxy (`/api/events`)

```text
GET /?keyword=&city=&category=&startDate=&endDate=
```

Proxies calls to Ticketmaster, hides the API key, and returns standard normalized JSON.

### Plans (`/api/plans`)

* `GET /` → Fetch all plans owned by authenticated user.
* `POST /` → `{ title, description, plan_date, city }` → Create new plan.
* `GET /<id>` → Fetch single plan details (verifies ownership).
* `PATCH /<id>` → Update plan details (verifies ownership).
* `DELETE /<id>` → Delete plan and cascade-delete saved events.

### Saved Events (`/api/plans/<id>/events`)

* `GET /` → Fetch all saved events for a specific plan.
* `POST /` → Store snapshot of event into plan.
* `PATCH /<event_id>` → `{ note, status }` → Update user note or status (`interested` / `going`).
* `DELETE /<event_id>` → Remove event from plan.

## 6. Team Ownership & Responsibilities

| **Team Member** | **Domain**            | **Scope & Deliverables**                                                                                                                                         |
| --------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **David**       | Lead / Infrastructure | Project structure reorganization (`client/`, `server/`), Flask setup, PostgreSQL/SQLAlchemy initial migrations & seed data, PR reviews, integration.             |
| **Stephen**     | Events & CI/CD        | `routes/events.py` API proxy, frontend `eventsApi.js` integration, Postman endpoint tests, GitHub Actions CI updates (PostgreSQL test runs).                     |
| **Amina**       | Authentication        | JWT authentication system (`routes/auth.py`), registration/login, password hashing, user session state, shared frontend API client (`client.js`).                |
| **Moreen**      | Plans API             | `routes/plans.py` CRUD endpoints for Plans & Saved Events, database relationship cascades, strict authorization & ownership validation checks.                   |
| **Heidi**       | Plans UI              | Build user screens (`My Plans`, `Plan Details`), manage client state for plan creation, editing, event status toggles, and notes.                                |
| **Kayte**       | Component UI/UX       | `HeartButton` integration, dynamic navigation bar (Auth state), global reusable UI components (`LoadingSpinner`, `ErrorMessage`, `ConfirmDialog`, `EmptyState`). |

## 7. Execution Roadmap & Milestones

### Phase 2A: Foundation & Contract (Part 1)

1. Reorganize repo root into `client/` and `server/`.
2. DB setup (PostgreSQL, Flask-Migrate, Models, Seeds).
3. 20-minute frontend-backend API contract sync.

### Phase 2B: MVP Slice (Part 2)

1. Run server on port `5001` (avoiding macOS port 5000 conflicts).
2. Wire up temporary auth stub (`get_current_user()`).
3. Complete end-to-end slice:

```text
React My Plans UI
        ↕
Flask GET /api/plans
        ↕
PostgreSQL
```

### Phase 2C: Full-Stack Integration (Part 3)

1. Swap auth stub for Amina's JWT authentication system.
2. Replace client-side Ticketmaster calls with Stephen's Flask `/api/events` proxy. Remove API keys from client `.env`.
3. Connect Heidi's Plans UI to Moreen's Plans & Saved Event endpoints.
4. Integrate Kayte's global UI components (`HeartButton`, loading, empty states).

### Phase 2D: Feature Freeze & Polish (Part 4)

1. **NO NEW FEATURES.** Focus strictly on bug fixes, error handling (converting DB exceptions to user-friendly UI alerts), and responsive layout tweaks.
2. Perform multi-user manual testing to verify strict data isolation (User A cannot view or edit User B's resources).
3. Finalize documentation and test CI pipeline output.

## 8. Quick-Start Local Setup

### Server Setup

```bash
cd server

python -m venv venv

source venv/bin/activate
# Windows:
# venv\Scripts\activate

pip install -r requirements.txt

createdb citypulse_dev

cp .env.example .env
# Set DATABASE_URL, JWT_SECRET, TICKETMASTER_API_KEY

flask db upgrade

python seed.py

flask run --port=5001
```

### Client Setup

Open a second terminal:

```bash
cd ../client

npm install

npm run dev
```
