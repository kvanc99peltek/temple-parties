# Architecture Overview

Hey! This doc will walk you through how Temple Parties works from top to bottom. By the end you'll understand every piece of the app — what it does, why it's there, and how it all connects.

---

## What Is Temple Parties?

It's a mobile-first web app where Temple students can discover parties happening this weekend. You open it on your phone, see a list of parties (or a map), tap "GOING" to RSVP, and hit "NAVIGATE" to get directions. That's it — simple on the surface, but there's a lot going on under the hood.

---

## The Big Picture

The app has three main pieces that talk to each other:

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│    FRONTEND       │  HTTP   │    BACKEND        │  SQL    │    DATABASE       │
│    (Next.js)      │ ──────► │    (FastAPI)       │ ──────► │    (Supabase)     │
│                   │ ◄────── │                    │ ◄────── │                   │
│ What the user     │  JSON   │ The "brain" that   │  Data   │ Where all the     │
│ sees and clicks   │         │ processes requests │         │ data lives        │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

**Think of it like a restaurant:**
- The **frontend** is the menu and the dining room — what customers interact with
- The **backend** is the kitchen — it takes orders, prepares data, and sends it back
- The **database** is the pantry and recipe book — it stores everything permanently

---

## The Tech Stack (and Why Each Piece Was Chosen)

| What | Technology | Why This? |
|------|-----------|-----------|
| Frontend framework | **Next.js 14 + React** | React is the most popular UI library. Next.js adds routing, server-side rendering, and easy deployment to Vercel. |
| Language (frontend) | **TypeScript** | JavaScript with types. Catches bugs before they happen — like spell-check for code. |
| Styling | **Tailwind CSS** | Instead of writing CSS files, you add classes directly to HTML like `bg-pink-500 text-white`. Much faster for building UIs. |
| Maps | **React-Leaflet** | Free, open-source map library with React components. Google Maps charges money; Leaflet doesn't. Uses dark CARTO tiles. |
| Geocoding | **Nominatim (OpenStreetMap)** | Free address-to-coordinates API. Used both in the backend (party creation) and frontend (address autocomplete in AddPartyModal). |
| Analytics | **Vercel Analytics** | Lightweight analytics included in the root layout. |
| Backend framework | **FastAPI (Python)** | Fast to write, auto-generates API docs, and has built-in data validation. Great for APIs. |
| Database | **Supabase** | It's like Firebase but built on PostgreSQL (a real SQL database). Gives you a database, auth system, and realtime updates in one package. Free tier is generous. |
| Auth | **Supabase Auth** | Handles the hard parts of login (sending emails, managing tokens, security). We just call their SDK. |

---

## Project Structure (Where Things Live)

