# CityPulse Engineering Rulebook & Development Standards

This document serves as the mandatory engineering contract for all developers working on the CityPulse codebase. Every pull request, feature, and code modification is evaluated against the standards, contracts, and workflows defined here.

---

## 1. Core Engineering Philosophy

### 1.1 The Definition of Done

Writing code that works locally is only the first step of development. A feature is defined as **DONE** if and only if all of the following criteria are met:

* [ ] **Implementation:** Code is written according to architectural boundaries.
* [ ] **Integration:** Connected properly to the application lifecycle without breaking existing features.
* [ ] **Data Contract:** Respects the canonical data models without introducing duplicate transformations.
* [ ] **Resilience:** Defensive handling for loading, empty, and error states is present.
* [ ] **Testing:** Relevant unit and integration tests are created or updated.
* [ ] **Quality Checks:** Local linting (`npm run lint`), tests (`npm test`), and production build (`npm run build`) pass.
* [ ] **CI Pipeline:** Remote GitHub Actions pipeline runs clean (Green) on the pull request.
* [ ] **Documentation:** `README.md` and inline configurations are updated if behavior or environment dependencies change.
* [ ] **Code Review:** Approved by at least one maintainer.

### 1.2 The Integration Rule

Git is a line-based version control tool; it does not perform semantic or architectural validation. A successful text merge does **not** indicate a working application. Developers modifying shared integration points must understand the entire dependency chain of the file they are editing.

---

## 2. Directory Structure & Layer Responsibilities

```text
citypulse-app/
│
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── user_story.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── public/
│   └── images/
│
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── NavBar/
│   │   ├── SearchBar/
│   │   ├── EventCard/
│   │   ├── EventGrid/
│   │   ├── FeaturedBanner/
│   │   └── EventDetailModal/
│   ├── services/
│   │   └── eventsApi.js
│   ├── hooks/
│   │   └── useEvents.js
│   ├── utils/
│   │   ├── normalizeEvent.js
│   │   ├── formatEvent.js
│   │   └── nextEvent.js
│   ├── data/
│   │   └── mockEvents.js
│   ├── tests/
│   │   ├── eventsApi.test.js
│   │   ├── normalizeEvent.test.js
│   │   ├── formatEvent.test.js
│   │   └── nextEvent.test.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── .env.example
├── .gitignore
├── .nvmrc
├── eslint.config.js
├── package.json
└── vite.config.js

```

### Layer Boundaries

1. **`src/components/` (Presentation)**
* Responsible strictly for UI rendering and capturing user events.
* Must **not** contain direct API fetch calls, complex data normalization, or global state orchestration.


2. **`src/services/` (External Communication)**
* Manages HTTP requests, endpoint constructs, headers, and error code translations.
* Interacts directly with external APIs (e.g., Ticketmaster).


3. **`src/hooks/` (Lifecycle & State Management)**
* Encapsulates asynchronous execution, loading states, error states, and data fetching lifecycles.


4. **`src/utils/` (Pure Utilities & Transformations)**
* Contains stateless, pure functions (e.g., data normalization, date formatting, sorting algorithms).
* Must be fully unit-tested.


5. **`src/data/` (Fallback Data)**
* Houses static mock data for fallback scenarios or local offline testing. Must never silently replace primary application data flow without explicit configuration.



---

## 3. Data Architecture & Contracts

### 3.1 Canonical Event Model

All event data consumed by components **must** conform to the canonical `CityPulse Event` shape. External API structures must never leak directly into presentation components.

```json
{
  "id": "string",
  "name": "string",
  "url": "string | null",
  "image": "string | null",
  "date": "string | null",
  "time": "string | null",
  "venue": "string | null",
  "city": "string | null",
  "category": "string | null",
  "priceMin": "number | null",
  "priceMax": "number | null",
  "currency": "string | null"
}

```

### 3.2 Single Normalization Pipeline

Data normalization must occur strictly once at the API service layer using the single canonical utility `normalizeEvent.js`.

```text
Ticketmaster Raw Data
        │
        ▼
   services/eventsApi.js
        │
        ▼
   utils/normalizeEvent.js
        │
        ▼
   Canonical CityPulse Event
        │
  ┌─────┴──────────┬──────────────┐
  ▼                ▼              ▼
EventCard      EventGrid      EventDetailModal

```

* **Forbidden:** Accessing deep raw paths inside components (e.g., `event._embedded.venues[0].city.name`).
* **Forbidden:** Declaring secondary normalization functions inside service files or custom hooks.

---

## 4. API Handling & Resilience Standard

### 4.1 State Distinctions

UI layers consuming API data must explicitly handle five distinct execution states:

