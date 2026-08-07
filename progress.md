# Progress

> **OpenOwls SDD** — Living status document. Update this file at the end of every work session.
> Claude Code reads this first at the start of every new session to catch up on project state.
>
> Note: detailed security findings stay in local-only files (`supabase/SCHEMA_CAPTURE_NOTES.md`,
> `specs/version2/*`) — do not paste attack-surface writeups here (public repo).

## Current Phase

**Active Phase:** Phase 1 — Epic 1 complete on `pic2`; Epic 2 next

## Status Summary

Epic 1 closed: frontend/backend suites green, CI workflow added, env/deps hygiene done.

---

## Completed

- [x] Epic 0 — Security & repo preconditions (2026-08-06): baselines captured; review notes local-only
- [x] Epic 0.7 — Dev synthetic data confirmed; dashboard project-description field unavailable — local warning file
- [x] Epic 1 — Stabilize the base (2026-08-07): tests green, CI, env examples, pinned deps, root package cruft removed

---

## In Progress

- [ ] _(none — ready for Epic 2)_

---

## Blocked

| Item | Reason | Owner |
|------|--------|-------|
| _(none)_ | | |

---

## Up Next

- [ ] Epic 2 — Backend groundwork: v2 data model + weekend authority

---

## Decisions / context (durable)

- **Dev vs prod:** agents use **dev** MCP/env; prod changes are owner-manual.
- **No Docker / Supabase CLI** on owner machine — capture was MCP (dev) + owner SQL dumps (prod).
- **Never promote tuparties-dev → prod** (synthetic ratings). Warning file is local/gitignored.
- Schema baselines are in git; security posture writeups are not (public repo).
- Backend `SUPABASE_ANON_KEY` is optional/unused (service key only); frontend keeps `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Session Log

| Date | What Was Done |
|------|---------------|
| 2026-08-07 | Epic 1 done on `pic2`: fixed red tests, CI workflow, env examples, pinned Python/deps, dropped required backend anon key |
| 2026-08-06 | Untrack schema-capture CSVs + security note markdowns from public git; keep migration baselines |
| 2026-08-06 | Epic 0 closed (dev + prod baselines) |
| 2026-08-02 | Epic 0.2 done; planning_v2 / to-do established |
