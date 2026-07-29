---
doc: v1-sitemap
product: tuparties
status: SHIPPED
scope: Temple University — spring 2026 semester
audience: agent
figma:
  file_key: 7cB9zFg7HP2geCXFdgaPRJ
  page: SiteMaps
  page_id: "136:2377"
  frame: Current Version Site Map
  frame_id: "137:37"
sources:
  - diagram: "Current Version Site Map User Flow" (uploaded raster)
  - writeup: https://www.rafiatamir.tech/projects/project-one
  - owner: direct statements in conversation
confidence: HIGH
provenance_rule: every node and edge below is transcribed from the diagram; no node or edge is inferred
---

# v1 Sitemap

## 1. Node registry

`class` reflects the fill colour used in the source diagram. Three distinct
fills are present; the diagram carries no legend, so class names are
descriptive of position in the graph, not of a labelled taxonomy.

| id | label | class | fill in source |
|---|---|---|---|
| `home` | Home Page | page | pink |
| `maps` | Maps Page | page | pink |
| `leaderboards` | Leaderboards | page | pink |
| `list-browse` | List Browse | browse | green |
| `maps-browse` | Maps Browse | browse | green |
| `rate` | Rate | action | salmon |
| `rsvp` | RSVP | action | salmon |
| `navigate` | Navigate | action | salmon |
| `check-rankings` | Check Rankings | action | salmon |
| `update-rating` | Update Rating | action | salmon |

Node count: 10.

## 2. Edge list

Directed. Format: `source -> target`.

```
home          -> list-browse
maps          -> maps-browse
list-browse   -> rate
list-browse   -> rsvp
list-browse   -> navigate
maps-browse   -> rate
maps-browse   -> rsvp
maps-browse   -> navigate
leaderboards  -> check-rankings
update-rating -> leaderboards
```

Edge count: 10.

Rendering note: in the source diagram, `list-browse` and `maps-browse` do not
draw six separate edges. Both drop into a single shared horizontal bus which
then branches to `rate`, `rsvp`, and `navigate`. The six edges above are the
logical equivalent.

## 3. Graph properties

Facts derivable from section 2. Included because agents reasoning about
navigation or reachability will need them.

- **Two parallel entry surfaces.** `home` and `maps` are independent roots that
  converge on an identical action set. Neither reaches the other.
- **`leaderboards` is an isolated component.** No edge connects the
  `leaderboards` / `check-rankings` / `update-rating` cluster to the
  `home` / `maps` browse flow in either direction.
- **`update-rating` is a source with no inbound edge.** Nothing in the diagram
  reaches it. How a user arrives at it is not specified.
- **`check-rankings` is a sink with no outbound edge.**
- **`rate`, `rsvp`, `navigate` are sinks.** Each has two inbound edges and no
  outbound edges.
- Roots: `home`, `maps`, `update-rating`.
- Sinks: `rate`, `rsvp`, `navigate`, `check-rankings`.

## 4. Runtime constraints

Direct from owner. These govern how the graph actually behaves and override any
assumption an agent might form from the node labels alone.

| constraint | value |
|---|---|
| authentication | NONE — no auth exists |
| user accounts | NONE |
| host flow | NONE — does not exist in product |
| listing mechanism | MANUAL — hosts text the owner; owner creates the listing |
| user identity on actions | ABSENT — `rate`, `rsvp`, `update-rating` operate without an authenticated user |

Follows from the above and nothing further: there is no account, therefore no
per-user state is attached to any action in section 2.

## 5. Surface contents

Compact inventory of what each page renders. Sourced from the writeup and from
Figma `home page v1` (`8:45`) and `size mockups` (`14:158`).

### `home`
- Wordmark
- Day-switch tabs — Fri / Sat
- Advertising banner, positioned directly beneath the day-switch tabs
- Vertical list of party cards

### party card (rendered inside `list-browse`)
- Poster image
- Pills — party type, verified, hyped
- Title
- Host name
- Time
- Location (street address, displayed in plaintext)
- Like ratio, e.g. `78% (19)`
- Going button with count, e.g. `Going (67)`
- Navigate button

### `maps`
- Map with party pins
- Advertising pin

### `leaderboards`
- No design exists in the Figma file for this surface.

### global
- Bottom navigation bar, 3 items: Home, Map, Leaderboards
- Post-midnight advertising popup

## 6. Known defects and unmet requests

Documented in the writeup, collected from weekly feedback loops with 8 core
users. Listed as recorded state, not as a work queue.

| item | status in v1 |
|---|---|
| `navigate` opens driving directions rather than walking | present, unfixed |
| five-star rating too heavy for users | replaced with binary like/dislike |
| design perceived as confusing / overwhelming | reported, iterated on |
| users want to see host cover charge / price | requested, NOT shipped |

## 7. Not defined in any source

Recorded as absence of information. An agent must not substitute a default.

- Tech stack, hosting, database, deployment.
- Ranking logic behind `leaderboards` — what is ranked, on what metric, over
  what window.
- Path by which a user reaches `update-rating`.
- Relationship, if any, between `rate` and `update-rating`. They are separate
  nodes in the diagram with no connecting edge.
- Trigger condition for the `Locked` state on the Like component (Figma
  `51:403`).
- Host verification process behind the Verified badge.
- Criteria for the `Hyped` pill and the Hyped vs. Unhyped card split.
- Meaning and delivery mechanism of the Bell component (Figma `37:442`).
- Implementation of the map advertising pin and the post-midnight popup. Only
  the home banner appears in any mockup.
