# AUTH File Explained

How authentication works in Temple Parties, step by step — and where it's currently breaking.

---

## The Two Supabase Clients

There are **two separate Supabase clients** in this app, each using a different API key:

| Client | File | Key Used | Purpose |
|--------|------|----------|---------|
| **Frontend** | `frontend/src/lib/supabase.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable) | Sending magic links, listening for auth events, getting session tokens |
| **Backend** | `backend/app/database.py` | `SUPABASE_SERVICE_KEY` (secret) | Verifying JWT tokens, reading/writing to database tables |

This is important — the frontend and backend talk to Supabase independently with different keys.

---

## The Full Auth Flow (Step by Step)

### Step 1: User Enters Email (Frontend → Supabase)

**File:** `AuthContext.tsx` → `sendMagicLink()` (line 117)

```
User types email → sendMagicLink("tut18432@temple.edu")
  ├── Validates email ends with @temple.edu (frontend check)
  └── Calls supabase.auth.signInWithOtp({
        email: "tut18432@temple.edu",
        options: {
          shouldCreateUser: true,
          emailRedirectTo: "https://tuparties.com/"   ← window.location.origin + "/"
        }
      })
```

- Uses the **frontend Supabase client** (anon/publishable key)
- If Supabase returns an error, it's shown as red text under the email input (line 132-133)
- `emailRedirectTo` tells Supabase where the magic link should point the user

> **Note:** The backend also has a `POST /auth/signup` endpoint (in `auth.py` line 43) that does a similar `sign_in_with_otp` call, but the frontend **does NOT call it**. The frontend calls Supabase directly. The backend signup endpoint is unused in the current flow.

---

### Step 2: User Clicks Magic Link (Browser → Supabase → Frontend)

Supabase sends an email with a link like:
```
https://cxqvtlxfutywoggrmgct.supabase.co/auth/v1/verify?token=xxx&redirect_to=https://tuparties.com/
```

When clicked:
1. Supabase verifies the token
2. Supabase redirects to `https://tuparties.com/#access_token=eyJ...&refresh_token=...&type=magiclink`
3. The hash fragment contains the session tokens

**Key point:** The redirect goes to `/` (root), NOT to `/auth/callback`. The `emailRedirectTo` in Step 1 is set to `${window.location.origin}/`.

---

### Step 3: Frontend Detects the Session (Frontend)

**File:** `AuthContext.tsx` → `useEffect` (line 80)

When the page loads at `/`, two things happen:

```
AuthProvider mounts
  ├── initAuth() runs:
  │     └── supabase.auth.getSession() → parses #access_token from URL hash
  │           └── If session found → fetchUserProfile()
  │
  └── onAuthStateChange listener starts (line 100):
        └── On SIGNED_IN / TOKEN_REFRESHED / INITIAL_SESSION events:
              └── fetchUserProfile()
```

The Supabase JS SDK automatically parses the `#access_token=...` from the URL and establishes a session. The `onAuthStateChange` listener fires a `SIGNED_IN` event.

**There is also an `/auth/callback` page** (`app/auth/callback/page.tsx`) that does the same thing — listens for auth events and redirects to `/`. But since `emailRedirectTo` sends users to `/` directly, this page is only used if someone manually navigates there or if the redirect URL is changed.

---

### Step 4: Fetch User Profile (Frontend → Backend)

**File:** `AuthContext.tsx` → `fetchUserProfile()` (line 36)

```
fetchUserProfile()
  └── authApi.getMe()                ← calls GET /auth/me on the backend
        └── fetchWithAuth()          ← from api.ts (line 22)
              ├── supabase.auth.getSession() → gets the access_token
              └── fetch("https://backend-url/auth/me", {
                    headers: { Authorization: "Bearer eyJ..." }
                  })
```

**File:** `auth.py` → `get_me()` (line 119) + `require_auth()` (line 35)

```
Backend receives GET /auth/me
  └── require_auth() dependency runs:
        └── get_current_user() (line 14):
              ├── Extracts token from "Bearer eyJ..." header
              └── supabase.auth.get_user(token)  ← Uses SERVICE KEY to verify
                    ├── Success → returns { id, email }
                    └── Failure (any exception) → returns None → 401 "Not authenticated"
```

If the user exists in `user_profiles` table → returns profile.
If not → returns `null` (user needs to set username).

---

### Step 5: Set Username (Frontend → Backend)

**File:** `AuthContext.tsx` → `setUsernameHandler()` (line 142)

```
User types username → clicks "Complete Sign Up"
  └── authApi.setUsername("templeterror")
        └── fetchWithAuth("POST /auth/set-username", { username: "templeterror" })
              └── Includes Authorization: Bearer eyJ... header
```

**File:** `auth.py` → `set_username()` (line 74) + `require_auth()` (line 35)