| State | Definition | Required UI Behavior |
| --- | --- | --- |
| **LOADING** | Request in flight | Render loading skeletal indicators or spinners. |
| **SUCCESS** | Request returned $\ge 1$ item | Render event grid/cards using canonical model. |
| **EMPTY** | Request returned $0$ items | Display explicit "No events match criteria" message. |
| **ERROR** | HTTP or Network failure | Display user-facing error message with retry prompt. |
| **FALLBACK** | Unhandled error / Offline mode | Render mock data with a visible warning banner. |

### 4.2 Race Condition & Memory Protection

* All asynchronous API calls initiated inside hooks or components must implement `AbortController` to cancel pending requests when parameters change or components unmount.
* Out-of-order network responses must not overwrite current UI state.

### 4.3 URL and Missing Data Conventions

* Optional fields must explicitly evaluate to `null` if missing, never `"#"`, `""`, or `"N/A"`.
* Conditionals in components must guard against missing data (e.g., render ticket links only when `event.url !== null`).

---

## 5. Development Workflow & Git Standards

### 5.1 Branching Model

* **`main`**: Protected. Production-ready code only.
* **`dev`**: Integration branch for active development.
* **`feature/*`**: Individual feature branches created from `dev`.
* **`bugfix/*`**: Defect resolution branches created from `dev`.

### 5.2 Branch Execution Sequence

1. Standardize Node version: verify `.nvmrc` locally using `nvm use`.
2. Sync target: `git checkout dev && git pull origin dev`
3. Branch creation: `git checkout -b feature/your-feature-name`
4. Commit frequently using conventional messages.
5. Prior to PR submission: run local verification scripts (`npm run lint`, `npm test`, `npm run build`).

### 5.3 Conventional Commit Format

All commit messages must follow the structured format: `<type>: <short explanation>`

* `feat:` A new user-facing feature.
* `fix:` A bug fix.
* `test:` Adding or correcting tests.
* `refactor:` Code change that neither fixes a bug nor adds a feature.
* `docs:` Documentation-only changes.
* `chore:` Build process, dependency, or configuration changes.

---

## 6. Continuous Integration & Quality Controls

### 6.1 Protected Architecture Files

Changes to high-risk shared infrastructure require mandatory secondary review. High-risk files include:

* `src/App.jsx`
* `package.json` / `package-lock.json`
* `.github/workflows/ci.yml`
* `vite.config.js`
* `src/utils/normalizeEvent.js`

### 6.2 CI Pipeline Requirements

The repository pipeline (`ci.yml`) enforces automated verification. Disabling, bypassing, or deleting pipeline steps to force a build to pass is strictly prohibited.

```text
[Checkout Code]
       │
       ▼
[Setup Node 22 (via .nvmrc)]
       │
       ▼
[Clean Install (npm ci)]
       │
       ▼
[Static Analysis (npm run lint)]
       │
       ▼
[Automated Tests (npm test)]
       │
       ▼
[Production Build (npm run build)]

```

### 6.3 State Mutation Rules

* Direct mutation of shared state or raw data structures is prohibited (e.g., `mockEvents.sort()`).
* Always operate on immutable copies: `const sorted = [...events].sort(...)`.

---

## 7. Testing Requirements

### 7.1 Minimum Required Test Coverage

```text
src/tests/
├── normalizeEvent.test.js   # Standard data, missing properties, invalid payloads
├── eventsApi.test.js        # Success state, empty arrays, HTTP errors, fallbacks
├── formatEvent.test.js      # Date parsing, edge-case currencies, null values
└── nextEvent.test.js        # Future events, past filtering, empty arrays

```

### 7.2 Code Hygiene Standards

* **No Phantom Comments:** Comments indicating functional implementations must match the executed code underneath them.
* **No Placeholders:** Empty functions connected to UI triggers (e.g., `function clickHandler() {}`) are prohibited in merged branches. Label as explicitly disabled or omit from the interface.

---

## 8. Development Checklist

Before submitting a Pull Request, confirm that all checks are satisfied:

### Architecture & Data

* [ ] Code follows the single `CityPulse Event` canonical model.
* [ ] No API parsing logic exists inside React presentation components.
* [ ] Utility functions are pure and free of side effects.

### Robustness & Errors

* [ ] API responses handle errors, zero results, and loading indicators cleanly.
* [ ] Async operations handle cancellation (`AbortController`).
* [ ] Array operations do not mutate original references.

### Git & Verification

* [ ] Branch is branched off the latest `dev`.
* [ ] Local pipeline passes cleanly:
```bash
npm ci
npm run lint
npm test
npm run build

```


* [ ] PR description specifies: **What** changed, **Why**, **Files Modified**, and **Testing Conducted**.