```
temple-parties/
├── frontend/                       # Everything the user sees
│   ├── src/
│   │   ├── app/                    # The page itself (there's only one page!)
│   │   │   ├── page.tsx            # Main page — the whole app lives here
│   │   │   ├── layout.tsx          # Wraps the page with auth provider + Vercel Analytics
│   │   │   ├── auth/callback/      # Handles the magic link redirect
│   │   │   └── globals.css         # Global styles, fonts, map popup styles
│   │   │
│   │   ├── components/             # Reusable UI pieces
│   │   │   ├── PartyCard.tsx       # The card showing party info
│   │   │   ├── GoingButton.tsx     # The pink "GOING (48)" button
│   │   │   ├── DayTabs.tsx         # Friday / Saturday toggle
│   │   │   ├── MapContent.tsx      # The Leaflet map with pins and popups
│   │   │   ├── MapView.tsx         # SSR-safe wrapper that dynamically imports MapContent
│   │   │   ├── Header.tsx          # Top bar with logo, + button, profile icon
│   │   │   ├── BottomNav.tsx       # Home / Map tab bar
│   │   │   ├── LoginModal.tsx      # Email → magic link → username flow
│   │   │   ├── AddPartyModal.tsx   # Form to submit a new party (with address autocomplete)
│   │   │   ├── ProfileModal.tsx    # Your profile + logout
│   │   │   ├── InviteModal.tsx     # "Share with friends" popup after marking GOING
│   │   │   ├── ModalWrapper.tsx    # Reusable modal container (backdrop, escape key, scroll lock)
│   │   │   ├── Toast.tsx           # Auto-dismissing toast notifications
│   │   │   ├── EmptyState.tsx      # Shown when no parties are available for a day
│   │   │   └── DatePicker.tsx      # Calendar picker restricted to Fridays & Saturdays
│   │   │
│   │   ├── contexts/               # Shared state (like global variables)
│   │   │   └── AuthContext.tsx      # Who's logged in? Are they loading? Auth methods.
│   │   │
│   │   ├── hooks/                  # Reusable logic (not UI, just behavior)
│   │   │   ├── useGoingStatus.ts   # Tracks which parties you're going to + realtime counts
│   │   │   ├── useParties.ts       # Fetches, filters, and sorts parties by day
│   │   │   ├── useModalState.ts    # Manages open/close state for all modals
│   │   │   ├── useModalBehavior.ts # Handles escape-to-close, scroll lock for modals
│   │   │   └── useToast.ts         # Toast notification show/hide state
│   │   │
│   │   ├── services/
│   │   │   └── api.ts              # ALL backend calls live here
│   │   │
│   │   ├── utils/                  # Helper functions
│   │   │   ├── dateHelpers.ts      # "What's this Friday's date?"
│   │   │   └── shareHelpers.ts     # Share party link, open Maps app
│   │   │
│   │   └── lib/
│   │       ├── supabase.ts         # Initializes the Supabase client
│   │       ├── constants.ts        # Z-index values, durations, campus bounds, APP_URL
│   │       └── types.ts            # TypeScript interfaces for Party and User
│   │
│   └── tailwind.config.ts          # Custom colors, fonts, animations
│
├── backend/
│   ├── app/
│   │   ├── main.py                 # App starts here. Sets up CORS, rate limiting.
│   │   ├── config.py               # Reads environment variables (Pydantic Settings)
│   │   ├── database.py             # Creates the Supabase connection
│   │   ├── constants.py            # Magic numbers: rate limits, campus bounds
│   │   │
│   │   ├── routers/                # Groups of endpoints (like folders for URLs)
│   │   │   ├── auth.py             # /auth/signup, /auth/set-username, /auth/me
│   │   │   ├── parties.py          # /parties (list, create, delete, going)
│   │   │   └── admin.py            # /admin/parties/pending, approve, reject
│   │   │
│   │   ├── models/                 # Defines the shape of data
│   │   │   ├── user.py             # What a User looks like
│   │   │   └── party.py            # What a Party looks like
│   │   │
│   │   └── services/
│   │       └── geocoding.py        # Turns "1432 N Broad St" into GPS coords (via Nominatim)
│   │
│   ├── schema/
│   │   └── 001_baseline.sql        # SQL schema defining all three tables
│   ├── tests/                      # 120 automated tests
│   ├── requirements.txt            # Python packages needed
│   ├── requirements-test.txt       # Additional test dependencies (pytest, pytest-mock, etc.)
│   ├── Makefile                    # Shortcuts: make setup, make dev, make test
│   ├── Procfile                    # Deployment config (Heroku/Railway)
│   ├── pytest.ini                  # Test configuration
│   └── seed_parties.py             # Script to add fake parties for testing
```

---

## How the Frontend Works

### It's a Single Page App

There's only **one page** (`page.tsx`). When you tap the Home or Map icon at the bottom, it doesn't load a new page — it just swaps which component is showing. This is faster because the browser doesn't have to reload everything.

```
page.tsx manages a variable called `currentView`

  currentView === 'home'  →  shows DayTabs + list of PartyCards
  currentView === 'map'   →  shows MapContent (Leaflet map)
```

### Components = Building Blocks

React works by breaking the UI into small, reusable pieces called **components**. Each component is a function that returns HTML (well, JSX).

