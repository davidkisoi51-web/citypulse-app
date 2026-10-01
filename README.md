# CityPulse

> **Discover, search, and explore live events.**
> CityPulse is a web app for finding concerts, sports matches, theatre and family events, powered by the Ticketmaster Discovery API.

---

## Project Overview

CityPulse is a React (Vite) single-page app. It fetches events from the Ticketmaster Discovery API and falls back to built-in sample events (with an on-screen notice) when the API is unreachable or no API key is configured. GitHub Actions lints, tests and builds every push and pull request.

### What works today
* **Search and category filter:** typing (debounced) and picking a category both query the Ticketmaster API, so results are not limited to the first page loaded.
* **Event grid:** responsive cards with poster, date/time, venue, price and a ticket link; loading skeletons while fetching.
* **Featured banner:** highlights the soonest upcoming event.
* **Event details drawer:** poster, date, price, venue with a Google Maps link and a ticket button; keyboard accessible (focus trap, Esc to close).
* **Sample-event fallback:** if the live call fails, sample events are shown with a notice that explains why.
* **CI:** lint, unit tests and production build on every push/PR to `main` and `dev`.

### Planned (not built yet)
* Date-range and city filters in the UI (the API layer already accepts `city`, `startDate`, `endDate`).
* Search-history persistence in local storage (Role 5).
* Footer component (Role 6).
* Real login (the "Log in" button is a demo stub).
* Flask + PostgreSQL backend (would also let us keep the API key off the browser).

---

## Tech Stack

* **Frontend:** React 19, Vite, plain CSS, React Router (currently only used for the logo link)
* **External API:** Ticketmaster Discovery API v2
* **Tests:** Node's built-in test runner (`node --test`), no extra dependencies
* **CI/CD:** GitHub Actions (Node from `.nvmrc`), branch protection rules
* **Project management:** ClickUp (Kanban and sprint tracking)

---

## Team Directory & Role Allocations

| Name | Role | Core Deliverables | GitHub |
| :--- | :--- | :--- | :--- |
| **David Kisoi** *(Lead)* | Role 4: Event Detail Modal | `EventDetailModal.jsx`, UX lead, repo maintainer | [@davidkisoi51-web](https://github.com/davidkisoi51-web) |
| **Stephen Njenga** | Role 1: API & Data Engineer | `services/eventsApi.js`, `utils/normalizeEvent.js`, Ticketmaster fetching | [@OTruce](https://github.com/OTruce) |
| **Karimi Moreen** | Role 2: Search UI Lead | `SearchBar.jsx` (the category dropdown currently lives in `NavBar.jsx`) | [@Moreen-Mwirigi](https://github.com/Moreen-Mwirigi) |
| **Heidi Temba** | Role 3: Event Grid Lead | `EventGrid.jsx` and `EventCard.jsx`, responsive layouts | [@1920heidi](https://github.com/1920heidi) |
| **Amina Kavele** | Role 5: State & Local Storage Lead | Client state, browser-storage hook (planned) | [@wumeibomb](https://github.com/wumeibomb) |
| **Kayte Njeri** | Role 6: UI Layout Lead | `NavBar.jsx` (done), `Footer.jsx` (planned) | [@KayteNjeri](https://github.com/KayteNjeri) |

---

## Getting Started (Local Setup)

### Prerequisites
* **Node.js 20.19+ or 22.13+** (Vite 8 and ESLint 10 require it; `.nvmrc` pins 22, so `nvm use` works)
* **npm** 10 or higher
* **Git**
* A free Ticketmaster API key from <https://developer.ticketmaster.com/> (optional: without it the app shows sample events)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/davidkisoi51-web/citypulse-app.git
   cd citypulse-app
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Add your API key:**
   ```bash
   cp .env.example .env
   ```
   Then open `.env` (in the project root, next to `package.json`) and paste your key:
   ```
   VITE_TICKETMASTER_API_KEY=your_consumer_key
   VITE_DEFAULT_CITY=Nairobi
   ```
   * Get the key at <https://developer.ticketmaster.com/> → **My Apps** → **Consumer Key**.
   * `.env` is git-ignored, so it never comes down with `git clone`/`git pull`: every teammate creates their own. Never commit a key.
   * Vite only reads `.env` at startup: **restart `npm run dev`** after creating or editing it.
   * `VITE_` variables are bundled into the browser build, so anyone using the site can read the key.
   * CI doesn't use your `.env`; it reads the repository secret `VITE_TICKETMASTER_API_KEY` (Settings → Secrets and variables → Actions).
4. **Start the dev server:**
   ```bash
   npm run dev
   ```

### After every `git pull`

If `package.json` or `package-lock.json` changed, run `npm install` again. A teammate may have added a package (for example `react-router-dom`), and the app won't build until it's installed on your machine.

### Scripts

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run lint` | ESLint (CI fails on errors) |
| `npm test` | Unit tests in `src/tests/` with Node's built-in runner: event-shape contract, API success/empty/error/fallback, date and price formatting, next-event logic |
| `npm run preview` | Serve the production build locally |

### Environment variables

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `VITE_TICKETMASTER_API_KEY` | No | Ticketmaster key. Missing → sample events + notice. |
| `VITE_DEFAULT_CITY` | No | Restrict live results to a city when the user hasn't chosen one. |

### Troubleshooting

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| `npm run build` / `npm run dev` fails with `failed to resolve import "react-router-dom"` (or any other package) | The package is listed in `package.json` but not installed locally | `npm install` |
| `npm error enoent Could not read package.json` | You ran npm from the wrong folder (e.g. the parent `Project1/`) | `cd citypulse-app` first |
| Browser console: `Ticketmaster fetch failed` / `401`, and a "Showing sample events" notice | No `.env`, empty key, or the dev server was started before `.env` existed (the key is sent as `undefined`) | Create `.env` as in step 3, then restart `npm run dev` |
| `npm run lint` reports `'x' is assigned a value but never used` | Leftover variables | Remove them, or use them (e.g. pass `loading`/`error` from `useEvents()` to `EventGrid`) |
| Cards show "Invalid Date", no price, or a dead "Get tickets" link on live data | An event object isn't in the shared shape (see **One event shape** below) | Pass API results through `utils/normalizeEvent.js` |
| `git push origin citypulse-app` → `src refspec ... does not match any` | `citypulse-app` is the repo name, not a branch | `git push -u origin <your-branch-name>` |

---

## How data flows

```
SearchBar / category dropdown  ->  App.jsx (debounced filters)
   ->  useEvents()  ->  services/eventsApi.js
        ->  Ticketmaster API  ->  utils/normalizeEvent.js  ┐
        ->  (on failure / no key) sample events + notice   ├->  events[]
   ->  FeaturedBanner, EventGrid -> EventCard, EventDetailModal
```

**One event shape.** `utils/normalizeEvent.js` defines the only event shape in the app
(`id, name, url, image, date, time, venue, city, category, priceMin, priceMax, currency`; missing values are `null`).
`eventsApi.js` must return events in that shape, and `data/mockEvents.js` and every component read it.
Don't add a second shape: that mismatch has broken the UI twice. `npm test` includes a contract test that fails if it drifts.

---

## Contributing

* Branch from `dev`, open a pull request into `dev`; `main` only receives tested `dev` merges.
* Before pushing: `npm run lint && npm test && npm run build`.
* If `package-lock.json` conflicts in a merge, don't hand-edit it: take one side, run `npm install`, and commit the result.

## FOR PRACTICE 
