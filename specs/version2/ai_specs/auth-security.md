# Authentication & Security

> **OpenOwls SDD** — Read by engineers and the AI coding assistant.
> Defines how users are authenticated and authorized, how sensitive data is protected,
> and what security rules apply across the project. Security is a design concern, not a
> last-minute checklist — document these decisions before writing auth code.

---

## User Model & Scale
<!-- Decide this before any auth code. These choices shape architecture, cost, and complexity. -->

| Question | Decision |
|----------|----------|
| Expected number of users | _e.g. ~200 students in one course; design for hundreds, not millions_ |
| Growth expectation | _e.g. Roughly flat per semester — no viral scaling planned_ |
| User model | _e.g. Multi-user, single-tenant — all users share one application instance_ |
| Do users belong to groups? | _e.g. Yes — users belong to a course/section; No — every user is independent_ |
| Anonymous / guest access? | _e.g. No — every action requires a logged-in account_ |

---

## Identity Strategy
<!-- The single biggest auth decision: do you build identity yourself or delegate it? -->

| Setting | Decision |
|---------|----------|
| Approach | _e.g. Third-party (OAuth) / roll-your-own email+password / managed service (Auth0, Clerk)_ |
| Why this approach | _e.g. "Sign in with Google" avoids storing passwords and fits a university audience_ |
| Identity provider(s) | _e.g. Google Workspace SSO for @temple.edu accounts_ |
| Fallback / alternative | _e.g. None — Google SSO only; or email+password as a backup path_ |

---

## Authentication Method
<!-- How do users prove who they are? Pick one approach and justify it. -->

| Setting | Value |
|---------|-------|
| Method | _e.g. Email + password with JWT access tokens_ |
| Why this method | _e.g. Stateless, simple to reason about, works well with a React SPA_ |
| Token storage (client) | _e.g. In-memory + httpOnly refresh cookie — never localStorage_ |
| Token lifetime | _e.g. Access token 15 min, refresh token 7 days_ |
| Password hashing | _e.g. bcrypt with a cost factor of 12_ |

---

## Authorization & Roles
<!-- Once a user is authenticated, what are they allowed to do? -->

| Role | Permissions |
|------|-------------|
| _e.g. User_ | _Can create, read, update, and delete their own records only_ |
| _e.g. Admin_ | _Can view all users and manage content_ |
| _Add more_ | |

- **Enforcement point:** _e.g. Authorization is checked server-side on every protected route — never trusted from the frontend_
- **Default posture:** _e.g. Deny by default — a route is private unless explicitly marked public_

---

## User Lifecycle & Management
<!-- How do accounts come into being, get maintained, and get removed? -->

| Stage | Decision |
|-------|----------|
| Account creation | _e.g. Self-signup with email verification / invite-only / admin-provisioned_ |
| Onboarding | _e.g. New users land on a setup screen to complete their profile_ |
| Password reset | _e.g. Email a time-limited reset link; N/A if using SSO only_ |
| Account recovery | _e.g. Support contact for locked-out users; verify identity before reset_ |
| Profile updates | _e.g. Users can change name and email; email change requires re-verification_ |
| Deactivation / deletion | _e.g. Soft-delete (disable login, retain records) vs. hard-delete on request_ |
| Who administers users | _e.g. A faculty admin role can view, disable, and remove accounts_ |

---

## Sensitive Data
<!-- What data is sensitive, and how is each kind protected? -->

| Data | Classification | Protection |
|------|---------------|------------|
| _e.g. Passwords_ | _Secret_ | _Hashed with bcrypt, never logged, never returned in API responses_ |
| _e.g. Email addresses_ | _PII_ | _Encrypted at rest, access-controlled_ |
| _e.g. API keys_ | _Secret_ | _Stored as environment variables only_ |

---

## Secrets Management
<!-- How are secrets handled across environments? -->

- All secrets live in environment variables, never in committed code
- `.env` files are git-ignored; a `.env.example` with dummy values is checked in
- Each environment (local, staging, production) uses separate secrets
- Rotate any secret immediately if it is accidentally committed

---

## Common Web Vulnerabilities
<!-- Document how the project defends against the most common attacks. -->

| Threat | Mitigation |
|--------|------------|
| SQL injection | _e.g. Use parameterized queries / the ORM only — never string-concatenate SQL_ |
| Cross-site scripting (XSS) | _e.g. Escape all user-generated content; rely on React's default escaping_ |
| Cross-site request forgery (CSRF) | _e.g. SameSite cookies + CSRF token on state-changing requests_ |
| Broken access control | _e.g. Re-check ownership on every record access, not just on list views_ |
| Sensitive data exposure | _e.g. Enforce HTTPS everywhere; never return secrets in API responses_ |

---

## Input Validation
<!-- All input is untrusted until validated. -->

- Validate and sanitize every input on the server, even if the frontend already validates
- _e.g. Use Pydantic schemas to validate request bodies in FastAPI_
- _e.g. Enforce length limits and reject unexpected fields_

---

## Session & Account Safety
<!-- Rules that protect user accounts over time. -->

- _e.g. Lock or rate-limit accounts after repeated failed logins_
- _e.g. Invalidate refresh tokens on logout and on password change_
- _e.g. Require the current password to change email or password_

---

## Security Checklist Before Deploy
<!-- A quick pass to run before shipping any phase. -->

- [ ] No secrets in the repository or in frontend code
- [ ] All protected routes enforce authentication and authorization server-side
- [ ] HTTPS enforced in staging and production
- [ ] Passwords hashed; no plaintext credentials anywhere
- [ ] Dependencies checked for known vulnerabilities
- [ ] Error messages do not leak stack traces or internal details to users

---

## What Claude Code Should Never Do
<!-- Hard security rules for the AI coding assistant. -->

- Never store secrets, tokens, or passwords in client-side code or in the repository
- Never disable authentication or authorization checks "temporarily" to make a feature work
- Never log passwords, tokens, or PII
- Never trust input from the client without server-side validation
