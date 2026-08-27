# Prompt: backend work for the map redesign (paid-host pin layer)

You are working in the **tuparties** repo (Temple Party Finder). Read `CLAUDE.md` first — it explains the two apps, the commands, and the rules. The non-negotiables that bite here:

- **Never push to remote. Never promote `tuparties-dev` into prod.** Commit locally only when the owner asks.
- **Schema files are documentation, not migrations.** Changes are made by hand in the Supabase dashboard (dev first), then recorded as the next numbered file in `backend/schema/` (latest is `025_thursday_day.sql`, so you start at `026_…`). Verify live schema through PostgREST, not from the baseline captures.
- The backend (`backend/app/`, FastAPI on Railway) uses the **service-role key** — RLS does not protect you; `require_admin` / `require_auth` in `routers/auth.py` do. Every write endpoint is rate-limited via `constants.RATE_LIMITS` (slowapi, in-memory).
- Tests: `make test` (pytest, `backend/tests/`). MagicMock lets nonexistent Supabase builder methods pass — smoke-test any new query chain against dev.
- The frontend contract is camelCase; `routers/parties.py::db_to_response` is where DB rows become `PartyResponse` (`models/party.py`).

The frontend half of this feature is **already built** (branch `rafiatamir/tup-10-…`, uncommitted at the time of writing). Your job is the backend that turns its stand-ins into real data. Do not change frontend behaviour; where a frontend flip is needed I name the exact line.

---

## 1. What the frontend does now (so you know what to feed it)

Source of truth for the design: Figma `tuparties Redesign`, section **13 · MAP** (node `291-716`): five frames — M2 paid pin + house highlight, M3 bottom sheet, M4 pin states + zoom ladder, M5 host colour picker, M5b free-host upsell — plus a skinned row.

**Two pins** (`frontend/src/utils/mapPins.ts`, CSS in `globals.css`):

| Pin | Who | Look |
|---|---|---|
| `disc` | free hosts | the v1 purple circle with the host label, count badge tucked on the SE rim |
| `ring` | paid hosts (**stand-in today: `isVerified`**) | coloured ring, white plate with initials (or logo later), count badge, stem to the exact point; states: selected (white focus ring, 1.15×), going (✓ on badge), headliner (yellow halo + ★), live (pulse, doors → +4 h), over (dimmed), muted (another sheet open); "HOST · 11 PM" chip at zoom ≥ 16 |

**Host brand = three colour slots**, delivered to the pin as CSS variables (`--pin-primary` ring/chip/pulse, `--pin-secondary` plate, `--pin-accent` badge/LIVE tag/initials, plus `accentInk`). Today every ring pin uses `DEFAULT_HOST_BRAND` (app purple) from `utils/mapHelpers.ts`. **The frontend is waiting for a `hostBrand` object per party.**

**PartySheet** (`components/map/PartySheet.tsx`) replaced the Leaflet popup: poster thumb ringed in brand colour, HEADLINER/category + LIVE NOW tags, title, host line ("by Halo ✓ · 12 parties hosted"), COVER / STARTS / SHARE tiles, address + votes, GOING + navigate. The "N parties hosted" line comes from `hostStats`, which the **list endpoint doesn't carry** — the sheet fetches `GET /parties/{id}` on open to get it.

**Map lock:** the map can't leave the party zone — W York St → Girard Ave, N 5th → N 19th, as the smallest lat/lng box holding the four corner intersections (`PARTY_ZONE` in `utils/mapHelpers.ts`: N 39.9905, S 39.9701, E −75.1411, W −75.1675). **A party geocoded outside that box is unreachable on the map.**

