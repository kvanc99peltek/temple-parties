# Progress

> **OpenOwls SDD** — Living status document. Update this file at the end of every work session.
> Claude Code reads this first at the start of every new session to catch up on project state.

## Current Phase

**Active Phase:** Phase 1 — Epic 0 complete; Epic 1 next

## Status Summary

Epic 0 closed for **dev and prod**. Baselines in `supabase/migrations/0000_baseline_{dev,prod}.sql`; notes in `SCHEMA_CAPTURE_NOTES.md`. Next: Epic 1 — stabilize the base (tests, CI, env hygiene).

---

## Completed

- [x] Epic 0.1 — service-key rotation **waived by owner** (2026-08-06)
- [x] Epic 0.2 — `.claude/` gitignored; settings.local.json has no key
- [x] Epic 0.3 — MCP linked to **dev** only (CLI/Docker skipped — owner machine constraint)
- [x] Epic 0.4 — Schema captured: `0000_baseline_dev.sql` + `0000_baseline_prod.sql` (prod via owner SQL dumps)
- [x] Epic 0.5 — Drift (dev↔schema docs, prod↔dev, prod↔schema docs) in `supabase/SCHEMA_CAPTURE_NOTES.md`
- [x] Epic 0.6 — RLS: **FAIL on dev** (off/wide open); **partial pass on prod** (RLS on, anon SELECT approved parties only; excess grants + gaps → 10.4)
- [x] Epic 0.7 — Synthetic `party_ratings` confirmed (477 rows). Dashboard project-description note **impossible** (no such field in Supabase UI) — warning in `supabase/DEV_NEVER_PROMOTE.md`

---

## In Progress

- [ ] Epic 1 — Stabilize the base (not started)

---

## Blocked

| Item | Reason | Owner |
|------|--------|-------|
| Epic 0.7 dashboard red-letter | Supabase has no project description field — in-repo warning is the substitute | n/a |

---

## Up Next

- [ ] 1.1 Fix `api.test.ts` (`adminApi.getPendingParties`)
- [ ] 1.2 Fix `dateHelpers.test.ts` (6 AM rule mocks)
- [ ] 1.3 Fix `AddPartyModal.test.tsx` (minimal green)

---

## Decisions / context (durable)

- **Dev vs prod access:** MCP + local env point at `tuparties-dev` (`xmiksyhonrugakqwydhn`). Prod schema captured via owner SQL dumps (2026-08-06); do not apply migrations / mutate prod from agents.
- **No Docker / no brew Supabase CLI** on owner machine — schema capture via MCP SQL (dev) + owner dumps (prod), not `db pull`.
- **Never promote `tuparties-dev` to prod** — contains synthetic ratings. Cannot label in Supabase UI; see `supabase/DEV_NEVER_PROMOTE.md`.
- **Prod↔dev structural drift is real** (esp. `party_going` PK shape, FK targets, `parties.date` absent on prod, RLS on/off) — epic 2 migrations must target the intended env carefully.

---

## Session Log

| Date | What Was Done |
|------|---------------|
| 2026-08-06 | Epic 0.4–0.6 prod: owner dumps → `0000_baseline_prod.sql` + Prod section in capture notes; Epic 0 closed |
| 2026-08-06 | Epic 0 on dev via MCP: baseline migration + capture notes; RLS wide-open finding; 0.7 dashboard note impossible → in-repo warning |
| 2026-08-02 | Epic 0.2 done; planning_v2 / to-do established |
