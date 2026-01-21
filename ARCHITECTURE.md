# Temple Parties - Architecture Guide

**Last Updated:** January 21, 2026
**Purpose:** Comprehensive guide to understanding how the entire application works

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Schema](#database-schema)
6. [Authentication Flow](#authentication-flow)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [API Reference](#api-reference)
9. [Real-Time Updates](#real-time-updates)
10. [Testing](#testing)

---

## Project Overview

Temple Parties is a full-stack party discovery app for Temple University students.

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Python FastAPI, Pydantic |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Magic Links) |
| Maps | Leaflet + React-Leaflet |
| Real-time | Supabase Realtime |
| Testing | Jest (Frontend), Pytest (Backend) |

### Core Features
- Passwordless login via @temple.edu magic links
- Browse parties filtered by Friday/Saturday
- Mark yourself as "going" with live count updates
- Create parties (pending admin approval)
- Interactive map view with party pins
- Navigate to parties via Google Maps
- Share parties with friends

---

## Project Structure

```
temple-parties/
├── frontend/                    # Next.js React application
│   ├── src/
│   │   ├── app/                # Pages & routing
│   │   │   ├── page.tsx        # Main homepage
│   │   │   ├── layout.tsx      # Root layout (AuthProvider)
│   │   │   └── globals.css     # Tailwind + custom styles
│   │   ├── components/         # Reusable UI components
│   │   │   ├── PartyCard.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── DayTabs.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── MapView.tsx
│   │   │   ├── MapContent.tsx
│   │   │   ├── GoingButton.tsx
│   │   │   ├── AddPartyModal.tsx
│   │   │   ├── LoginModal.tsx
│   │   │   ├── ProfileModal.tsx
│   │   │   ├── InviteModal.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── contexts/           # React Context
│   │   │   └── AuthContext.tsx
│   │   ├── services/           # API communication
│   │   │   └── api.ts
│   │   ├── hooks/              # Custom hooks
│   │   │   ├── useGoingStatus.ts
│   │   │   ├── useUserParties.ts
│   │   │   └── useLocalStorage.ts
│   │   ├── lib/                # External clients
│   │   │   └── supabase.ts
│   │   ├── utils/              # Utility functions
│   │   │   ├── dateHelpers.ts
│   │   │   ├── shareHelpers.ts
│   │   │   └── storage.ts
│   │   └── __tests__/          # Jest tests
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── jest.config.js
│
├── backend/                     # Python FastAPI
│   ├── app/
│   │   ├── main.py             # App entry + CORS
│   │   ├── config.py           # Environment config
│   │   ├── database.py         # Supabase client
│   │   ├── models/             # Pydantic schemas
│   │   │   ├── user.py
│   │   │   └── party.py
│   │   ├── routers/            # API routes
│   │   │   ├── auth.py
│   │   │   ├── parties.py
│   │   │   └── admin.py
│   │   └── services/           # Business logic
│   ├── tests/                  # Pytest tests
│   ├── seed_parties.py         # DB seeding
│   └── requirements.txt
│
├── ARCHITECTURE.md             # This file
├── DESIGN_SPEC.md              # Design system
├── PROGRESS.md                 # Development tracking
└── prd_v1.md                   # Product requirements
```

---

## Frontend Architecture

### Pages & Routing (`src/app/`)

**`page.tsx`** - Main Homepage
```
Responsibilities:
- Dual view: List (feed) and Map
- Day filtering (Friday/Saturday)
- Modal orchestration (login, add party, profile, invite)
- Fetches and displays parties

State managed:
- selectedDay: 'friday' | 'saturday'
- currentView: 'feed' | 'map'
- parties: Party[]
- Modal visibility flags
```

**`layout.tsx`** - Root Layout
```
Responsibilities:
- Wraps app with AuthProvider
- Sets page metadata (title, description, OpenGraph)
- Configures mobile viewport
```

### Components (`src/components/`)

| Component | Purpose |
|-----------|---------|
| `PartyCard.tsx` | Displays party info, going button, navigate button |
| `Header.tsx` | Top nav: logo, add party (+), profile buttons |
| `DayTabs.tsx` | Friday/Saturday filter tabs |
| `BottomNav.tsx` | Fixed bottom nav for Home/Map toggle |
| `MapView.tsx` | Full-screen map container |
| `MapContent.tsx` | Leaflet map with party pins |
| `GoingButton.tsx` | "I'm Going" button with count |
| `AddPartyModal.tsx` | Create party form |
| `LoginModal.tsx` | Magic link auth flow |
| `ProfileModal.tsx` | User profile display |
| `InviteModal.tsx` | Share party functionality |
| `Toast.tsx` | Toast notifications |
| `EmptyState.tsx` | No parties message |

### Context (`src/contexts/AuthContext.tsx`)

Global authentication state management:

```typescript
interface User {
  id: string;
  email: string;
  username: string | null;
  isAdmin: boolean;
  createdAt: string;
}

// Provided values:
- user: User | null
- isAuthenticated: boolean
- isLoading: boolean
- needsUsername: boolean
- sendMagicLink(email): Promise<{success, error?}>
- setUsername(username): Promise<{success, error?}>
- logout(): Promise<void>
- refreshUser(): Promise<void>
```

### Services (`src/services/api.ts`)

API client with typed methods:

```typescript
// Auth endpoints
authApi.signup(email)        // Send magic link
authApi.setUsername(name)    // Set username after auth
authApi.getMe()              // Get current user

// Party endpoints
partiesApi.getParties(day?)      // Get approved parties
partiesApi.getParty(id)          // Get single party
partiesApi.createParty(data)     // Create new party
partiesApi.deleteParty(id)       // Delete own party
partiesApi.toggleGoing(id)       // Toggle going status
partiesApi.getUserGoingParties() // Get user's going list

// Admin endpoints
adminApi.getPendingParties()     // Get pending parties
adminApi.approveParty(id)        // Approve party
adminApi.rejectParty(id)         // Reject party
```

### Hooks (`src/hooks/`)

**`useGoingStatus.ts`**
- Tracks which parties user is going to
- Maintains going count for each party
- Subscribes to Supabase realtime for live updates

```typescript
const { isGoing, getCount, toggleGoing } = useGoingStatus();

isGoing(partyId)      // boolean
getCount(partyId)     // number
toggleGoing(partyId)  // async
```

### Utilities (`src/utils/`)

**`dateHelpers.ts`**
```typescript
getDefaultDay()      // Returns 'friday' or 'saturday' based on current day
getUpcomingDates()   // Returns { friday: Date, saturday: Date }
getDayName(date)     // Formats date to day name
```

**`shareHelpers.ts`**
```typescript
shareContent(party)           // Uses Web Share API or clipboard
openMapsDirections(address)   // Opens Google Maps
```

---

## Backend Architecture

### Entry Point (`app/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Temple Parties API")

# CORS for frontend origins
app.add_middleware(CORSMiddleware, allow_origins=[
    "http://localhost:3000",
    "http://localhost:3001",
    "https://templeparties.com"
])

# Include routers
app.include_router(auth.router)
app.include_router(parties.router)
app.include_router(admin.router)
```

### Models (`app/models/`)

**`user.py`**
```python
class User(BaseModel):
    id: str
    email: str
    username: str | None
    is_admin: bool = False
    created_at: datetime
```

**`party.py`**
```python
class Party(BaseModel):
    id: str
    title: str           # max 50 chars
    host: str            # max 30 chars
    category: str        # Frat Party, House Party, etc.
    day: str             # 'friday' | 'saturday'
    doors_open: str      # e.g., "10 PM"
    address: str
    latitude: float
    longitude: float
    going_count: int
    created_by: str
    status: str          # 'pending' | 'approved' | 'rejected'
    weekend_of: date
    created_at: datetime
```

### Routers (`app/routers/`)

**`auth.py`** - Authentication
```
POST /auth/signup          - Send magic link (validates @temple.edu)
POST /auth/set-username    - Set username after auth
GET  /auth/me              - Get current user profile
```

**`parties.py`** - Party CRUD
```
GET    /parties            - Get approved parties (optional day filter)
GET    /parties/{id}       - Get single party
GET    /parties/user/going - Get user's going parties (auth required)
POST   /parties            - Create party (auth required)
DELETE /parties/{id}       - Delete own party
POST   /parties/{id}/going - Toggle going status (auth required)
```

**`admin.py`** - Admin Operations
```
GET  /admin/parties/pending      - Get pending parties (admin only)
POST /admin/parties/{id}/approve - Approve party (admin only)
POST /admin/parties/{id}/reject  - Reject party (admin only)
```

---

## Database Schema

### Tables

**`auth.users`** (Managed by Supabase)
```sql
id              UUID PRIMARY KEY
email           VARCHAR UNIQUE
created_at      TIMESTAMP
-- Additional Supabase auth fields
```

**`user_profiles`** (Custom)
```sql
id              UUID PRIMARY KEY (FK to auth.users)
email           VARCHAR
username        VARCHAR UNIQUE
is_admin        BOOLEAN DEFAULT false
created_at      TIMESTAMP DEFAULT now()
```

**`parties`**
```sql
id              UUID PRIMARY KEY
title           VARCHAR(50) NOT NULL
host            VARCHAR(30) NOT NULL
category        VARCHAR NOT NULL
day             VARCHAR CHECK (day IN ('friday', 'saturday'))
doors_open      VARCHAR NOT NULL
address         VARCHAR(500) NOT NULL
latitude        NUMERIC(10,8) NOT NULL
longitude       NUMERIC(11,8) NOT NULL
going_count     INTEGER DEFAULT 0
created_by      UUID FK user_profiles(id)
status          VARCHAR DEFAULT 'pending'
weekend_of      DATE NOT NULL
created_at      TIMESTAMP DEFAULT now()
```

**`party_going`** (Many-to-Many)
```sql
party_id        UUID FK parties(id)
user_id         UUID FK user_profiles(id)
created_at      TIMESTAMP DEFAULT now()
PRIMARY KEY     (party_id, user_id)
```

### Relationships

```
auth.users (1) ──── user_profiles (1)
                          │
                          │ creates
                          ▼
                    parties (many)
                          │
                          │ tracked by
                          ▼
                    party_going (many)
                          │
                          │ links to
                          ▼
                    user_profiles (many)
```

---

## Authentication Flow

### Complete Flow Diagram

```
┌─── 1. SIGNUP ───────────────────────────────────────┐
│                                                      │
│  User enters email@temple.edu                        │
│         │                                            │
│         ▼                                            │
│  Frontend: authApi.signup(email)                     │
│         │                                            │
│         ▼                                            │
│  POST /auth/signup { email }                         │
│         │                                            │
│         ▼                                            │
│  Backend validates @temple.edu domain                │
│         │                                            │
│         ▼                                            │
│  supabase.auth.sign_in_with_otp(email)              │
│         │                                            │
│         ▼                                            │
│  Supabase sends magic link email                     │
│                                                      │
└──────────────────────────────────────────────────────┘

┌─── 2. MAGIC LINK CLICK ─────────────────────────────┐
│                                                      │
│  User clicks email link                              │
│         │                                            │
│         ▼                                            │
│  Browser redirects with #access_token=xxx            │
│         │                                            │
│         ▼                                            │
│  Supabase JS parses URL, stores tokens               │
│         │                                            │
│         ▼                                            │
│  AuthContext detects: onAuthStateChange('SIGNED_IN') │
│         │                                            │
│         ▼                                            │
│  Session now exists with access_token                │
│                                                      │
└──────────────────────────────────────────────────────┘

┌─── 3. USERNAME SETUP ───────────────────────────────┐
│                                                      │
│  AuthContext calls authApi.getMe()                   │
│         │                                            │
│         ▼                                            │
│  GET /auth/me with Bearer token                      │
│         │                                            │
│         ▼                                            │
│  Backend checks user_profiles table                  │
│         │                                            │
│    ┌────┴────┐                                       │
│    │         │                                       │
│  Found    Not Found                                  │
│    │         │                                       │
│    ▼         ▼                                       │
│  Return   needsUsername = true                       │
│  user     Show LoginModal for username               │
│    │         │                                       │
│    │         ▼                                       │
│    │    POST /auth/set-username { username }         │
│    │         │                                       │
│    │         ▼                                       │
│    │    INSERT into user_profiles                    │
│    │         │                                       │
│    └────┬────┘                                       │
│         │                                            │
│         ▼                                            │
│  User fully authenticated                            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### JWT Token Flow

```
1. Supabase generates access_token (JWT)
   Contains: { sub: user_id, email, exp: timestamp }

2. Frontend stores in localStorage (Supabase handles this)

3. Frontend sends in requests:
   Authorization: Bearer eyJhbGc...

4. Backend verifies:
   supabase.auth.get_user(token)
   Returns: { id, email }

5. Token refresh:
   Supabase auto-refreshes using refresh_token
```

---

## Data Flow Diagrams

### App Initialization

```
Browser loads app
       │
       ▼
layout.tsx wraps with AuthProvider
       │
       ▼
AuthProvider useEffect:
├── supabase.auth.getSession()
├── If session: authApi.getMe() → Set user state
└── Setup onAuthStateChange listener
       │
       ▼
page.tsx mounts:
├── useAuth() → Get user, isAuthenticated
├── useGoingStatus() → Fetch going parties, setup realtime
└── partiesApi.getParties() → Fetch approved parties
       │
       ▼
Render party cards filtered by day
```

### Toggle Going Status

```
User clicks "I'm Going"
       │
       ▼
Check isAuthenticated?
├── No: Show LoginModal
└── Yes: Continue
       │
       ▼
partiesApi.toggleGoing(partyId)
       │
       ▼
POST /parties/{id}/going
       │
       ▼
Backend checks party_going table:
├── Already going: DELETE row, decrement count
└── Not going: INSERT row, increment count
       │
       ▼
UPDATE parties.going_count
       │
       ▼
Response: { going: bool, goingCount: number }
       │
       ▼
Supabase broadcasts postgres_changes
       │
       ▼
Frontend realtime listener receives update
       │
       ▼
Update partyCounts state → Re-render
```

### Create Party

```
User fills AddPartyModal form
       │
       ▼
partiesApi.createParty(data)
       │
       ▼
POST /parties with Bearer token
       │
       ▼
Backend:
├── Validate inputs (title ≤50, host ≤30)
├── Generate coordinates if not provided
├── Calculate weekend_of date
└── INSERT with status='pending'
       │
       ▼
Response: Party (status: pending)
       │
       ▼
Show toast "Submitted for approval!"
       │
       ▼
(Party not visible until admin approves)
```

---

## API Reference

### Authentication

**POST /auth/signup**
```json
Request:  { "email": "user@temple.edu" }
Response: { "message": "Magic link sent to user@temple.edu" }
```

**POST /auth/set-username**
```json
Headers:  Authorization: Bearer {token}
Request:  { "username": "owlparty" }
Response: { "message": "Username set", "username": "owlparty" }
```

**GET /auth/me**
```json
Headers:  Authorization: Bearer {token}
Response: {
  "id": "uuid",
  "email": "user@temple.edu",
  "username": "owlparty",
  "isAdmin": false,
  "createdAt": "2026-01-21T..."
}
```

### Parties

**GET /parties?day=friday**
```json
Response: [
  {
    "id": "uuid",
    "title": "Sigma Chi House Party",
    "host": "Sigma Chi",
    "category": "Frat Party",
    "day": "friday",
    "doorsOpen": "10 PM",
    "address": "1234 N Broad St",
    "latitude": 39.98,
    "longitude": -75.155,
    "goingCount": 42,
    "status": "approved",
    "weekendOf": "2026-01-24",
    "createdAt": "2026-01-21T..."
  }
]
```

**POST /parties**
```json
Headers:  Authorization: Bearer {token}
Request:  {
  "title": "My Party",
  "host": "Host Name",
  "category": "House Party",
  "day": "saturday",
  "doorsOpen": "10 PM",
  "address": "123 Main St"
}
Response: Party (with status: "pending")
```

**POST /parties/{id}/going**
```json
Headers:  Authorization: Bearer {token}
Response: { "going": true, "goingCount": 43 }
```

### Admin

**GET /admin/parties/pending**
```json
Headers:  Authorization: Bearer {token} (admin only)
Response: [Party, Party, ...]
```

**POST /admin/parties/{id}/approve**
```json
Headers:  Authorization: Bearer {token} (admin only)
Response: { "message": "Party approved", "partyId": "uuid" }
```

---

## Real-Time Updates

### Supabase Realtime Integration

```typescript
// Frontend: useGoingStatus.ts
const channel = supabase
  .channel('party-counts')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'parties'
  }, (payload) => {
    // payload.new contains updated party
    setPartyCounts(prev => ({
      ...prev,
      [payload.new.id]: payload.new.going_count
    }));
  })
  .subscribe();
```

### Flow

```
User A clicks "I'm Going"
       │
       ▼
Backend updates parties.going_count = 5
       │
       ▼
Supabase detects row change
       │
       ▼
Broadcasts to all subscribed clients
       │
       ▼
User B's useGoingStatus receives event
       │
       ▼
Updates local state instantly
       │
       ▼
PartyCard re-renders with new count
```

---

## Testing

### Frontend Tests (Jest + React Testing Library)

```
src/__tests__/
├── api.test.ts              # API client tests
├── dateHelpers.test.ts      # Date utility tests
└── components/
    ├── LoginModal.test.tsx  # Auth flow tests
    └── AddPartyModal.test.tsx # Form validation tests
```

**Run tests:**
```bash
cd frontend && npm test
```

### Backend Tests (Pytest)

```
tests/
├── conftest.py          # Test fixtures
├── test_auth.py         # Auth endpoint tests
├── test_parties.py      # Party CRUD tests
├── test_going.py        # Going status tests
├── test_admin.py        # Admin approval tests
└── test_security.py     # Security tests
```

**Run tests:**
```bash
cd backend && pytest
```

---

## Environment Variables

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### Backend (`.env`)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx  # Server-side only
SUPABASE_ANON_KEY=xxx
```

---

## Quick Reference

### Start Development

```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend
cd backend && uvicorn app.main:app --reload
```

### Key Files to Know

| What | Where |
|------|-------|
| Homepage | `frontend/src/app/page.tsx` |
| Auth state | `frontend/src/contexts/AuthContext.tsx` |
| API calls | `frontend/src/services/api.ts` |
| Real-time | `frontend/src/hooks/useGoingStatus.ts` |
| Backend entry | `backend/app/main.py` |
| Party routes | `backend/app/routers/parties.py` |
| Auth routes | `backend/app/routers/auth.py` |

### Common Patterns

**Check if user is authenticated:**
```typescript
const { isAuthenticated, user } = useAuth();
if (!isAuthenticated) {
  setShowLoginModal(true);
}
```

**Make authenticated API call:**
```typescript
// api.ts handles auth headers automatically
const parties = await partiesApi.getParties('friday');
```

**Toggle going status:**
```typescript
const { toggleGoing, isGoing, getCount } = useGoingStatus();
await toggleGoing(partyId);
// State updates automatically via realtime
```

---

## Bug Fixes

### Share Prompt for Non-Authenticated Users (January 2026)

**Issue:** When a non-logged-in user clicked "Going" on a party, the share/invite modal did not appear, even though it worked correctly for authenticated users.

**Root Cause:** In `page.tsx`, the `handleGoingClick` function had an unnecessary authentication check that prevented the modal from showing for anonymous users:

```typescript
// Before (broken)
if (!wasGoing && isAuthenticated) {
  setShowModal(true);
}
```

**Fix:** Removed the `isAuthenticated` condition so the share prompt appears for all users:

```typescript
// After (fixed)
if (!wasGoing) {
  setShowModal(true);
}
```

**File Changed:** `frontend/src/app/page.tsx` (lines 119-122)

**Impact:** The share prompt now correctly appears for both authenticated and non-authenticated users when they mark themselves as "going" to a party.

---

**Last Updated:** January 21, 2026
