# Epic 3.1 — Supabase Auth OTP setup (owner dashboard)

Student UI is email OTP (`/login`). Microsoft OAuth code exists but is not
the login screen. Resend SMTP **delivered** to Temple’s Microsoft gateway
on 2026-08-17 and never appeared in the mailbox. Next SMTP experiment:
**Postmark**.

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
   - Built-in Supabase mail is **2/hour**. After custom SMTP is on, raise
     emails/hour (DEV is currently **1000/hour**). Backend still adds slowapi
     (per IP) + per-email caps on `/auth/otp/*`.

6. **Custom SMTP (Postmark)** — Authentication → [SMTP](https://supabase.com/dashboard/project/xmiksyhonrugakqwydhn/auth/smtp)
   - Enable custom SMTP
   - Host: `smtp.postmarkapp.com` (no trailing space)
   - Port: `587` (STARTTLS). If Auth logs show a connection error, try `465`.
   - Username: Postmark **Server** API token (not the Account token)
   - Password: the **same** Server API token
     (or use a stream SMTP Token: Access Key / Secret Key)
   - Sender email: `noreply@tuparties.com`
   - Sender name: `TU Parties`

   In Postmark first:
   1. Sign up at [postmarkapp.com](https://postmarkapp.com) with a **non-Temple**
      email (so the vendor account is not stuck in Temple filters).
   2. Add domain `tuparties.com`. Add the DKIM TXT and Return-Path CNAME
      (`pm-bounces` → `pm.mtasv.net`) they show. These are a different selector
      than Resend, so both can exist at once.
   3. **Request account approval.** Until Postmark approves the account you can
      only send to addresses on *your* verified domain, not `@temple.edu`.
      Describe the mail as transactional 6-digit login codes for a campus app.
   4. Enable SMTP on the transactional stream. Copy the Server API token into
      Supabase. Never commit it.

   Optional: set the Magic Link **subject** to `Your TU Parties login code`
   (body already uses `{{ .Token }}`; default subject is still `Your sign-in link`).

   **Resend (previous attempt):** Host `smtp.resend.com`, port `465`, user
   `resend`, password = Resend sending API key. Left in place as history only.

## Verify (dev)

```bash
cd backend && . venv/bin/activate
make run   # terminal 1
python scripts/prove_auth_token_path.py --api-url http://127.0.0.1:8000
```

Expected: `PASS: token path proven end-to-end`

Inbox test (proves SMTP + template): open `http://localhost:3000/login`,
request a code to your `@temple.edu`. Confirm **Postmark Activity** shows
the send from `TU Parties <noreply@tuparties.com>`, then enter the 6-digit
code. Check Outlook Junk / Other / Deleted if the inbox is empty.

**DEV result — Resend (2026-08-17):** Resend custom SMTP on tuparties-dev
**did send**. Status `delivered` to `rafiat.amir@temple.edu` (Temple MX is
Microsoft 365: `temple-edu.mail.protection.outlook.com`). The message never
appeared in inbox, Junk, Other, or Deleted. No bounce, not suppressed.

**DEV result — Postmark:** pending.

---

## Prod (after DEV inbox test is confirmed)

This is **Auth dashboard config**, not a SQL migration. MCP is linked to
**tuparties-dev only** — prod is owner-manual.

1. **SQL** (if not already applied) — run
   `supabase/migrations/0005_auth_profile_trigger_domain_hook.sql`
   in the **prod** SQL editor (creates `handle_new_user` trigger +
   `hook_restrict_signup_temple_edu`). Safe-early / cutover migrations from
   Epic 2 stay on their own schedule — this file is additive.

2. **Auth dashboard** (prod project) — repeat email OTP, template, Before
   User Created hook, then **the same Resend SMTP fields** as DEV:
   - New Resend API key named `tuparties-prod-smtp` (do not reuse the DEV key)
   - Host/port/user/from: same as DEV
   - Raise prod emails/hour after SMTP is on (start ~100, raise with traffic)

3. **Do not** point local `.env` at prod for casual testing. After prod Auth
   flips, verify with a one-off Railway/staging hit or a temporary prod-pointed
   local session — then switch back to DEV.
