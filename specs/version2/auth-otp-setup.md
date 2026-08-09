# Epic 3.1 — Supabase Auth OTP setup (owner dashboard)

MCP cannot flip Auth provider settings. Do this once on **tuparties-dev**, then again on prod before launch.

## Dashboard steps (tuparties-dev)

1. **Authentication → Sign In / Providers → Email**
   - Email provider: enabled
   - **Email OTP expiration**: `3600` seconds (1 hour) — or shorter if preferred (e.g. 600)

2. **Authentication → Email Templates → Magic Link**
   - Replace the magic-link body with an OTP-only template that includes `{{ .Token }}` and **does not** include `{{ .ConfirmationURL }}`.
   - Example body:

     ```
     Your TU Parties code is {{ .Token }}
     It expires in one hour.
     ```

   - Subject: `Your TU Parties login code`

   Supabase uses the same template slot for OTP and magic links; omitting the URL forces the 6-digit code flow.

3. **Authentication → Hooks → Before User Created**
   - Enable
   - Type: Postgres function
   - Function: `public.hook_restrict_signup_temple_edu`
   - (Function was applied by migration `0005_auth_profile_trigger_domain_hook`)

4. **Authentication → URL Configuration**
   - Magic-link redirect URLs are no longer required for login (OTP verifies in-app).
   - Keep site URL as the app origin for other Auth emails if any.

5. **Rate limits** (Authentication → Rate Limits)
   - Keep Supabase built-in email send limits; backend adds slowapi (per IP) + per-email caps on `/auth/otp/*`.

## Verify (dev)

```bash
cd backend && . venv/bin/activate
make run   # terminal 1
python scripts/prove_auth_token_path.py --api-url http://127.0.0.1:8000
```

Expected: `PASS: token path proven end-to-end`

Inbox test (proves the email template): open `http://localhost:3000/dev/otp`,
request a code to your `@temple.edu`, enter the 6-digit code from email.

---

## Prod (after DEV is confirmed)

MCP is linked to **tuparties-dev only** — prod is owner-manual.

1. **SQL** — run `supabase/migrations/0005_auth_profile_trigger_domain_hook.sql`
   in the **prod** SQL editor (creates `handle_new_user` trigger +
   `hook_restrict_signup_temple_edu`). Safe-early / cutover migrations from
   Epic 2 stay on their own schedule — this file is additive.

2. **Auth dashboard** (prod project) — repeat steps 1–5 above:
   - Email OTP expiry
   - Magic Link template → `{{ .Token }}` only (no ConfirmationURL)
   - Enable Before User Created → `public.hook_restrict_signup_temple_edu`

3. **Do not** point local `.env` at prod for casual testing. After prod Auth
   flips, verify with a one-off Railway/staging hit or a temporary prod-pointed
   local session — then switch back to DEV.