Other frontend rules the backend should not fight:
- Cover tiles render only `FREE` / `$N` / `—` (`utils/coverPrice.ts` parses the host's free text). Door times render as `10 PM`, never `10:00 PM` (`displayDoorTime`).
- Soft-gate: server-nulled counts/addresses stay `null` end-to-end (no fake zeros).
- Deep link `/map?party=<id>` pans only; the map never opens a sheet by itself (owner decisions).

## 2. Design decisions already made (don't relitigate; do encode)

1. **The free/paid contrast is the product.** Free hosts keep the disc exactly as today; paid hosts get colour, identity, a badge and (later) a lit house. That contrast is the upsell (M5b) — so paid must never read as free: **purple is deliberately not a preset** in the colour picker.
2. **Paid ≠ verified.** `isVerified` is a stand-in only because no tier exists. Tier is a property of the **host** (the human/org that posts), not of a party.
3. **A brand is three slots** (primary / secondary / accent + accent ink). Picker offers 7 preset hues that pass contrast on the dark tiles, plus a custom hex that is auto-lightened if it fails. Pin icon is initials / uploaded logo / emoji (M5).
4. **House highlight = the host's actual parcel footprint**, geocoded from the address, lit in the primary colour at zoom ≥ 17 only ("so the house fill never turns the campus into a colour blob"). Host can toggle it and ADJUST the polygon when geocoding picks the wrong one. Deferred on the frontend until the data exists.
5. **No clustering** for now (the zoom lock makes overlap rare). **No walk time** (no location permission).
6. **Payments are out of scope.** Tier is **admin-granted** for now (same pattern as `is_admin` / `is_verified`); a checkout comes later and will just set the same field.

## 3. Backend tasks (in order — each is independently shippable)

### Task 1 — Host tier on the owner entity  *(unblocks the pin)*
Goal: every party in `GET /parties` says which pin it gets.

- Owner entity: the poster's `user_profiles` row (`parties.created_by → user_profiles`, schema 023). `host_codes` is admin-curated and empty for most self-serve hosts, so it is **not** the tier carrier.
- Schema `026_host_tier.sql`: `ALTER TABLE user_profiles ADD COLUMN host_tier text NOT NULL DEFAULT 'free' CHECK (host_tier IN ('free','pro'))`, plus `pro_since timestamptz NULL`.
- Response: add `pinTier: Literal['free','pro']` to `PartyResponse` (list **and** detail). Resolve from the creator's profile; the list is ~15 rows per weekend, one extra `in_` query is fine — do not N+1.
- Admin: `PATCH /admin/hosts/{user_id}/tier` (`require_admin`, rate limit `admin_write`), body `{ "tier": "pro" | "free" }`; log `pro_since`. Extend the admin party payload with `pinTier` so the queue shows it.
- Frontend flip (one line): `pinVariantFor()` in `frontend/src/utils/mapHelpers.ts` → `party.pinTier === 'pro' ? 'ring' : 'disc'`; add `pinTier` to `Party` in `frontend/src/lib/types.ts`. Keep `isVerified` — it still drives the seal.

### Task 2 — Host brand (colour picker data)  *(unblocks colours + logos)*
Goal: pro hosts own a brand; every party they post carries it.

- Schema `027_host_brands.sql`: table `host_brands` (`user_id uuid PK → user_profiles`, `primary_hex text`, `secondary_hex text DEFAULT '#ffffff'`, `accent_hex text`, `accent_ink_hex text`, `pin_icon_kind text CHECK (initials|logo|emoji) DEFAULT 'initials'`, `pin_emoji text NULL`, `pin_logo_path text NULL`, `house_highlight boolean DEFAULT true`, `updated_at`). Hex columns `CHECK (col ~ '^#[0-9a-f]{6}$')`, store lowercase.
- Endpoints in `routers/hosts.py`:
  - `GET /hosts/me/pin` → current brand or defaults, plus `tier` (so the frontend can render M5 vs M5b).
  - `PUT /hosts/me/pin` (`require_auth`, **403 unless `host_tier='pro'`**, rate limit new `host_pin_update: 20/minute`). Validate: preset list of 7 hues (put the list in `constants.py` — take them from the Figma M5 picker; **exclude `#b24bf3`**); custom hex allowed but auto-lighten until contrast vs `#0a0a0f` ≥ 3:1 (WCAG relative luminance); `accent_ink_hex` computed (black or white) from the accent's luminance, not user-set.
  - `POST /hosts/me/pin/logo` (pro only, rate limit like `avatar_upload`): square PNG/SVG ≤ 256 KB into a new public bucket `pin-logos`, randomised key, path stored — mirror `upload_my_avatar` in `routers/profiles.py` (sanitise SVG or reject it; PNG only is acceptable for v1).
- Response: add to `PartyResponse` (list + detail): `hostBrand: { primary, secondary, accent, accentInk } | null` and `pinLogoUrl: str | null` — non-null **only when `pinTier == 'pro'`** (a free host who once had a brand still shows the disc).
- Frontend flip: in `MapContent.tsx` replace `DEFAULT_HOST_BRAND` with `party.hostBrand ?? DEFAULT_HOST_BRAND`; `ringPinHtml` already takes a `brand`; add a `logoUrl` option to it (plate shows `<img>` instead of initials). The M5 picker UI itself is a separate frontend task.

### Task 3 — Host stats on the list (small, optional)
The sheet needs `partiesHosted` and `logoUrl` on open and currently pays a detail round-trip per tap. Add `hostStats` to the list response the same way `_get_host_stats` does it — but **one** `get_host_rankings` RPC call per list request, then map rows by `host_codes[0]`. Keep the detail endpoint unchanged. Frontend already reads `party.hostStats` (`MapContent.sheetParty`) — with it present on the list the fetch simply becomes a no-op cache hit; you can delete the `detailById` effect after.

### Task 4 — House footprint  *(unblocks the lit-house layer)*
Goal: a GeoJSON polygon per party for pro hosts.

- Schema `028_house_footprint.sql`: on `parties`: `house_footprint jsonb NULL` (GeoJSON `Polygon`, WGS84 `[lng, lat]`), `house_footprint_source text NULL` (`osm` | `parcel` | `manual`), `house_footprint_ref text NULL` (OSM way id / parcel id).
- Service `services/footprints.py`: given (lat, lng) → nearest OSM `building` polygon within 25 m (Overpass, same User-Agent discipline as `services/geocoding.py`; timeouts; log-and-null on failure), Philadelphia DOR parcels (ArcGIS REST) as fallback. Pure functions for "point in polygon / nearest polygon" with unit tests; network calls isolated and mocked in tests.
- When: compute on create/update after geocoding **only if the creator is pro**, and on admin approve if missing. Never block a create on it — best-effort, like `_get_host_stats`.
- Host/admin fix-up (M5 "ADJUST"): `GET /hosts/me/pin/footprint?party_id=` returns the stored polygon + up to 5 nearby candidates; `PUT /hosts/me/pin/footprint` picks one (`source='manual'`). Admin equivalent under `/admin`.
- Response: `houseFootprint: GeoJSON | null` on list + detail, non-null only when `pinTier=='pro'` **and** `host_brands.house_highlight`. The frontend will draw it as an `L.geoJSON` layer in the primary colour with a glow at zoom ≥ 17.

### Task 5 — Party-zone validation  *(cheap, prevents unreachable pins)*
- Replace `TEMPLE_BOUNDS` in `constants.py` with the frontend's `PARTY_ZONE` numbers (N 39.9905, S 39.9701, E −75.1411, W −75.1675) so the geocoder's fallback coordinates and the Nominatim viewbox (`services/geocoding.py`) use the same box the map shows. Keep the name if other code imports it; add a comment pointing at `frontend/src/utils/mapHelpers.ts` so the two copies stay in sync.
- On create/update: if the resolved point is outside the zone → **422** with a human message ("That address is outside the map — parties must be between York St and Girard Ave, 5th to 19th"). Admin approve should refuse the same way. Add `outsideZone: bool` to `AdminPartyResponse` for rows that predate the check.

### Task 6 — Cover price as data (optional, matches the frontend rule)
Keep `ticket_price` text (admins want the raw string) but add `cover_cents integer NULL` computed on write with the exact rule in `frontend/src/utils/coverPrice.ts` (first number in the text; "free"/0 → 0; unreadable → NULL). Expose `coverCents`. Frontend can switch `coverStat` to it later.

### Task 7 — Canonical door time on write (optional)
Normalise `doors_open` / `doors_close` to `"10 PM"` / `"10:30 PM"` in `PartyCreate` / `PartyUpdate` validators (the rule is `displayDoorTime` in `frontend/src/utils/dateHelpers.ts`). `parseDoorsOpen` on the frontend already accepts both.

## 4. Response contract to end up with

```jsonc
// GET /parties?weekendOf=… → parties[] (list) and GET /parties/{id} (detail)
{
  "id": "…", "title": "…", "host": "Halo", "pinLabel": "HALO",
  "isVerified": true,              // unchanged — drives the seal
  "pinTier": "pro",                // Task 1: 'free' | 'pro'
  "hostBrand": {                   // Task 2: null unless pinTier == 'pro'
    "primary": "#3b6cff", "secondary": "#ffffff",
    "accent": "#f03b4c", "accentInk": "#ffffff"
  },
  "pinLogoUrl": null,              // Task 2
  "hostStats": { "displayName": "Halo", "partiesHosted": 12,
                 "avgLikePercentage": 76.0, "logoUrl": null }, // Task 3 (list) — already on detail
  "houseFootprint": null,          // Task 4: GeoJSON Polygon | null
  "coverCents": 1000,              // Task 6
  "goingCount": 17, "address": "…" // soft-gated: null for anonymous callers, keep it that way
}
```

## 5. Definition of done

- New numbered schema files for every DB change, applied to **dev** by hand and recorded; nothing touches prod.
- Pydantic models + `db_to_response` updated; **no field renamed or removed** (the frontend is live on the current shape).
- Rate limits registered in `constants.RATE_LIMITS` for every new write endpoint; `require_admin` on admin routes; 403 (not 404) for free hosts hitting pro endpoints.
- pytest green (`make test`) with tests for: tier resolution on list, brand validation (preset / custom-hex lighten / ink derivation), pro-only 403s, zone 422, footprint pure functions. Smoke-test the real Supabase chains against dev once.
- `progress.md` gets a session row; `CLAUDE.md` "Backend structure" gets one sentence per new router/service. Note anything owner-manual (bucket creation, dashboard config) in a runbook line like Epic 10's.
