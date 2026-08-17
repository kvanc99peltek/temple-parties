# Epic 10 — Launch cutover runbook (owner)

Code for 10.2 / 10.3 / 10.5 / 10.6 is in the repo. This file is the **owner ops** checklist for prod. Do not apply cutover or RLS to `tuparties-dev` (synthetic ratings; see `supabase/DEV_NEVER_PROMOTE.md`).

**Order matters:**

1. Deploy backend with anon going endpoints removed (10.2)
2. Apply safe-early migrations if not already on prod (0001 / 0002)
3. Apply cutover migrations (10.1 → 0003 / 0004)
4. Apply RLS tighten (10.4 → 0006)
5. Set Railway `CORS_ORIGINS` (10.6)
6. Manual launch QA (10.7–10.13)

---

## 10.1 — Cutover migrations (prod)

### Prerequisite

- Epic **10.2** deployed: `POST /parties/{id}/going/anonymous` and `.../decrement` return **404**.
- Safe-early already on prod (or apply first):
  - `supabase/migrations/0001_v2_safe_early_columns_indexes.sql`
  - `supabase/migrations/0002_v2_storage_buckets.sql`
  - Auth hook/profile trigger if not yet: `0005_auth_profile_trigger_domain_hook.sql` (+ dashboard steps in `auth-otp-setup.md`)

### Apply (SQL editor on **prod**, low-usage window)

1. `supabase/migrations/0003_cutover_going_count_trigger.sql`  
   (= `backend/schema/016_cutover_going_count_trigger.sql`)
2. `supabase/migrations/0004_cutover_party_ratings_user_id.sql`  
   (= `backend/schema/017_cutover_party_ratings_user_id.sql`)

### Verify

```sql
-- going_count must match party_going row counts (expect 0 rows)
SELECT p.id, p.going_count AS stored,
       COALESCE(g.cnt, 0) AS from_rows
FROM public.parties p
LEFT JOIN (
  SELECT party_id, COUNT(*)::int AS cnt
  FROM public.party_going
  GROUP BY party_id
) g ON g.party_id = p.id
WHERE p.going_count IS DISTINCT FROM COALESCE(g.cnt, 0);

-- user_id column + partial unique index
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'party_ratings' AND column_name = 'user_id';

SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND indexname = 'party_ratings_party_id_user_id_key';
```

Smoke: logged-in RSVP (`POST/DELETE /parties/{id}/going`) and rate (`POST /ratings/{id}`) against prod API.

---

## 10.4 — RLS tighten (prod only)

**Do not apply to tuparties-dev** — intentional open-dev divergence.

### Apply

Run `supabase/migrations/0006_prod_rls_tighten.sql`  
(= `backend/schema/019_prod_rls_tighten.sql`)

### What it does

| Change | Why |
|--------|-----|
| Drop `Authenticated can insert parties` | Creates go through FastAPI service-role only |
| `REVOKE ALL` on five public tables from `anon`/`authenticated` | Excess grants were never the real gate |
| `GRANT SELECT` on `parties` only | Realtime + approved-party browse via anon key |
| Add `parties` to `supabase_realtime` | Live going counts in `useGoingStatus` |
| Normalize posters mime types | Fix legacy `wenp` typo → `webp` |

### Verify

```sql
-- parties published
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'parties';

-- anon/authenticated should not have INSERT/UPDATE/DELETE on parties
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'parties'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- insert policy gone
SELECT polname FROM pg_policy
WHERE polrelid = 'public.parties'::regclass;
```

Browser: open feed while logged out; mark going while logged in; confirm going count updates live without refresh. Confirm PostgREST with the **anon** key cannot `INSERT` into `parties` or read `user_profiles`.

**Never** enable RLS on a table that has zero policies without first adding a SELECT policy (hard lockout).

---

## 10.6 — Railway CORS

Code default is now production domains only (`backend/app/config.py`). Still set env explicitly:

```
CORS_ORIGINS=https://tuparties.com,https://www.tuparties.com,https://templeparties.com,https://temple-parties.vercel.app
```

Restart the Railway service. Confirm browser requests from `https://tuparties.com` succeed and a random origin is rejected.

Local/dev: set `CORS_ORIGINS` in `backend/.env` (see `.env.example`).

---

## 10.7 — Security checklist before deploy

Walk every box in `specs/version2/ai_specs/auth-security.md` **Security Checklist Before Deploy**. Record evidence (screenshot / note / log line) per item. Do not launch with unchecked critical items.

---

## 10.8 — Device QA matrix

On real devices: **iPhone Safari** + **Android Chrome**.

| Mode | Flows |
|------|--------|
| Logged out | Browse feed/map, soft-gate on going/rate/navigate/address → login |
| Logged in | Signup → onboard → browse → RSVP → navigate → rate → create party → admin approve |

Also smoke `/demo` (read-only).

---

## 10.9 — Phase 1 acceptance

Cross-check every Phase 1 criterion in `specs/version2/ai_specs/features.md`. Check or consciously waive each with owner initials.

---

## 10.10 — Analytics

In PostHog, use the **raw event stream** (not the dropdown — new custom events can take hours to index). Confirm recent:

- `party_created`, `party_approved`, `party_rejected`
- `party_rated`, `party_shared`
- auth/onboarding events already instrumented

---

## 10.11–10.13 — Launch

- **10.11** Recruit 2–3 friendly hosts for first real listings before the public weekend.
- **10.12** Launch — not Friday or Saturday night.
- **10.13** First party weekend: watch Railway logs + PostHog live; triage hotfixes Sunday.
