---
doc: v2-sitemap
product: tuparties
status: PROPOSED — not built, not committed
scope: Temple University
audience: agent
figma:
  file_key: 7cB9zFg7HP2geCXFdgaPRJ
  page: SiteMaps
  page_id: "136:2377"
  frames:
    - name: v2 Site Map
      id: "139:37"
    - name: flows
      id: "140:37"
sources:
  - owner: v2 feature list stated in conversation
  - owner: clarifications on guest count and guest-list visibility
  - figma: tuparties-Redesign (existing design components and auth modals)
confidence: MIXED — see provenance flags per row
---

# v2 Sitemap

## 0. Provenance flags — READ FIRST

Every node and flow step below carries a `src` value. An agent must treat these
differently.

| flag | meaning | how an agent should treat it |
|---|---|---|
| `owner` | stated explicitly by the owner in the v2 feature list or a clarification | spec — build to it |
| `figma` | exists as a design in `tuparties-Redesign`, not in the owner's stated v2 list | designed, not restated as a v2 requirement — confirm before building |
| `assistant` | gap-fill added to make a flow continuous; NOT specified by anyone | UNCONFIRMED — confirm before building |
| `tbd` | owner has explicitly deferred the decision | do not implement; do not invent a mechanism |

## 1. Section index

| section | purpose |
|---|---|
| `account` | identity creation and profile state |
| `host` | party creation and host-tier features |
| `attendee` | discovery, party actions, and social graph |

## 2. Node registry

`class` values: `surface` (a page or tab), `flow` (an intermediate step or
container), `action` (a discrete user action or field), `paid` (gated behind the
paid host tier), `decision` (branch point), `tbd` (undecided).

### 2.1 `account`

| id | label | class | src |
|---|---|---|---|
| `auth` | Auth — .edu email + 6-digit code | surface | `owner` |
| `create-account` | Create Account | flow | `owner` |
| `profile-picture` | Profile picture | action | `owner` |
| `school-year` | School year | action | `owner` |
| `greek-life` | Greek life association | action | `owner` |
| `link-instagram` | Link Instagram | action | `owner` |
| `username` | Choose username | action | `figma` |
| `profile` | Profile | surface | `owner` |
| `become-a-host` | Become a host | tbd | `tbd` |

### 2.2 `host`

| id | label | class | src |
|---|---|---|---|
| `host-account` | Host Account | surface | `owner` |
| `create-party` | Create Party | flow | `owner` |
| `tier-free` | Free | flow | `owner` |
| `tier-paid` | Paid | paid | `owner` |
| `name-location-time` | Name / location / time | action | `owner` |
| `posters` | Posters | action | `owner` |
| `event-description` | Event description | action | `owner` |
| `ticket-price` | Ticket price | action | `owner` |
| `guest-count-host` | Guest count | action | `owner` |
| `verified-badge` | Verified badge | paid | `owner` |
| `protected-location` | Protected location | paid | `owner` |
| `custom-map-pin` | Custom map pin | paid | `owner` |
| `announcements` | Announcements to RSVPs | paid | `owner` |
| `guest-list-usernames` | Guest list — usernames | paid | `owner` |

### 2.3 `attendee`

| id | label | class | src |
|---|---|---|---|
| `home` | Home | surface | `owner` |
| `map-view` | Map View | surface | `owner` |
| `leaderboards` | Leaderboards | surface | `owner` |
| `browse-parties` | Browse Parties | flow | `owner` |
| `map-browse` | Map Browse | flow | `owner` |
| `check-rankings` | Check Rankings | action | `figma` |
| `rsvp` | RSVP | action | `owner` |
| `navigate` | Navigate | action | `owner` |
| `rate` | Rate | action | `owner` |
| `guest-count` | Guest count — RSVP count | action | `owner` |
| `friends-profiles` | Friends' profiles — guests only | action | `owner` |
| `full-guest-list` | Full guest list — paid hosts | paid | `owner` |
| `invite-users` | Invite users | action | `owner` |
| `custom-link` | Custom link | action | `owner` |
| `added-as-friends` | Added as friends | action | `owner` |
| `mutual-list` | Mutual list | flow | `owner` |

Node count: 39.

## 3. Edge list

Directed. Format: `source -> target`.

```
# account
auth              -> create-account
create-account    -> profile-picture
create-account    -> school-year
create-account    -> greek-life
create-account    -> link-instagram
create-account    -> username
profile-picture   -> profile
school-year       -> profile
greek-life        -> profile
link-instagram    -> profile
username          -> profile
profile           -> become-a-host

# account -> host bridge
become-a-host     -> host-account

# host
host-account      -> create-party
create-party      -> tier-free
create-party      -> tier-paid
tier-free         -> name-location-time
tier-free         -> posters
tier-free         -> event-description
tier-free         -> ticket-price
tier-free         -> guest-count-host
tier-paid         -> verified-badge
tier-paid         -> protected-location
tier-paid         -> custom-map-pin
tier-paid         -> announcements
tier-paid         -> guest-list-usernames

# attendee
home              -> browse-parties
map-view          -> map-browse
leaderboards      -> check-rankings
browse-parties    -> rsvp
browse-parties    -> navigate
browse-parties    -> rate
map-browse        -> rsvp
map-browse        -> navigate
map-browse        -> rate
rsvp              -> guest-count
guest-count       -> friends-profiles
guest-count       -> full-guest-list
invite-users      -> custom-link
custom-link       -> added-as-friends
added-as-friends  -> mutual-list
```

Edge count: 38.

## 4. Deliberately absent edges

Edges NOT drawn, and the reason. An agent must not add these without
confirmation.

