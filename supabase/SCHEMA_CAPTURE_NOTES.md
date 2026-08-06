# Schema capture notes — Epic 0

> Captured **dev** (`tuparties-dev`, ref `xmiksyhonrugakqwydhn`) and **prod** (owner SQL dumps)
> on 2026-08-06.
>
> Sources:
> - Dev: `supabase/migrations/0000_baseline_dev.sql`
> - Prod: `supabase/migrations/0000_baseline_prod.sql`
> - Raw prod CSVs: `specs/version2/schema-capture/Prod/` (local; `to-do.md` gitignored, dumps not)

---

## Dev — 0.4 inventory

| Object | Present on dev |
|--------|----------------|
| Tables | `user_profiles`, `parties`, `party_going`, `party_ratings`, `hosts` |
| Functions | `get_host_rankings`, `parties_host_codes_fk_check`, `hosts_code_delete_guard` |
| Triggers | `parties_host_codes_fk_trg`, `hosts_code_delete_guard_trg` |
| RLS policies | **none** |
| Realtime | `supabase_realtime` pub exists; **no public tables attached** |
| Storage buckets (`posters`/`avatars`) | **none** (0 rows in `storage.buckets`) |
| CLI migration history | empty |

Row counts at capture: parties 53 · party_ratings 477 · hosts 15 · party_going 0 · user_profiles 1.

---

## Dev — 0.5 drift vs `backend/schema/` (record only — do not "fix" yet)

| Finding | Notes |
|---------|-------|
| Live matches the *end state* of 001–013 more than any single file | Hosts + Wilson ranking (`013`) are live; earlier Bayesian-only files are superseded |
| `parties.pin_label` is `text` live vs `VARCHAR(5)` in `001_baseline.sql` | Drift |
| Missing hot-path indexes `parties(weekend_of)`, `parties(status)` | Confirmed absent — epic 2.3 |
| No RLS/policies/grants in any `backend/schema/*` file | Matches v1 §9.1 — live state was never recorded until this capture |
| Two `007_*` files (forward + rollback) | Docs-only quirk; live has the constraints from the forward file |
| Storage buckets | Not in `backend/schema/`; also not on dev yet (epic 2.4) |

---

## Dev — 0.6 RLS review

**Verdict: wider than the to-do hoped.** Epic 0.6 hoped anon could "only SELECT approved parties." Reality on **dev**:

1. **RLS is OFF** on all five public tables (Supabase advisor: ERROR × 5).
2. **Zero policies** — nothing filters `status = 'approved'`.
3. **`anon` and `authenticated` have full DML** (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/…) on every public table, including `user_profiles` and `party_ratings`.
4. With the publishable anon key, a browser client can read/write the whole public schema via PostgREST — the FastAPI service-role path is not the only door.
5. Realtime: even if RLS were tightened later, `parties` is **not** in `supabase_realtime` on this project today — v1's going-count subscription would be inert here until a table is added.

**Flag for 10.4 (tighten RLS):** enable RLS + least-privilege policies; keep a narrow `anon SELECT` on approved parties if realtime still needs it; revoke table-level writes from `anon`. Do **not** enable RLS without policies (hard lockout).

Other advisor noise (defer): mutable `search_path` on the three public functions; leaked-password protection off (less relevant once OTP-only).

---

## Dev — 0.7 Synthetic `party_ratings`

| Check | Result |
|-------|--------|
| Rows present | **Yes — 477** across 47 parties / 28 distinct `ip_hash` values |
| Date range | 2026-02-15 → 2026-04-19 |
| Project description red-letter note | **Impossible in UI** — Supabase project Settings has no description field (owner confirmed 2026-08-06). Substitute: in-repo warning at `supabase/DEV_NEVER_PROMOTE.md` (+ this note + `progress.md`) |

---

## Prod — 0.4 inventory

Raw dumps renamed under `specs/version2/schema-capture/Prod/`:
`01_tables_ddl` … `07_grants`, `08_publications`, `09_row_counts`, `10_storage_buckets`, `12_rls_flags`.

| Object | Present on prod |
|--------|-----------------|
| Tables | Same five: `user_profiles`, `parties`, `party_going`, `party_ratings`, `hosts` |
| Functions | Same three host-guard + rankings functions |
| Triggers | Same two |
| RLS | **ON** all five (`relrowsecurity=true`, `relforcerowsecurity=false`) |
| Policies | 3 — see 0.6 below |
| Realtime | Only `supabase_realtime_messages_publication` → `realtime.messages_*`; **no public tables** in any publication |
| Storage | `posters` bucket (public, 1MB, mime `image/jpeg` + typo `image/wenp`); **no `avatars`** |

