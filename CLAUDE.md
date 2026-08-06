# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Temple Party Finder (tuparties.com) — party discovery app for Temple University students. Two independent apps: a Next.js 14 frontend (deployed on Vercel) and a FastAPI backend (deployed on Railway), with Supabase (PostgreSQL + Auth) as the database.

## Commands

### Frontend (run from `frontend/`)

```bash
npm run dev            # dev server on :3000
npm run build          # ALWAYS run before pushing — catches TS errors dev mode misses
npm run lint
npm test               # jest
npm run test:watch
npx jest src/__tests__/dateHelpers.test.ts        # single test file
npx jest -t "test name"                            # single test by name
```

### Backend (run from `backend/`)

```bash
make setup             # one-time: create venv, install deps, copy .env.example → .env
make run               # uvicorn app.main:app --reload on :8000
make test              # pytest (tests/ dir)
. venv/bin/activate && pytest tests/test_parties.py -k test_name   # single test
```

Env files: `frontend/.env.local` and `backend/.env` (both have `.env.example` templates with Supabase keys). Frontend expects `NEXT_PUBLIC_API_URL` pointing at the backend (defaults to `http://localhost:8000`).

## Git Workflow

- **Never push to remote.** The user handles all pushes and deploys. Commit locally only when asked.
- Run `npm run build` in `frontend/` before declaring frontend work done.

## Architecture

### Frontend is a single-page app with state-based views

`frontend/src/app/page.tsx` orchestrates everything via `currentView` state (`'home' | 'map' | 'rankings'`) — views are swapped, not routed. Modals (login, add party, invite, rating, profile) are managed through `useModalState`. Other routes:

- `/demo` — read-only snapshot of a past weekend; uses `useGoingStatus({ readOnly: true })` so demo interactions never mutate real counts or subscribe to realtime.
- `/admin` — party approval UI. Admin is enforced in application code only (`require_admin` in `routers/admin.py` reads `user_profiles.is_admin`); there is no RLS/policy/DB constraint backing it, and the backend uses the service-role key (bypasses RLS). `is_admin` is granted by hand in the Supabase dashboard — `set-username` hardcodes it to `false`.
- `/auth/callback` — magic link landing.

**Launch mode:** auth UI is currently hidden — `isAuthenticated` is hardcoded `false` in `page.tsx`. Going/rating actions work anonymously via localStorage (`temple_parties_going`, `temple_parties_ratings`), with counts persisted through the API and kept live via a Supabase realtime `postgres_changes` subscription in `useGoingStatus`.

### All backend calls go through one service layer

`frontend/src/services/api.ts` exports `authApi`, `partiesApi`, etc. `fetchWithAuth()` attaches the Supabase session JWT as a Bearer token. Never call the backend directly from components — add methods here.

### Two Supabase clients with different keys

- Frontend (`frontend/src/lib/supabase.ts`, anon key): sends magic links, holds the session, realtime subscriptions. Auth goes frontend → Supabase directly; the backend's `/auth/signup` endpoint is unused in the current flow.
- Backend (`backend/app/database.py`, service key): verifies JWTs (`get_current_user` / `require_auth` in `routers/auth.py`) and does all DB reads/writes.

`AUTH file explained.md` at the repo root documents the full auth flow step by step.

### The weekend system

Parties are scoped to a Friday–Saturday weekend keyed by the Friday's date (`weekend_of`). The "which weekend" rule is reimplemented in **four** places that must stay in sync (a known source of drift):

- Backend: `get_current_weekend()` in `routers/parties.py` — US/Eastern; Sat/Sun/Mon resolve to the past Friday, Tue–Fri to the upcoming Friday.
- Frontend: `getUpcomingFridayISO()` in `utils/dateHelpers.ts` — browser-local; passed as `weekendOf` to the API. Note the "before 6 AM counts as the previous day" rule lives only in `getDefaultDay()` (which tab is pre-selected), not in the weekend key.
- `backend/seed_parties.py` `get_next_friday()` and `frontend/src/components/DatePicker.tsx` each carry their own copy.

The backend is US/Eastern while the frontend is browser-local, so the two can disagree for users outside ET.

### Backend structure

FastAPI app in `backend/app/`: routers (`auth`, `parties`, `admin`, `ratings`), Pydantic models in `models/`, `services/geocoding.py` (Nominatim, with fallback coordinates inside `TEMPLE_BOUNDS`). Rate limiting via slowapi covers the write endpoints (see `constants.py` `RATE_LIMITS`) but **not** all endpoints — reads, admin routes, and `DELETE /parties/{id}` are unthrottled. Limits are in-memory/per-process. CORS origins are configured in `app/config.py`.

### Database schema is documentation, not migrations

`backend/schema/` holds numbered SQL files (`001_baseline.sql` …). They are **not auto-applied** — schema changes are made in the Supabase dashboard, then recorded as a new sequentially-numbered file. Host ranking math (Bayesian/Wilson scores) lives in SQL — see files 008–013.

v2 baseline captures: `supabase/migrations/0000_baseline_dev.sql` and `0000_baseline_prod.sql` (capture/reference only — do not re-apply blindly). Security review writeups (`SCHEMA_CAPTURE_NOTES.md`, `DEV_NEVER_PROMOTE.md`) are gitignored — local only; public repo. **Never promote `tuparties-dev` data/schema into prod** (synthetic ratings live there).

### Analytics

Use `trackEvent()` from `utils/analytics.ts` — it fires both Vercel Analytics and PostHog, deferred via `requestIdleCallback`, and never throws. Note: new custom PostHog events can take hours to appear in the PostHog dropdown.

## Styling

Tailwind with a dark theme (black bg, purple `#b24bf3` primary, green `#10B981`). Custom shadows/animations in `tailwind.config.ts`, global utilities in `globals.css`. Map popup styles are plain CSS in `globals.css` (not Tailwind) because Leaflet generates its own HTML outside React.

## Repo Notes

- `frontend_local_backup/` and `backend_local_backup/` are stale copies — never edit them.
- Ratings are binary thumbs up/down (`ThumbsRating`); `StarRating` is legacy.
- Root-level `.md` files (`host_rating.md`, `host_feature_migration.md`, etc.) are feature/design docs.
- Living build status: `progress.md`. Ordered v2 work: `specs/version2/to-do.md` (local-only / gitignored).