Here's how they nest on the home view:

```
page.tsx
  ├── Header                    (logo, + button, profile icon)
  ├── DayTabs                   (Fri 13 / Sat 14 toggle)
  ├── PartyCard                 (one for each party)
  │     ├── Category badge      ("FRAT PARTY")
  │     ├── HYPED badge         (gold, pulsing — only on the top party)
  │     ├── Title               ("Super Bowl Party")
  │     ├── Host                ("by Pilam & Dchi")
  │     ├── Address + Doors Open
  │     ├── GoingButton         ("GOING (48)" — gradient when going)
  │     └── Navigate button     (opens Apple/Google Maps)
  ├── EmptyState                (shown when no parties for a day)
  ├── Toast                     (auto-dismissing notification)
  ├── ModalWrapper              (reusable backdrop + close logic)
  │     ├── LoginModal
  │     ├── AddPartyModal
  │     ├── ProfileModal
  │     └── InviteModal
  └── BottomNav                 (Home / Map tabs)
```

### Props = Passing Data Down

Components talk to each other by passing **props** (short for properties). Think of props like function arguments:

```typescript
// The parent (page.tsx) passes data to PartyCard:
<PartyCard
  id="abc-123"
  title="Super Bowl Party"
  host="Pilam & Dchi"
  category="Frat Party"
  doorsOpen="10 PM"
  address="1234 N Broad St"
  goingCount={48}
  isHyped={true}
  userIsGoing={false}
  onGoingClick={() => handleGoing("abc-123")}
/>

// PartyCard receives these as an object and uses them to render:
function PartyCard({ title, host, goingCount, isHyped, ... }) {
  return <h2>{title}</h2>  // "Super Bowl Party"
}
```

### State = Data That Changes

When something on screen can change (like the going count, or which day tab is selected), React uses **state**. When state changes, React automatically re-renders just the parts that need updating.

```typescript
const [selectedDay, setSelectedDay] = useState('friday');
// selectedDay starts as 'friday'
// When user taps Saturday, we call setSelectedDay('saturday')
// React re-renders the party list with Saturday parties
```

### Hooks = Reusable Logic

Hooks are functions that start with `use` and let you share logic between components without copy-pasting. For example:

- **`useGoingStatus`** — manages the entire "going to parties" feature: which parties you're attending, the counts, localStorage persistence (`temple_parties_going`), Supabase realtime count updates, and optimistic updates. Once you mark "going," it's permanent (no un-going).
- **`useParties`** — fetches all parties from the API, filters by selected day, sorts by going count, and tracks which party is the "HYPED" top party per day.
- **`useModalState`** — manages open/close state for all modals (login, add party, profile, invite). Handles auth gating (e.g., opening login modal when an unauthenticated user tries to add a party) and pending actions after login.
- **`useModalBehavior`** — handles escape-to-close and body scroll prevention for any open modal.
- **`useToast`** — simple show/hide state for toast notifications.

### Context = Global State

Some data needs to be available everywhere (like "is the user logged in?"). Instead of passing it through 10 levels of components, we use **React Context**:

```
AuthContext wraps the entire app
  └── Any component can ask: "Who's the current user?"
      by calling: const { user, isAuthenticated } = useAuth()
```

---

## How the Backend Works

### It's a REST API

The backend doesn't render any HTML. It only receives HTTP requests and returns JSON. The frontend makes requests like:

```
GET http://localhost:8000/parties
```

And the backend responds with:

```json
[
  {
    "id": "abc-123",
    "title": "Super Bowl Party",
    "host": "Pilam & Dchi",
    "goingCount": 48,
    "status": "approved"
  }
]
```

### Routers = Groups of Endpoints

FastAPI organizes endpoints into **routers**. Each router handles a related group of URLs:

**Auth Router (`/auth`)**
| Method | URL | What It Does | Login Required? |
|--------|-----|-------------|-----------------|
| POST | `/auth/signup` | Send magic link to your @temple.edu email | No |
| POST | `/auth/set-username` | Pick a display name | Yes |
| GET | `/auth/me` | Get your profile info | Yes |

