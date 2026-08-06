# Progress

> **OpenOwls SDD** — Living status document. Update this file at the end of every work session.
> Claude Code reads this first at the start of every new session to catch up on project state.

## Current Phase

**Active Phase:** Phase 1 — Epic 0 complete (dev path); Epic 1 next

## Status Summary

Epic 0 security/repo preconditions done against **dev** (`tuparties-dev`). Prod kept manual. Next: Epic 1 — stabilize the base (tests, CI, env hygiene).

---

## Completed

- [x] Epic 0.1 — service-key rotation **waived by owner** (2026-08-06)
- [x] Epic 0.2 — `.claude/` gitignored; settings.local.json has no key
- [x] Epic 0.3 — MCP linked to **dev** only (CLI/Docker skipped — owner machine constraint)
- [x] Epic 0.4 — Dev schema captured → `supabase/migrations/0000_baseline_dev.sql`
- [x] Epic 0.5 — Drift vs `backend/schema/` recorded in `supabase/SCHEMA_CAPTURE_NOTES.md`
- [x] Epic 0.6 — RLS review: **FAIL on dev** (RLS off, anon full DML, realtime has no public tables) — flagged for 10.4
- [x] Epic 0.7 — Synthetic `party_ratings` confirmed (477 rows). Dashboard project-description note **impossible** (no such field in Supabase UI) — warning in `supabase/DEV_NEVER_PROMOTE.md`

---

## In Progress

- [ ] Epic 1 — Stabilize the base (not started)

---

## Blocked

| Item | Reason | Owner |
|------|--------|-------|
| Epic 0.4–0.6 against **prod** | Owner prefers prod stay manual for now; re-do before launch hardening | Owner |
| Epic 0.7 dashboard red-letter | Supabase has no project description field — in-repo warning is the substitute | n/a |

---

## Up Next

- [ ] 1.1 Fix `api.test.ts` (`adminApi.getPendingParties`)
- [ ] 1.2 Fix `dateHelpers.test.ts` (6 AM rule mocks)
- [ ] 1.3 Fix `AddPartyModal.test.tsx` (minimal green)

---

## Decisions / context (durable)

- **Dev vs prod access:** MCP + local env point at `tuparties-dev` (`xmiksyhonrugakqwydhn`). Prod is owner-manual until further notice.
- **No Docker / no brew Supabase CLI** on owner machine — schema capture via MCP SQL, not `db pull`.
- **Never promote `tuparties-dev` to prod** — contains synthetic ratings. Cannot label in Supabase UI; see `supabase/DEV_NEVER_PROMOTE.md`.

---

## Session Log

| Date | What Was Done |
|------|---------------|
| 2026-08-06 | Epic 0 on dev via MCP: baseline migration + capture notes; RLS wide-open finding; 0.7 dashboard note impossible → in-repo warning |
| 2026-08-02 | Epic 0.2 done; planning_v2 / to-do established |
