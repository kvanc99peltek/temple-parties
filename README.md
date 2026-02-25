# Temple Party Finder

> **The go-to party discovery app for Temple University students.**  
> Find out what's happening this weekend — without digging through Instagram stories, YikYak threads, and word-of-mouth chaos.

**Live at → [tuparties.com](https://tuparties.com)**

---

## What It Does

Temple students open the app on their phones and immediately see every approved party happening this Friday and Saturday — ranked by how many people are going. Tap **GOING** to RSVP with your real name, tap **NAVIGATE** to get directions. That's it.

Party info at Temple is scattered. This app centralizes it.

---

## Traction

- **2,000+ weekly visitors** and **5,000+ weekly page visits** — organic, no paid marketing
- Used by Greek life and house parties.

---

## Roadmap

- [x] Party discovery with live RSVP counts
- [x] Interactive map view
- [x] Magic link auth with @temple.edu enforcement
- [x] Admin approval system
- [x] Vercel Analytics integration
- [ ] Real-name RSVP verification (in progress)
- [ ] Microsoft OAuth with Temple SSO
- [ ] Party detail pages with host bios
- [ ] Global discussion feed
- [ ] Multi-campus expansion

---


## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TypeScript |
| Styling | Tailwind CSS |
| Maps | React-Leaflet (OpenStreetMap + dark CARTO tiles) |
| Geocoding | Nominatim (free, open-source) |
| Backend | Python FastAPI |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — magic links, @temple.edu domain enforcement |
| Analytics | Vercel Analytics |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Key Features

**For students**
- Browse parties by Friday / Saturday with live RSVP counts
- Interactive map view with party pins and popups
- One-tap navigation to Apple Maps or Google Maps
- Real-time going counts — see what's getting hyped
- "HYPED" badge on the top party of each night

**For hosts**
- Submit a party through a simple form with address autocomplete (in works)
- Two-tier verification: verified orgs get auto-approval, others go through manual review (in works)
- Host bio and party detail pages (in works)

**For admins**
- Approve / reject pending party submissions
- Admin role enforced at the database level — not settable via API

**Safety & security**
- @temple.edu email enforcement via magic links (no passwords)
- Real-name verification for RSVPs (launching soon)
- Rate limiting on all endpoints (slowapi)
- Input validation via Pydantic on every request

---

## How It Works (Architecture)

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│    FRONTEND      │  HTTP   │    BACKEND       │   SQL   │    DATABASE      │
│    (Next.js)     │ ──────► │    (FastAPI)     │ ──────► │   (Supabase)     │
│                  │ ◄────── │                  │ ◄────── │                  │
└──────────────────┘  JSON  └──────────────────┘  Data  └──────────────────┘
```

The app is a single-page application — no page reloads, just view swaps between Home and Map. All backend calls go through a centralized `api.ts` service layer. Authentication uses JWTs attached to every request via `fetchWithAuth()`.

The weekend system automatically filters parties to the current Friday–Sunday window.

---

## Project Structure

```
temple-parties/
├── frontend/
│   └── src/
│       ├── app/              # Single page (page.tsx) + auth callback
│       ├── components/       # PartyCard, MapView, LoginModal, etc.
│       ├── hooks/            # useParties, useGoingStatus, useModalState
│       ├── contexts/         # AuthContext (global auth state)
│       ├── services/         # api.ts — all backend calls in one place
│       └── lib/              # Supabase client, constants, TypeScript types
│
└── backend/
    └── app/
        ├── routers/          # auth.py, parties.py, admin.py
        ├── models/           # Pydantic models for validation
        ├── services/         # geocoding.py (address → coordinates)
        └── schema/           # SQL schema (001_baseline.sql)
```

---

## About

Built by [Amir](https://github.com/templeterror) and [Kivanc](https://github.com/kvanc99peltek), CS student at Temple University (Beta Theta Pi). Started as a solution to a real problem — now growing into a campus-wide platform.