**Parties Router (`/parties`)**
| Method | URL | What It Does | Login Required? |
|--------|-----|-------------|-----------------|
| GET | `/parties` | Get all approved parties for this weekend | No |
| GET | `/parties/{id}` | Get one party's details | No |
| POST | `/parties` | Submit a new party (starts as "pending") | Yes |
| DELETE | `/parties/{id}` | Delete your own party | Yes |
| POST | `/parties/{id}/going` | Toggle "I'm going" | Yes |
| POST | `/parties/{id}/going/anonymous` | Anonymous +1 | No |
| GET | `/parties/user/going` | List of party IDs you're going to | Yes |

**Admin Router (`/admin`)**
| Method | URL | What It Does | Login Required? |
|--------|-----|-------------|-----------------|
| GET | `/admin/parties/pending` | See all parties waiting for approval | Yes + Admin |
| POST | `/admin/parties/{id}/approve` | Approve a party | Yes + Admin |
| POST | `/admin/parties/{id}/reject` | Reject a party | Yes + Admin |

### Models = Data Validation

Before the backend processes any request, **Pydantic models** check that the data makes sense. If someone tries to create a party with a title that's 500 characters, Pydantic rejects it automatically:

```python
class PartyCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=50)   # Must be 1-50 chars
    host: str = Field(..., min_length=1, max_length=30)    # Must be 1-30 chars
    pin_label: str = Field(..., min_length=1, max_length=5) # Map marker label
    category: str = Field(..., min_length=1, max_length=50) # Party type
    date: str                                               # Must be a Friday or Saturday
    doors_open: str = Field(..., min_length=1, max_length=20)
    address: str = Field(..., min_length=1, max_length=500)
    latitude: Optional[float]                               # -90 to 90
    longitude: Optional[float]                              # -180 to 180
    # Field validators strip whitespace and verify date is Fri/Sat
```

This means we don't need to write `if len(title) > 50` checks everywhere. The model handles it. Pydantic also strips whitespace from text fields and validates that the date falls on a Friday or Saturday.

### The Weekend System

This is an important concept. Parties don't show forever — they're tied to a specific weekend.

The backend has a function called `get_current_weekend()` that figures out: **"What's the date of this coming Friday?"**

```python
# If today is Tuesday Feb 10 → returns Friday Feb 13
# If today is Saturday Feb 14 → returns Friday Feb 13 (this weekend)
# If today is Sunday Feb 15 → returns Friday Feb 13 (this weekend)
```

When you fetch parties, the backend only returns parties where `weekend_of` matches that Friday. So last weekend's parties automatically disappear — no cleanup needed.

---

## How the Database Works

We use **Supabase**, which is a hosted PostgreSQL database with extra features (auth, realtime, storage). Think of PostgreSQL as a spreadsheet on steroids — data is stored in **tables** with rows and columns, and you query it with SQL.

### The Three Tables

**`user_profiles`** — One row per user
```
| id (UUID)  | username    | is_admin | created_at          |
|------------|-------------|----------|---------------------|
| a1b2c3...  | rafiatamir  | true     | 2026-02-01 10:00:00 |
| d4e5f6...  | john_doe    | false    | 2026-02-05 14:30:00 |
```

**`parties`** — One row per party
```
| id       | title            | host          | pin_label | category   | day      | status   | going_count | weekend_of |
|----------|------------------|---------------|-----------|------------|----------|----------|-------------|------------|
| x7y8z9.. | Super Bowl Party | Pilam & Dchi  | SB        | Frat Party | friday   | approved | 48          | 2026-02-13 |
| m1n2o3.. | 2016 Throwback   | 786 BOYz      | 786       | House Party| friday   | approved | 35          | 2026-02-13 |
| p4q5r6.. | House Party      | (submitted)   | HP        | Other      | saturday | pending  | 0           | 2026-02-13 |
```