Row counts at capture: parties 61 · party_ratings 570 · hosts 15 · party_going 0 · user_profiles 2.

---

## Prod ↔ Dev drift (structural)

| Area | Prod | Dev |
|------|------|-----|
| RLS | **ON** all five tables | **OFF** all five |
| Policies | 3 (parties SELECT/INSERT, party_ratings deny-all) | none |
| `parties.date` column | **absent** | present (`date`) |
| `parties.day` | `varchar(10) NOT NULL` | `varchar` nullable |
| `parties.status` | `varchar(20)` | `varchar` (no length) |
| `parties.created_by` FK | → `auth.users` | → `user_profiles` |
| `party_going` shape | surrogate `id` PK; `party_id`/`user_id` nullable; UNIQUE(party_id,user_id); user FK → `auth.users` | composite PK `(party_id,user_id)` both NOT NULL; FKs → `user_profiles` |
| `party_ratings.ip_hash` | `varchar(64)` | `text` |
| `party_ratings.rating` | `smallint` | `integer` |
| Extra indexes | `idx_party_ratings_ip_hash`, `idx_party_ratings_party_id` | neither |
| Hot-path indexes (`weekend_of`/`status`) | absent | absent |
| Storage | `posters` only | none |
| Realtime public tables | none | none |
| Host ranking SQL | same Wilson/Bayesian logic | same |

Drift vs `backend/schema/` on prod matches the same themes as dev (end-state of 001–013, missing weekend/status indexes, docs never recorded RLS/grants). Prod `party_going` / FK targets diverge from both the docs files and **dev** — treat carefully in epic 2 migrations.

---

## Prod — 0.6 RLS review (definitive with `12_rls_flags.csv`)

**RLS flags (all public tables):**

| Table | `relrowsecurity` | `relforcerowsecurity` |
|-------|------------------|------------------------|
| `hosts` | true | false |
| `parties` | true | false |
| `party_going` | true | false |
| `party_ratings` | true | false |
| `user_profiles` | true | false |

**Policies:**

| Table | Policy | Effect |
|-------|--------|--------|
| `parties` | `Public can read approved parties` | SELECT where `status = 'approved'` (`TO public`) |
| `parties` | `Authenticated can insert parties` | INSERT with check `auth.uid() IS NOT NULL` |
| `party_ratings` | `No direct access` | ALL with `USING (false)` — blocks direct PostgREST access |
| `hosts` | *(none)* | RLS on + no policy → **deny** for anon/authenticated |
| `party_going` | *(none)* | same deny |
| `user_profiles` | *(none)* | same deny |

**Anon effective access (PostgREST + anon key), after RLS:**

| Table | Effective anon access |
|-------|------------------------|
| `parties` | SELECT approved rows only; INSERT fails (`auth.uid()` null); UPDATE/DELETE denied (no policy) |
| `party_ratings` | none (deny-all policy) |
| `hosts` | none |
| `party_going` | none |
| `user_profiles` | none |

Table-level **grants** still give anon/authenticated full DML on every table — RLS is what actually blocks. `service_role` (backend) bypasses RLS and retains full access.

**Verdict vs the 0.6 hope ("anon only SELECT approved parties"):**

- **Closer than dev, but not launch-clean.** Approved-party SELECT matches the hope; ratings/hosts/going/profiles are locked for anon.
- Still flagged for **10.4**: revoke excess table grants from `anon`; decide whether authenticated INSERT-on-parties should stay; add explicit policies (or keep intentional deny-by-absence) for tables that need documented intent; add `parties` to realtime publication if going-count live updates remain a product requirement; fix `posters` mime typo (`wenp` → `webp`) when touching storage in 2.4.

---

## Epic 0 status

| Item | Dev | Prod |
|------|-----|------|
| 0.4 capture | done | done |
| 0.5 drift notes | done | done (vs schema docs + vs each other) |
| 0.6 RLS review | FAIL (wide open) | Partial pass — approved SELECT ok; grants + gaps → 10.4 |
| 0.7 synthetic ratings | confirmed; never promote | n/a (real ratings) |

Epic 0 is **closed** for both environments (0.1 waived; 0.3 adapted MCP/dev-only link).
