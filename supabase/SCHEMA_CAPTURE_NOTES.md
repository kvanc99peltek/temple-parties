# Schema capture notes — Epic 0

> Captured **dev only** (`tuparties-dev`, ref `xmiksyhonrugakqwydhn`) on 2026-08-06.
> Prod stays owner-manual for now — re-run this capture against prod before trusting
> launch-hardening decisions that depend on prod RLS/realtime.

Source migration: `supabase/migrations/0000_baseline_dev.sql`

---

## 0.4 — What was captured

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

## 0.5 — Drift vs `backend/schema/` (record only — do not "fix" yet)

| Finding | Notes |
|---------|-------|
| Live matches the *end state* of 001–013 more than any single file | Hosts + Wilson ranking (`013`) are live; earlier Bayesian-only files are superseded |
| `parties.pin_label` is `text` live vs `VARCHAR(5)` in `001_baseline.sql` | Drift |
| Missing hot-path indexes `parties(weekend_of)`, `parties(status)` | Confirmed absent — epic 2.3 |
| No RLS/policies/grants in any `backend/schema/*` file | Matches v1 §9.1 — live state was never recorded until this capture |
| Two `007_*` files (forward + rollback) | Docs-only quirk; live has the constraints from the forward file |
| Storage buckets | Not in `backend/schema/`; also not on dev yet (epic 2.4) |

---

## 0.6 — RLS review (dev)

**Verdict: wider than the to-do hoped.** Epic 0.6 hoped anon could "only SELECT approved parties." Reality on **dev**:

1. **RLS is OFF** on all five public tables (Supabase advisor: ERROR × 5).
2. **Zero policies** — nothing filters `status = 'approved'`.
3. **`anon` and `authenticated` have full DML** (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/…) on every public table, including `user_profiles` and `party_ratings`.
4. With the publishable anon key, a browser client can read/write the whole public schema via PostgREST — the FastAPI service-role path is not the only door.
5. Realtime: even if RLS were tightened later, `parties` is **not** in `supabase_realtime` on this project today — v1's going-count subscription would be inert here until a table is added.

**Flag for 10.4 (tighten RLS):** enable RLS + least-privilege policies; keep a narrow `anon SELECT` on approved parties if realtime still needs it; revoke table-level writes from `anon`. Do **not** enable RLS without policies (hard lockout).

Other advisor noise (defer): mutable `search_path` on the three public functions; leaked-password protection off (less relevant once OTP-only).

---

## 0.7 — Synthetic `party_ratings` on dev

| Check | Result |
|-------|--------|
| Rows present | **Yes — 477** across 47 parties / 28 distinct `ip_hash` values |
| Date range | 2026-02-15 → 2026-04-19 |
| Project description red-letter note | **Impossible in UI** — Supabase project Settings has no description field (owner confirmed 2026-08-06). Substitute: in-repo warning at `supabase/DEV_NEVER_PROMOTE.md` (+ this note + `progress.md`) |

---

## Prod follow-up (manual)

When ready, owner dumps prod the same way (or re-auths MCP on prod briefly) and we diff against this file. Until then, treat this capture as **dev truth**, not launch truth.
