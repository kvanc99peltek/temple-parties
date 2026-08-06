# Progress

> **OpenOwls SDD** — Living status document. Update this file at the end of every work session.
> Claude Code reads this first at the start of every new session to catch up on project state.
>
> Note: detailed security findings stay in local-only files (`supabase/SCHEMA_CAPTURE_NOTES.md`,
> `specs/version2/*`) — do not paste attack-surface writeups here (public repo).

## Current Phase

**Active Phase:** Phase 1 — Epic 0 complete; Epic 1 next

## Status Summary

Epic 0 closed (dev + prod schema baselines in `supabase/migrations/`). Next: Epic 1 — stabilize the base (tests, CI, env hygiene).

---

## Completed

- [x] Epic 0 — Security & repo preconditions (2026-08-06): baselines captured; review notes local-only
- [x] Epic 0.7 — Dev synthetic data confirmed; dashboard project-description field unavailable — local warning file

---

## In Progress

- [ ] Epic 1 — Stabilize the base (not started)

---

## Blocked

| Item | Reason | Owner |
|------|--------|-------|
| _(none)_ | | |

---

## Up Next

- [ ] 1.1 Fix `api.test.ts` (`adminApi.getPendingParties`)
- [ ] 1.2 Fix `dateHelpers.test.ts` (6 AM rule mocks)
- [ ] 1.3 Fix `AddPartyModal.test.tsx` (minimal green)

---

## Decisions / context (durable)

- **Dev vs prod:** agents use **dev** MCP/env; prod changes are owner-manual.
- **No Docker / Supabase CLI** on owner machine — capture was MCP (dev) + owner SQL dumps (prod).
- **Never promote tuparties-dev → prod** (synthetic ratings). Warning file is local/gitignored.
- Schema baselines are in git; security posture writeups are not (public repo).

---

## Session Log

| Date | What Was Done |
|------|---------------|
| 2026-08-06 | Untrack schema-capture CSVs + security note markdowns from public git; keep migration baselines |
| 2026-08-06 | Epic 0 closed (dev + prod baselines) |
| 2026-08-02 | Epic 0.2 done; planning_v2 / to-do established |
