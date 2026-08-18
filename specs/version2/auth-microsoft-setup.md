# Sign in with Microsoft (owner dashboard)

OTP email through Resend SMTP does not reach Temple inboxes (DEV 2026-08-17:
Resend `delivered`, Outlook never showed the message). Login is Microsoft
Entra instead. Email OTP endpoints stay in the backend but are not the
student UI.

MCP cannot flip Auth providers. Do this on **tuparties-dev** first.

## 1. Azure app registration

Use a **personal** Microsoft account (Outlook/Hotmail + free Azure). Do **not**
sign into Azure as `@temple.edu`. Temple’s tenant will refuse app registrations.
The app still authenticates Temple students because it is **multitenant**.

1. [Azure portal](https://portal.azure.com) → Microsoft Entra ID → App registrations → New registration.
2. Name: `TU Parties (dev)`
3. Supported account types: **Accounts in any organizational directory (Any Microsoft Entra ID tenant — Multitenant)**
   - Temple students are in Temple’s tenant. A single-tenant app on *your* Azure
     directory cannot sign them in.
4. Redirect URI (Web):
   `https://xmiksyhonrugakqwydhn.supabase.co/auth/v1/callback`
5. Register. Copy **Application (client) ID**.
6. Certificates & secrets → New client secret. Copy the **Value** (once).
7. Token configuration / Manifest: add optional claims `email` and `xms_edov`
   on the ID token (see [Supabase Azure guide](https://supabase.com/docs/guides/auth/social-login/auth-azure)).
8. API permissions: Microsoft Graph `openid`, `profile`, `email`, `User.Read`.
   Grant admin consent on *your* app if the portal asks. That is not Temple IT
   consent (see risk below).

## 2. Supabase Auth (tuparties-dev)

1. **Authentication → Sign In / Providers → Azure**
   - Enable
   - Client ID / secret from step 1
   - Azure Tenant URL (optional but better): `https://login.microsoftonline.com/temple.edu`
     so personal Microsoft accounts never hit the app. If that URL is rejected,
     leave the default `common` tenant; the Before User Created hook still
     rejects non-`@temple.edu`.
2. **Authentication → URL Configuration**
   - Add `http://localhost:3000/auth/callback`
   - Add `http://localhost:3000/**` (covers `?next=`)
3. Keep **Before User Created** → `public.hook_restrict_signup_temple_edu`.

## 3. Try it

Local frontend + backend pointed at tuparties-dev. Open
`http://localhost:3000/login` → Continue with Microsoft → Temple account.

**If Microsoft says the app needs admin approval:** Temple Entra is blocking
third-party apps. Same class of problem as the OTP filter. Next step is Temple
IT admin consent for this app, not more SMTP.

## Prod (later)

New Azure app `TU Parties`, redirect
`https://<prod-ref>.supabase.co/auth/v1/callback`, new client secret. Repeat
provider + redirect URLs (`https://tuparties.com/auth/callback`,
`https://tuparties.com/**`). Do not reuse the DEV secret.
