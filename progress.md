# Progress

> **OpenOwls SDD** — Living status document. Update this file at the end of every work session.
> Claude Code reads this first at the start of every new session to catch up on project state.
>
> Note: detailed security findings stay in local-only files (`supabase/SCHEMA_CAPTURE_NOTES.md`,
> `specs/version2/*`) — do not paste attack-surface writeups here (public repo).

## Current Phase

**Active Phase:** Phase 1 — Epic 3 complete on `epic-2` (dev); Epic 4 next

## Status Summary

Epic 3 closed on **tuparties-dev**: OTP request/verify + `/profiles/me`, profile trigger,
domain hook function, token path proven E2E. Backend 146 / frontend 87 green.
**Owner still needs:** dashboard OTP template + hook enablement (`specs/version2/auth-otp-setup.md`);
prod apply of safe-early migrations from Epic 2.

---

## Completed

- [x] Epic 0 — Security & repo preconditions (2026-08-06)
- [x] Epic 1 — Stabilize the base (2026-08-07): tests/CI/env/deps (PR #65 / cherry-picked onto epic-2)
- [x] Epic 2 — Backend groundwork (2026-08-07): migrations on DEV, weekend authority, API envelope
- [x] Epic 3 — Auth activation (2026-08-07): OTP + profiles API + E2E token proof on DEV

---

## In Progress

- [ ] _(none — ready for Epic 4)_

---

## Blocked

| Item | Reason | Owner |
|------|--------|-------|
| Prod apply 2.1–2.4 | Safe-early migrations written + on DEV; prod apply is owner-manual | Owner |
| Prod apply 2.6–2.7 | Cutover — blocked until Epic 10.1 | — |
| Dev Auth OTP template + Before User Created hook | MCP cannot flip Auth config; steps in `auth-otp-setup.md` | Owner |

---

## Up Next

- [ ] Epic 4 — Design system (designed during build)

---

## Decisions / context (durable)

- **Dev vs prod:** agents use **dev** MCP/env; prod changes are owner-manual.
- **Never promote tuparties-dev → prod** (synthetic ratings).
- Backend `SUPABASE_ANON_KEY` is optional/unused (service key only).
- `GET /parties` now returns `{ weekendOf, fridayDate, saturdayDate, parties }`; frontend unwraps `.parties`.
- Cutover trigger on DEV means anon going deltas can fight trigger recounts if backend points at DEV — expected until 10.1 removes anon endpoints.
- **Auth (Epic 3):** email OTP via `POST /auth/otp/request` + `/auth/otp/verify`; profiles at `GET/PATCH /profiles/me`. `NEXT_PUBLIC_AUTH_V2` and `/auth/callback` retired. Code-entry UI is Epic 6.

---

## Session Log

| Date | What Was Done |
|------|---------------|
| 2026-08-07 | Epic 3 on `epic-2`: OTP endpoints, profiles router, migration 0005 (trigger+hook fn), prove script PASS, retired AUTH_V2/callback |
| 2026-08-07 | Epic 2 on `epic-2`: migrations 0001–0004 on DEV; weekend.py; parties envelope + ratingOpen/Locked; 143 backend tests |
| 2026-08-07 | Epic 1 done on `pic2`: fixed red tests, CI workflow, env examples, pinned Python/deps |
| 2026-08-06 | Epic 0 closed (dev + prod baselines) |
| 2026-08-02 | Epic 0.2 done; planning_v2 / to-do established |
