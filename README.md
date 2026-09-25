#  CityPulse

> **Discover, Search, and Explore Live Events in Real-Time.**  
> CityPulse is an intuitive web application designed to help users search and filter live events, concerts, sports matches, and cultural gatherings powered by the Ticketmaster Discovery API.

---

##  Project Overview

CityPulse serves as a modern event discovery platform built with high performance, clean architecture, and strict software engineering practices in mind. The project leverages **React (Vite)** for a fast responsive UI, **Flask & PostgreSQL** for robust backend data persistence, and **GitHub Actions** for automated build and test pipelines.

###  Key Features
* **Smart Event Search & Filtering:** Filter events by city keyword, event category (Music, Sports, Arts), and custom date ranges.
*  **Responsive Event Grid:** Dynamic card view with venue badges, pricing, date/time formatting, and poster images.
*  **Event Details Modal/Drawer:** In-depth view featuring venue geolocation addresses, high-res posters, and direct ticketing access.
*  **App Header & Footer Layout:** Clean navigation header with app branding and a cohort credit footer.
*  **Search History Persistence:** Local storage integration preserving recent searches across user sessions.
*  **Automated CI/CD:** GitHub Actions test pipeline verifying bundle integrity and dependencies on every push.

---

## Tech Stack & Infrastructure

* **Frontend:** React 18, Vite, Modern CSS / Tailwind CSS
* **Backend Framework:** Flask (Python 3.12+)
* **Database:** PostgreSQL
* **External APIs:** Ticketmaster Discovery API v2
* **CI/CD & DevOps:** GitHub Actions (Node 22 Runner), GitHub Branch Protection Rules
* **Project Management:** ClickUp (Kanban & Sprint Tracking)

---

## 👥 Team Directory & Role Allocations

| Name | Role | Core Deliverables | GitHub / Email |
| :--- | :--- | :--- | :--- |
| **David Kisoi** *(Lead)* | Role 4: Event Detail Modal | Modal / Drawer Component, UX Lead, Repo Maintainer | [@davidkisoi51-web](https://github.com/davidkisoi51-web) |
| **Stephen Njenga** | Role 1: API & Data Engineer | `eventsApi.js` Service Layer, Ticketmaster Fetching | [@OTruce](https://github.com/OTruce) |
| **Karimi Moreen** | Role 2: Search UI Lead | `SearchBar.jsx` Control Bar, Category Filters | [@Moreen-Mwirigi](https://github.com/Moreen-Mwirigi) |
| **Heidi Temba** | Role 3: Event Grid Lead | `EventGrid.jsx` & `EventCard.jsx`, Responsive Layouts | [@1920heidi](https://github.com/1920heidi) |
| **Amina Kavele** | Role 5: State & Local Storage Lead | Client State Sorting, Browser Storage Hook | [@wumeibomb](https://github.com/wumeibomb) |
| **New Team Member** | Role 6: UI Layout Lead | `Navbar.jsx` Header & `Footer.jsx` Components | `canjeri91@gmail.com` |

---

## Getting Started (Local Setup)

Follow these steps to clone the repository, install local dependencies, and run the development server.

### Prerequisites
* **Node.js** v20.x or v22.x
* **npm** v10.x or higher
* **Git** installed on your system

### Installation Steps

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/davidkisoi51-web/citypulse.git](https://github.com/davidkisoi51-web/citypulse.git)
   cd citypulse