```
Backend receives POST /auth/set-username
  └── require_auth() runs:
        └── get_current_user():
              └── supabase.auth.get_user(token)  ← SERVICE KEY verifies the JWT
                    ├── Success → proceeds to create/update user_profiles row
                    └── Failure → 401 "Not authenticated"
```

---

## Where It's Currently Failing

### The Error: "Not authenticated" on the Username Step

Based on the screenshots, the user:
1. ✅ Enters email → magic link sends successfully (Step 1 works)
2. ✅ Clicks magic link → frontend gets a session (Step 3 works)
3. ✅ Frontend detects `needsUsername: true` → shows "Choose your username" (Step 4 partially works)
4. ❌ Submits username → backend returns 401 "Not authenticated" (Step 5 fails)

### Why It's Failing

The failure is in **`get_current_user()`** in `auth.py` (line 14-32). When it calls:

```python
user_response = await asyncio.to_thread(supabase.auth.get_user, token)
```

This call uses the **backend Supabase client** (initialized in `database.py` with `supabase_service_key`). The `get_user()` method sends the service key to Supabase's API. If that key is rejected (legacy, wrong, expired), the call throws an exception, which is caught by the bare `except Exception: pass` on line 29, causing the function to return `None`, which causes `require_auth()` to raise a 401.

### The Silent Failure Problem

The `get_current_user()` function has this pattern:

```python
try:
    user_response = await asyncio.to_thread(supabase.auth.get_user, token)
    ...
except Exception:
    pass        # ← SWALLOWS ALL ERRORS SILENTLY

return None     # ← Returns None, which becomes 401 "Not authenticated"
```

**This is the root cause of the debugging difficulty.** Any error — wrong key, network failure, Supabase outage, legacy key rejection — gets silently swallowed. The frontend only sees "Not authenticated" with no information about _why_.

### Possible Failure Points

| # | Possible Cause | How to Verify |
|---|---------------|---------------|
| 1 | Backend `SUPABASE_SERVICE_KEY` is still a legacy key on the hosting platform | Check env vars on Railway/Heroku. Should start with `sb_secret_` |
| 2 | Backend `SUPABASE_SERVICE_KEY` was updated but the backend wasn't restarted/redeployed | Check deployment logs — confirm new deployment completed |
| 3 | The Python `supabase` library (≥2.10.0) doesn't support the new key format | Check installed version on production. Try updating to latest |
| 4 | The `get_user()` call is failing for a different reason entirely (hidden by `except: pass`) | Add logging inside the except block to see the actual error |
| 5 | `NEXT_PUBLIC_API_URL` points to wrong backend URL on Vercel | Check Vercel env vars — should point to production backend, not `localhost:8000` |
| 6 | Frontend has a Supabase session but the access_token JWT is malformed/expired | Check browser DevTools → Application → Local Storage for Supabase session data |

### The #1 Debugging Step

Add logging to the backend's `get_current_user()` to see the actual error:

```python
except Exception as e:
    print(f"AUTH ERROR: {type(e).__name__}: {e}")    # ← Add this line
    pass
```

This will show in the backend logs exactly WHY `get_user()` is failing — whether it's "Legacy API keys are disabled", a network error, or something else entirely.

---

## The Test Suite (What It Covers)

**File:** `test_auth.py` — 459 lines, 3 test classes

| Class | What It Tests | Key Tests |
|-------|--------------|-----------|
| `TestSignup` (14 tests) | `POST /auth/signup` | Valid/invalid emails, temple.edu domain validation, SQL injection, XSS, unicode attacks, Supabase error handling |
| `TestSetUsername` (10 tests) | `POST /auth/set-username` | New user creation, existing user updates, short/long/empty usernames, SQL injection, XSS, unauthenticated access, invalid tokens |
| `TestGetMe` (4 tests) | `GET /auth/me` | Profile retrieval, user not in profiles table, unauthenticated, expired tokens |

All tests mock the Supabase client — they don't hit real Supabase. The mocking pattern is:
```python
mock_supabase.auth.get_user = MagicMock(
    return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
)
```

This means tests don't catch issues with real Supabase API key validation.

---

## File Reference

| File | Role |
|------|------|
| `frontend/src/lib/supabase.ts` | Creates frontend Supabase client with anon key |
| `frontend/src/contexts/AuthContext.tsx` | All frontend auth logic: magic link, session management, username, logout |
| `frontend/src/services/api.ts` | HTTP client that attaches JWT token to backend calls |
| `frontend/src/app/auth/callback/page.tsx` | Callback page for magic link redirect (currently unused since redirect goes to `/`) |
| `backend/app/database.py` | Creates backend Supabase client with service key |
| `backend/app/config.py` | Reads env vars (`SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`) |
| `backend/app/routers/auth.py` | Auth endpoints: signup, set-username, me |
| `backend/tests/test_auth.py` | 28 tests covering auth endpoints (all mocked) |