Full columns: `id`, `title`, `host`, `pin_label`, `category`, `day`, `date`, `doors_open`, `address`, `latitude`, `longitude`, `going_count`, `created_by`, `status`, `weekend_of`, `created_at`

**`party_going`** — One row per "User X is going to Party Y" (composite primary key: party_id + user_id)
```
| party_id  | user_id   | created_at          |
|-----------|-----------|---------------------|
| x7y8z9..  | a1b2c3..  | 2026-02-10 10:00:00 |   ← rafiatamir is going to Super Bowl Party
| x7y8z9..  | d4e5f6..  | 2026-02-10 14:30:00 |   ← john_doe is going to Super Bowl Party
```

### How Tables Connect (Foreign Keys)

Tables reference each other using **foreign keys**. This is how databases create relationships:

```
user_profiles.id  ◄────  parties.created_by      (who created the party)
user_profiles.id  ◄────  party_going.user_id     (who's going)
parties.id        ◄────  party_going.party_id    (going to which party)
```

The `CASCADE` keyword means: if a party is deleted, all its `party_going` rows are automatically deleted too. No orphan data.

### How the Going Count Stays Accurate

This is a good real-world lesson. You might think: "Just do `going_count += 1` when someone clicks GOING." But what if two people click at the exact same time? You could get a race condition where both read `48`, both add 1, and both write `49` — losing one count.

Instead, the backend does this:
1. Add/remove the row in `party_going`
2. **Count** all rows in `party_going` for that party (this is always accurate)
3. Write that count to `parties.going_count`

The count in `parties.going_count` is just a cache for fast reading. The real source of truth is the `party_going` table.

---

## How Authentication Works

We use **magic links** — no passwords. Here's the full flow:

### Step 1: User enters their email
The frontend calls `POST /auth/signup` with their `@temple.edu` email. The backend validates the domain and tells Supabase to send a magic link.

### Step 2: User checks their email
They get an email with a link like: `https://yourapp.com/auth/callback#access_token=eyJ...`

### Step 3: User clicks the link
The browser opens `/auth/callback`. The callback page sets up a Supabase auth state listener that detects `SIGNED_IN`, `TOKEN_REFRESHED`, and `INITIAL_SESSION` events. When a valid session is detected, it redirects to the home page. There's a 15-second timeout that shows an error if auth fails. Now the user has a **JWT token** (a signed, encoded string that proves who they are).

### Step 4: Every future request includes the token
The `fetchWithAuth()` function in `api.ts` automatically attaches the token:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

The backend calls `supabase.auth.get_user(token)` to verify it's legit. If the token is expired or fake, the request is rejected with a 401 error.

### Step 5: New users pick a username
If the backend sees a token for a user who doesn't have a `user_profiles` row yet, the frontend shows a "Pick a username" screen. Once they submit, a profile row is created.

### Why Magic Links?

- No password storage = no password breaches
- Temple.edu validation ensures only Temple students can sign up
- Supabase handles the hard security stuff (token signing, expiration, refresh)

---

## How Frontend and Backend Communicate

Every time the frontend needs data, it makes an **HTTP request** to the backend. Here's a concrete example of what happens when the app loads:

```
1. User opens the app

2. page.tsx runs useEffect → calls partiesApi.getParties()

3. api.ts builds the request:
   GET http://localhost:8000/parties
   Headers: { Authorization: "Bearer eyJ...", Content-Type: "application/json" }

4. Backend (parties.py) receives the request:
   - Calculates this weekend's Friday (Feb 13)
   - Queries Supabase: SELECT * FROM parties WHERE status='approved' AND weekend_of='2026-02-13'
   - Supabase returns the rows
   - FastAPI serializes them to JSON (snake_case → camelCase)

5. Frontend receives the JSON array
   - Stores it in state: setParties(data)
   - React re-renders, showing a PartyCard for each party
```

### The API Client (`services/api.ts`)

All backend calls are organized in one file. This is a common pattern — it keeps API logic out of your components:

```typescript
// Instead of fetch() calls scattered everywhere, you write:
const parties = await partiesApi.getParties('friday');
const user = await authApi.getMe();
await partiesApi.toggleGoing('party-id-123');
```

Under the hood, each of these calls `fetchWithAuth()` which:
1. Grabs the Supabase session token
2. Attaches it to the `Authorization` header
3. Makes the actual `fetch()` call
4. Returns the parsed JSON

### CORS (Why the Backend Has an Allow-List)

Browsers have a security feature called **CORS** (Cross-Origin Resource Sharing). By default, a page on `localhost:3000` can't make requests to `localhost:8000` because they're different "origins."

The backend reads allowed origins from the `cors_origins` setting in `config.py` (a comma-separated string). By default it includes:
```
http://localhost:3000          # Frontend dev server
http://localhost:3001          # Frontend alt port
https://templeparties.com      # Production
https://www.templeparties.com  # Production (www)
https://tuparties.com          # Production (short domain)
https://www.tuparties.com      # Production (short domain www)
```

Without this, your browser would block every API call.

---

## Client-Side Caching (Browser Storage)

The `useGoingStatus` hook persists going-party state directly in the browser using **localStorage** so it survives page refreshes:

| Key | What It Stores | Why |
|-----|---------------|-----|
| `temple_parties_going` | Array of party IDs you're going to | So users don't lose their RSVPs on refresh |

The hook reads from localStorage on mount and writes back whenever state changes. It also subscribes to a Supabase realtime channel to keep going counts in sync across clients.

---

## The Styling System

### Tailwind CSS (How It Works)

Instead of writing CSS in a separate file:
```css
.button { background-color: #FA4693; padding: 12px 24px; font-weight: bold; }
```

You put the styles directly on the element using class names:
```html
<button className="bg-[#FA4693] py-3 px-6 font-bold">
```

Tailwind generates only the CSS you actually use, so the final CSS file is tiny.

### Custom Theme (`tailwind.config.ts`)

We extended Tailwind with our own design tokens:

**Colors:**
- `#FA4693` — Temple pink (primary action), with light (`#FB6BA8`) and dark (`#E83A82`) variants
- `#10B981` — Green (success states), with dark variant `#059669`
- `#FFD666` — Gold (HYPED badge, Navigate button), with dark variant `#E6C05C`
- `#202023` — Card background
- `#000000` — Page background

**Fonts:**
- **Bitcount Prop Single** — Logo text ("TEMPLE PARTIES")
- **Basement Grotesque** — Bold headings (weight 900)
- **Montserrat** — UI text, buttons, badges
- **Montserrat Alternates** — Alternate heading style
- **Helvetica Neue** — Body text, addresses, host names

**Box Shadows:**
- `pink-glow` / `pink-glow-lg` — Pink glow for primary elements
- `green-glow` — Green glow for success states
- `gold-glow` — Gold glow for HYPED badges

**Animations** (defined as CSS keyframes):
- `fade-in` — Opacity 0→1 (0.3s)
- `scale-in` — Scale 0.95→1 with fade (0.3s, for modals)
- `slide-up` — Translate up with fade (0.3s)
- `pulse-subtle` — Subtle scale pulse (2s, infinite)
- `pulse-glow` — HYPED badge pulses with gold glow (2s, infinite)
- `slide-up-fade` — Cards animate in when page loads (400ms)
- `number-pop` — Going count bounces when it changes (300ms)
- `going-click` — Button press animation (300ms)

### Map Styling (`globals.css`)

The Leaflet map popups use regular CSS (not Tailwind) because Leaflet generates its own HTML that's hard to control with Tailwind classes. These styles live in `globals.css` with a dark theme and include classes like `.party-popup-dark`, `.popup-category-badge`, `.popup-hyped-badge`, `.avatar-marker`, etc. There are also pulse animations for hyped markers and custom scrollbar styling.

---

## Security (How We Protect the App)