| candidate edge | why absent |
|---|---|
| `rate -> leaderboards` | v1's diagram had `update-rating -> leaderboards`, but the owner did not restate this relationship for v2 |
| `? -> invite-users` | entry point unspecified; `invite-users` is a root in this graph |
| `auth` gating `browse-parties` | whether browse sits behind auth is a placement decision the owner has not made |
| `guest-list-usernames <-> full-guest-list` | the same capability appears in both the host and attendee sections; whether these are one surface or two is unspecified |

## 5. Graph properties

- Roots: `auth`, `invite-users`.
- Sinks: `name-location-time`, `posters`, `event-description`, `ticket-price`,
  `guest-count-host`, `verified-badge`, `protected-location`, `custom-map-pin`,
  `announcements`, `guest-list-usernames`, `navigate`, `rate`,
  `friends-profiles`, `full-guest-list`, `check-rankings`, `mutual-list`.
- `become-a-host` is the single articulation point between the `account` and
  `host` sections. Its mechanism is `tbd`. Removing it disconnects the entire
  `host` section from the graph.
- The social chain `invite-users -> custom-link -> added-as-friends ->
  mutual-list` is a disconnected component. It has no edge to or from any other
  node.
- `leaderboards` remains reachable only from its own tab. Nothing feeds it.

## 6. Constraints and clarifications

Direct from owner. These override any inference from labels.

| key | value | src |
|---|---|---|
| auth required | YES — auth is a v2 requirement, not optional | `owner` |
| `guest-count` definition | equals the RSVP count | `owner` |
| guest visibility, free host | guest count only | `owner` |
| guest visibility, paid host | full guest list, all usernames | `owner` |
| guest visibility, attendee who is a guest | may view the profiles of their own friends who are also guests | `owner` |
| host flow mechanism | deferred, will be decided later | `tbd` |
| revenue model | paid ads continue AND a paid host tier is added; both run together | `owner` |
| verified badge placement | intentionally behind the paid tier; owner's decision, made on first-semester experience | `owner` |

## 7. Flows

14 flows. Format is an ordered step sequence. Steps carry `src` where they are
not owner-specified. Branch points are marked `decision`.

```
FLOW 1  signup-auth
  sign-up -> enter-edu-email -> verify-6-digit-code -> account-created

FLOW 2  signup-onboarding
  school-year -> choose-username[figma] -> profile-picture -> greek-life
    -> link-instagram -> home

FLOW 3  log-in
  log-in -> enter-edu-email -> verify-6-digit-code -> home

FLOW 4  browse-and-rsvp
  home -> fri-sat-picker[figma] -> party-card -> rsvp -> guest-count-updates

FLOW 5  map-and-navigate
  map-view -> party-pin -> party-card -> open-directions[assistant]

FLOW 6  rate-a-party
  party-card -> like-dislike -> rating-ratio-updates -> leaderboards

FLOW 7  become-a-host
  profile -> become-a-host[tbd] -> host-account

FLOW 8  create-party-free
  add-party -> name-location-time -> upload-poster -> event-description
    -> ticket-price -> publish[assistant] -> live-listing[assistant]

FLOW 9  create-party-paid
  add-party -> upgrade-to-paid -> verified-badge -> protected-location
    -> custom-map-pin -> publish[assistant]

FLOW 10 host-announcements
  host-account -> my-party[assistant] -> compose-announcement[assistant]
    -> send[assistant] -> delivered-to-rsvps

FLOW 11 guest-list-visibility
  party-rsvps -> decision:paid-host?
    yes -> full-guest-list-usernames
    no  -> guest-count-only

FLOW 12 add-friends
  profile -> invite-users -> generate-custom-link -> share-link[assistant]
    -> recipient-opens-link[assistant] -> decision:has-account?[assistant]
    yes -> added-as-friends -> mutual-list
    no  -> sign-up-first[assistant]  # terminates into FLOW 1

FLOW 13 remove-friend                                        # ALL steps assistant
  profile -> friends-list -> select-friend -> remove-friend
    -> removed-from-mutual-list

FLOW 14 profile-settings                                     # ALL steps assistant
  profile -> settings -> fanout:
    edit-profile-picture
    school-year
    greek-life-association
    username
    linked-instagram
    log-out
```

### 7.1 Flow provenance summary

| flow | provenance |
|---|---|
| 1, 2, 3, 4, 6, 7, 11 | owner-specified, with named `figma` steps where noted |
| 5, 8, 9, 10, 12 | owner-specified sequence with `assistant` connective steps |
| 13, 14 | requested by owner; ALL steps are `assistant` gap-fill |

## 8. Flows not covered

No source specifies these. They are absent, not deferred.

- Edit an existing party listing.
- Delete or cancel a party listing.
- Cancel or withdraw an RSVP.
- Block a user.
- Report a user, a party, or a listing.
- Any admin, moderation, or operator surface. In v1 the owner personally
  filtered every listing; v2 introduces host-created content with no stated
  replacement for that filter.
- Payment collection for the paid host tier.
- Downgrade from paid to free tier.
- Account deletion.

## 9. Undefined within proposed features

Named in the v2 list but with no stated mechanism.

- `become-a-host` — the whole flow. Owner has explicitly deferred.
- `protected-location` — what "protected" means operationally: hidden until
  RSVP, hidden until approval, or something else.
- `verified-badge` — what verification step, if any, accompanies purchase.
- `custom-map-pin` — what is customisable.
- `announcements` — delivery channel (push, email, SMS, in-app).
- `leaderboards` — ranking subject, metric, and time window. Undefined since v1.
- `invite-users` — whether the custom link is single-use or broadcast, and
  whether the resulting relationship is symmetric.
- `mutual-list` — whether mutuals surface on party cards, and if so in what form.
- `greek-life` — whether the field is free text, a controlled list, or verified.
- `link-instagram` — purpose: identity verification, profile display, or host
  attribution on the card.
