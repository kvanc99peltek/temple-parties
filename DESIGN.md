# DESIGN.md — the tuparties v2 design system (as built)

> The record of design decisions to-do task 4.1 asked for. This documents the
> system as it EXISTS in code after the WF-B2/WF-D redesign (Figma
> `tuparties Redesign`, node 148-742) landed on `epic-8` and was iterated live
> with the owner on 2026-08-17. When code and this file disagree, fix one of
> them — this file is only useful while it's true.

## Palette

| Token | Value | Role |
|---|---|---|
| `temple-purple` | `#b24bf3` | Primary. Actions (GOING, tabs, category chips), active nav, links |
| `temple-purple-light` | `#e0d4ff` | Secondary. Navigate buttons, host lines, cast-vote fill, COPY |
| `temple-hyped` | `var(--temple-hyped)` = `#FFD60A` | The HEADLINER badge. **The app's ONE glow** — nothing else glows |
| `temple-hyped-ink` | `var(--temple-hyped-ink)` = `#0a0a0f` | Text on the hyped yellow |
| `temple-surface` | `#1a1a1d` | Flat modules (nav bar, tabs container, detail-page cards) |
| `temple-surface-2` | `#252528` | Feed cards (with `border-white/10` hairline) |
| `temple-muted` | `#9a9a9a` | Secondary text, section labels, idle icons |
| base | `#000` | Page background |

Retired: green `#10B981` (v1 going-state), cyan `#45E0FF` (Figma proposal —
owner rejected 2026-08-17). The hyped accent lives as CSS custom properties in
`globals.css :root` because the hand-rolled Leaflet popup CSS must read the
exact same values — change the accent there and components + map popups move
together. Everything else is a Tailwind token in `tailwind.config.ts`
(`temple.*`); components never hardcode hex.

## Typography

- **Wordmark:** bold Montserrat `tuparties`, `tu` in `temple-purple`
  (`ui/Wordmark.tsx`). One component used by the mobile Header and the desktop
  top bar. Bitcount is retired from chrome.
- **UI font:** Montserrat everywhere in the redesigned surfaces.
- Card scale (compact card): title 20/24 bold · host 14 · time 14 · votes 14.
  Hero: title 24 uppercase · host 15. Detail: title 28 uppercase.
- Section labels: 10–11px bold, tracking ~1px, uppercase, muted
  (`ui/SectionLabel.tsx`).

## Component kit

Generic kit in `frontend/src/components/ui/` (heaviest-commented code in the
repo, per conventions.md): `Pill` (tones: hyped / accent / neutral / overlay;
chips are `shape="square"` — 4px corners — everywhere), `SegmentedTabs`,
`StatTile`, `SectionLabel`, `IconButton` (accent = light-purple fill),
`DashedCard`, `StickyActionBar` (z-9000, safe-area padded), `StagePoster`
(cinema blur-wings, CSS blur on a static img — never backdrop-filter; one per
page), `VoteArrow` (reddit-style, fills when cast), `VoteRow`, `AddressGate`,
`VerifiedMark`, `NavigateIcon` (solid paper plane), `ShareIcon`, `Wordmark`.

Party-page pieces in `components/party/`: `PartyHero`, `HostRow`,
`WhenWhereCard`, `PromoCard`, `RatingPanel`, `ShareActions`. Also in the kit:
`AddressAutocomplete` (shared by create-party + become-host) and the
rankings pieces `RankChampionCard` / `RankingRow` / `HostRankingRow`.

## Card anatomy (the feed)

Both cards share one props contract — `FeedCardProps`, exported from
`PartyCard.tsx`. Pages build one props object per party and pick a card.

- **HeadlinerCard** (the night's top party): full-width StagePoster, badge row
  (`HEADLINER` yellow + category chip), uppercase title, host, time ·
  address(gate) + votes, full-width GOING bar + navigate.
- **PartyCard** (everything else): 42% poster pane, category chip + chevron,
  title, host, time + votes on one left-grouped row, GOING bar + navigate.
  No fixed height — content sizes the card. No address on the card (the
  detail page owns it).

Interaction rule: **the whole card is one tap target** (stretched invisible
Link, z-1) opening `/party/[id]`; only the GOING/navigate action row floats
above it (z-2). Vote rows on cards are read-only — rating happens on the
detail page. Never nest a `<button>` inside a `<Link>` (§8.9).

## Party detail page (WF-D)

Pushed route: back arrow + solid purple SHARE over the hero, no mobile tab bar
(`AppShell hideBottomNav`), sticky action bar (GOING ~50% / SHARE labeled /
navigate icon; ticketed = GOING outline + BUY TICKETS primary). Order: hero → tags
(`HEADLINER` when `isHeadliner`, category) → title → HostRow (cred line from
the leaderboard RPC when host_codes are linked) → ShareActions (headliner gets
a full-width SHARE THIS PARTY button plus Copy link · Instagram Story; other
parties get the three text actions) → WhenWhereCard (date · time
· address stacked; map button deep-links `/map?party=<id>`; logged-out sees
"Log in to view address") → StatTiles (COVER/TICKETS · GOING) → PromoCard →
FROM THE HOST → RatingPanel (inline vote buttons; going-only enforced
server-side, surfaced as toast, never preached in copy) → INVITE → sticky bar.

## System rules

1. **One glow.** Only the HEADLINER badge glows (`shadow-hyped-glow`).
2. **Soft-gate nulls stay null.** Server-stripped counts render as dashes or
   count-less labels ("GOING"), never fake zeros. The address is the carrot;
   everything else stays browsable logged out.
3. **No live blur.** `backdrop-filter` is banned on scrolling surfaces;
   StagePoster's wings are a one-time CSS filter on a static img (pre-bake
   seam documented in the component if perf ever complains).