### Rate Limiting
We use `slowapi` to limit how many requests someone can make. This stops spam and abuse:
- Signup: 5 per minute (prevents email bombing)
- Creating parties: 10 per minute
- Going toggle: 30 per minute (authenticated), 3 per minute (anonymous)

### Input Validation
Every piece of user input is validated before it touches the database:
- Party titles: max 50 characters
- Addresses: max 500 characters
- Emails: must be valid format AND end with `@temple.edu`
- Coordinates: must be valid lat/lng ranges

### Admin System
The `is_admin` flag can only be set directly in the database. There's no API endpoint to make yourself an admin. Admin endpoints check this flag on every request.

---

## Running Locally

### Start the Backend
```bash
cd temple-parties/backend
make setup          # First time only: creates Python virtual env + installs packages
make dev            # Starts the API at http://localhost:8000
```

### Start the Frontend
```bash
cd temple-parties/frontend
npm install         # First time only: installs Node packages
npm run dev         # Starts the app at http://localhost:3000
```

### Add Test Parties
```bash
cd temple-parties/backend
. venv/bin/activate
python seed_parties.py
```

**Important gotcha:** The `weekend` date in `seed_parties.py` must match the current/upcoming Friday. If today is Tuesday Feb 10, the backend looks for parties on Friday Feb 13. If the seed script says Feb 6, no parties will show up.

### Run Tests
```bash
# Backend — 120 tests covering auth, parties, admin, going, security
cd temple-parties/backend && make test

# Frontend — ~77 tests covering API calls, date logic, components, security
cd temple-parties/frontend && npm test
```

---

## Environment Variables

These are secret values that shouldn't be in the code. They live in `.env` files that are NOT committed to git.

### Backend (`backend/.env`)
```
SUPABASE_URL=https://xxx.supabase.co        # Your Supabase project URL
SUPABASE_SERVICE_KEY=eyJ...                  # Admin key (can do anything — keep this secret!)
SUPABASE_ANON_KEY=eyJ...                     # Public key (safe for browsers)
```

Note: The backend `config.py` also has a `cors_origins` setting with default allowed origins. You can override it in `.env` if needed.

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000     # Where the backend is running
NEXT_PUBLIC_SUPABASE_URL=https://xxx...      # Same Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_pub...      # Same public key (NEXT_PUBLIC_ = visible to browser)
NEXT_PUBLIC_APP_URL=https://tuparties.com    # App URL used for share links
```

The `NEXT_PUBLIC_` prefix is a Next.js convention. It means "this variable is safe to expose to the browser." Never put the service key in a `NEXT_PUBLIC_` variable.

---

## What to Learn Next

If you want to go deeper into any part of the stack, here's where to start:

### Start Here (Core Concepts)
- [React docs — "Thinking in React"](https://react.dev/learn/thinking-in-react) — How to break UIs into components
- [Next.js Learn course](https://nextjs.org/learn) — Free interactive tutorial
- [FastAPI first steps](https://fastapi.tiangolo.com/tutorial/first-steps/) — Build your first endpoint in 5 minutes
- [Supabase quickstart](https://supabase.com/docs/guides/getting-started) — Set up a database and auth

### Go Deeper
- [Tailwind CSS docs](https://tailwindcss.com/docs) — Look up any utility class
- [React-Leaflet docs](https://react-leaflet.js.org/) — Map components and custom markers
- [Pydantic docs](https://docs.pydantic.dev/latest/) — Data validation (used heavily in the backend)
- [Supabase Auth — Magic Links](https://supabase.com/docs/guides/auth/passwordless-login/auth-magic-link) — How our login works

### Patterns Worth Understanding
- [React Context](https://react.dev/reference/react/useContext) — Sharing state without prop drilling
- [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) — Extracting reusable logic
- [Optimistic Updates](https://react.dev/reference/react/useOptimistic) — Why the GOING button feels instant
- [REST API design](https://restfulapi.net/) — The conventions our backend follows

### Testing
- [Pytest](https://docs.pytest.org/) — Python testing
- [Jest](https://jestjs.io/docs/getting-started) — JavaScript testing
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) — Testing React components