4. **Chips are square-ish.** 4px corners on all badge chips; full-round is
   reserved for the compact GOING pill and avatars.
5. **Map popups mirror cards.** Their CSS in `globals.css` consumes the same
   `--temple-*` vars; change colors once.
6. **Forms mirror server validation, in friendlier words.** The server 422 is
   the backstop, never the UX: rules a host can hit get checked client-side
   with a human sentence under the field (ticket link https rule in
   `utils/ticketUrl.ts`, promo code+label pairing, grad-year list). Helpful
   fixes are applied for them (bare domain → https:// prepended); explicit
   mistakes are explained, never silently rewritten (http:// stays an error).

## Decision log

| Date | Decision |
|---|---|
| 2026-08-17 | Palette locked: purple/black/light-purple + yellow HYPED only; cyan rejected, green retired (owner) |
| 2026-08-17 | Wordmark: Montserrat `tuparties`, purple `tu` (owner) — Bitcount retired from chrome |
| 2026-08-17 | Stage wings: CSS blur, no server pre-bake (owner) |
| 2026-08-17 | Ratings: RSVP-gated server-side; UI mentions it only via toast on attempt (owner) |
| 2026-08-17 | Vote glyphs: reddit-style arrows, icon-only fill in secondary when cast (owner; thumbs tried and rejected) |
| 2026-08-17 | Compact card: classic v1 layout (42% poster) with new skin; no address/icons; whole card tappable (owner) |
| 2026-08-17 | Badge copy: `HEADLINER` (was HYPED · TONIGHT'S HEADLINER); category chip joins it on hero + detail |
| 2026-08-17 | Detail page gets `isHeadliner` from the server (top going_count of its night) |
| 2026-08-17 | Map popups repainted to the card language: one chip (HEADLINER wins over category), surface-2, read-only VoteRow, no address row; going/nav bar keeps its fused shape |
| 2026-08-17 | Map day filter = the same SegmentedTabs as home, floating over the map |
| 2026-08-17 | Sponsor system revived (owner): home slot + map pin/popup, all driven by `lib/sponsors.ts` (empty array = everything off); text banner + nightly reminder stay retired |
| 2026-08-17 | Rankings: dropdown filter kept (owner rejected stacked tabs), champion hero (#1 on the 280px stage w/ gold `#1 · <period>` chip), medal rank colors (gold/light-purple/purple), rows as linked cards |
| 2026-08-17 | Profile: identity card + role-aware CTA stack (Host profile row ABOVE Create a party), grouped details card, `LIVE`/`IN REVIEW`/`REJECTED` listing chips |
| 2026-08-17 | school_year became GRAD YEAR ("Class of 2028"), onboarding heading "Class of"; legacy class-standing values still accepted server-side |
| 2026-08-17 | Become-a-host = WF-BH 3-step (pitch → org → CLAIM/pending), vertically centered (`my-auto`, never `justify-center` — it clips overflow) |
| 2026-08-17 | Host org identity: approved application locks the posting host name and gates the Frat Party category (server-enforced); read-only `/host` page is the future paid-tier seam |
| 2026-08-17 | AddressAutocomplete extracted to the kit — create-party + become-host share it |
| 2026-08-17 | Poster upload preview = 4:5 vertical, same ratio the app renders flyers |
| 2026-08-17 | Create form's last step = "Tickets": ticket link + price text + promo, all optional. Link validated client-side (`utils/ticketUrl.ts` mirrors the server's https-only rule; bare `posh.vip/…` gets https:// glued on; explicit http:// errors instead of rewriting) — a saved link is what flips the party page to WF-D2 BUY TICKETS |
| 2026-08-17 | Promo entry hides behind a DashedCard disclosure — the dashed coupon cue previews the party-page PromoCard. Code uppercases as typed (it IS the string people copy); code+deal are required together (server pairing rule, checked in the form first); closing the disclosure clears all three fields |
| 2026-08-17 | Ticketed party with no price text reads `ONLINE / TICKETS` on the stat tile — `FREE / TICKETS` next to a BUY TICKETS bar would lie |
| 2026-08-21 | Party-page SHARE is the loudest secondary (TUP-9): solid purple pill on the hero (not a ghost overlay), labeled SHARE in the sticky bar, full-width SHARE THIS PARTY on the headliner, plus Copy link · Instagram Story. Copy uses execCommand first so Mobile Safari / Instagram WebView actually get the URL. |
