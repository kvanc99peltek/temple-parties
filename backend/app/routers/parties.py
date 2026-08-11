import asyncio
import logging
import uuid
from fastapi import APIRouter, File, HTTPException, Depends, Query, Request, UploadFile
from typing import List, Optional
from datetime import date, timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.config import get_settings
from app.database import supabase
from app.models.party import (
    PartyCreate,
    PartyResponse,
    PartiesListResponse,
    PosterUploadResponse,
    AddressSuggestion,
    CreateWeekendOptionsResponse,
    WeekendOption,
)
from app.routers.auth import get_current_user, require_auth
from app.routers.profiles import ensure_profile
from app.services.geocoding import geocode_address, suggest_addresses
from app.services import weekend as weekend_service
from app.services.admin_check import user_is_admin
from app.constants import RATE_LIMITS

router = APIRouter(prefix="/parties", tags=["parties"])
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

_POSTER_MAX_BYTES = 1_048_576  # matches posters bucket limit (1MB)
_POSTER_MIME_TO_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}

# Re-export for callers that still import from this module (admin, ratings).
EASTERN = weekend_service.EASTERN
today_eastern = weekend_service.today_eastern
get_current_weekend = weekend_service.get_current_weekend


def _resolve_poster_image(stored: Optional[str]) -> Optional[str]:
    """Turn a storage path into a public URL; leave legacy absolute URLs as-is."""
    if not stored:
        return None
    if stored.startswith("http://") or stored.startswith("https://"):
        return stored
    settings = get_settings()
    return (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/posters/{stored}"
    )


def db_to_response(party: dict, *, reveal: bool = True) -> PartyResponse:
    """Convert database party to API response format.

    Soft-gate (Epic 7.3): when reveal is False (anonymous caller), street
    address and engagement counts are null. Lat/lng stay so the map works.
    """
    party_date = weekend_service.resolve_party_date(party)
    rating_open, rating_locked = weekend_service.rating_window(party)

    address = party["address"] if reveal else None
    going_count = party["going_count"] if reveal else None
    like_pct = float(party.get("like_percentage") or 0) if reveal else None
    rating_count = (party.get("rating_count") or 0) if reveal else None

    return PartyResponse(
        id=party["id"],
        title=party["title"],
        host=party["host"],
        pinLabel=party.get("pin_label", ""),
        category=party["category"],
        day=party["day"],
        date=party_date,
        doorsOpen=party["doors_open"],
        address=address,
        latitude=float(party["latitude"]),
        longitude=float(party["longitude"]),
        goingCount=going_count,
        status=party.get("status"),
        likePercentage=like_pct,
        ratingCount=rating_count,
        isVerified=party.get("is_verified", False),
        posterImage=_resolve_poster_image(party.get("poster_image")),
        description=party.get("description"),
        ticketPrice=party.get("ticket_price"),
        ratingOpen=rating_open,
        ratingLocked=rating_locked,
    )


def _read_going_count(party_id: str) -> int:
    """Read trigger-maintained going_count from parties (do not write it)."""
    result = (
        supabase.table("parties")
        .select("going_count")
        .eq("id", party_id)
        .execute()
    )
    if not result.data:
        return 0
    return int(result.data[0].get("going_count") or 0)


def _can_view_party(party: dict, user: Optional[dict]) -> bool:
    """Approved is public; pending/rejected only for owner or admin."""
    status = party.get("status") or "approved"
    if status == "approved":
        return True
    if not user:
        return False
    if party.get("created_by") == user["id"]:
        return True
    return user_is_admin(user["id"])


@router.get("", response_model=PartiesListResponse)
async def get_parties(
    day: Optional[str] = Query(None, description="Filter by day (friday/saturday)"),
    weekend_of: Optional[str] = Query(None, description="Friday date (YYYY-MM-DD) of the weekend to query"),
    user: Optional[dict] = Depends(get_current_user)
):
    """
    Get all approved parties for the requested (or current) weekend,
    plus authoritative weekend metadata for the frontend.
    Anonymous callers get soft-gated fields (no address / counts).
    """
    if weekend_of:
        try:
            weekend = weekend_service.parse_weekend_of(weekend_of)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail="Invalid weekend_of; expected a Friday date as YYYY-MM-DD",
            )
    else:
        weekend = weekend_service.get_current_weekend()

    meta = weekend_service.weekend_meta(weekend)
    reveal = user is not None

    query = supabase.table("parties").select("*").eq("status", "approved").eq("weekend_of", weekend.isoformat())

    if day:
        query = query.eq("day", day)

    result = query.order("going_count", desc=True).execute()

    return PartiesListResponse(
        weekendOf=meta.weekend_of.isoformat(),
        fridayDate=meta.friday_date.isoformat(),
        saturdayDate=meta.saturday_date.isoformat(),
        parties=[db_to_response(party, reveal=reveal) for party in result.data],
    )


@router.get("/user/going", response_model=List[str])
async def get_user_going_parties(user: dict = Depends(require_auth)):
    """
    Get list of party IDs that the current user is going to.
    """
    result = supabase.table("party_going").select("party_id").eq("user_id", user["id"]).execute()

    return [row["party_id"] for row in result.data]


_demo_weekend_cache: dict = {"weekend_of": None, "expires_at": None}
_DEMO_CACHE_TTL = timedelta(hours=1)
_DEMO_MIN_PARTIES = 5


@router.get("/demo-weekend")
async def get_demo_weekend():
    """
    Return the Friday (YYYY-MM-DD) of the most recent past weekend with enough
    approved parties to make the /demo page feel alive. Falls back to the
    highest-traffic past Friday in the last 12 months if nothing recent qualifies.
    Result cached in-process for 1 hour.
    """
    now = weekend_service.now_eastern()
    if (
        _demo_weekend_cache["weekend_of"] is not None
        and _demo_weekend_cache["expires_at"] is not None
        and _demo_weekend_cache["expires_at"] > now
    ):
        return {"weekendOf": _demo_weekend_cache["weekend_of"]}

    today_iso = today_eastern().isoformat()

    rows = (
        supabase.table("parties")
        .select("weekend_of, going_count")
        .eq("status", "approved")
        .lt("weekend_of", today_iso)
        .execute()
    )

    counts: dict[str, int] = {}
    going_sums: dict[str, int] = {}
    for row in rows.data or []:
        wk = row.get("weekend_of")
        if not wk:
            continue
        counts[wk] = counts.get(wk, 0) + 1
        going_sums[wk] = going_sums.get(wk, 0) + (row.get("going_count") or 0)

    chosen: Optional[str] = None

    # Primary: most recent past Friday with >= _DEMO_MIN_PARTIES approved parties.
    qualifying = sorted(
        (wk for wk, c in counts.items() if c >= _DEMO_MIN_PARTIES),
        reverse=True,
    )
    if qualifying:
        chosen = qualifying[0]

    # Fallback: highest-traffic past Friday in the last 12 months.
    if chosen is None:
        cutoff = (today_eastern() - timedelta(days=365)).isoformat()
        candidates = [wk for wk in counts.keys() if wk >= cutoff]
        if candidates:
            chosen = max(candidates, key=lambda wk: going_sums.get(wk, 0))

    if chosen is None:
        raise HTTPException(status_code=404, detail="No past weekend with party data available")

    _demo_weekend_cache["weekend_of"] = chosen
    _demo_weekend_cache["expires_at"] = now + _DEMO_CACHE_TTL

    return {"weekendOf": chosen}


@router.get("/create-options", response_model=CreateWeekendOptionsResponse)
async def get_create_options(user: dict = Depends(require_auth)):
    """
    Future (and in-progress Saturday) weekends for the create-party picker.
    Browse `GET /parties` weekend meta can be a *past* Friday on Mon — never use that for create.
    """
    del user
    today = weekend_service.today_eastern()
    weekends = weekend_service.creatable_weekends(12, today)
    return CreateWeekendOptionsResponse(
        today=today.isoformat(),
        weekends=[
            WeekendOption(
                weekendOf=w.weekend_of.isoformat(),
                fridayDate=w.friday_date.isoformat(),
                saturdayDate=w.saturday_date.isoformat(),
            )
            for w in weekends
        ],
    )


@router.get("/address-suggest", response_model=list[AddressSuggestion])
@limiter.limit(RATE_LIMITS["address_suggest"])
async def address_suggest(
    request: Request,
    q: str = Query(..., min_length=3, max_length=200),
    user: dict = Depends(require_auth),
):
    """
    Autocomplete addresses near Temple via server-side Nominatim.
    Browsers cannot call Nominatim directly (403) — use this proxy.
    """
    del user  # auth required; unused beyond that
    results = await asyncio.to_thread(suggest_addresses, q)
    return [AddressSuggestion(**row) for row in results]


@router.get("/mine", response_model=List[PartyResponse])
async def get_my_parties(user: dict = Depends(require_auth)):
    """
    Listings created by the current user (pending / approved / rejected).
    Must be registered before GET /{party_id} so "mine" is not captured as an id.
    """
    result = (
        supabase.table("parties")
        .select("*")
        .eq("created_by", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return [db_to_response(party, reveal=True) for party in (result.data or [])]


@router.post("/poster", response_model=PosterUploadResponse)
@limiter.limit(RATE_LIMITS["poster_upload"])
async def upload_poster(
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(require_auth),
):
    """
    Mediated poster upload (Epic 8.1): client sends an image; backend writes to
    the posters bucket with a randomized key and returns the storage path only.
    """
    content_type = (file.content_type or "").lower().strip()
    ext = _POSTER_MIME_TO_EXT.get(content_type)
    if not ext:
        raise HTTPException(
            status_code=400,
            detail="Poster must be JPEG, PNG, WebP, or GIF",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > _POSTER_MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Poster must be 1MB or smaller",
        )

    object_path = f"{user['id']}/{uuid.uuid4().hex}.{ext}"

    try:
        ensure_profile(user)
        supabase.storage.from_("posters").upload(
            object_path,
            raw,
            {"content-type": content_type, "upsert": "false"},
        )
        return PosterUploadResponse(path=object_path)
    except HTTPException:
        raise
    except Exception:
        logger.exception("POST /parties/poster failed")
        raise HTTPException(status_code=400, detail="Failed to upload poster")


@router.get("/{party_id}", response_model=PartyResponse)
async def get_party(
    party_id: str,
    user: Optional[dict] = Depends(get_current_user),
):
    """
    Get a single party by ID.
    Public: approved only. Owner + admin may see pending/rejected.
    Soft-gate strips address/counts for anonymous callers.
    """
    result = supabase.table("parties").select("*").eq("id", party_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    party = result.data[0]
    if not _can_view_party(party, user):
        raise HTTPException(status_code=404, detail="Party not found")

    return db_to_response(party, reveal=user is not None)


@router.post("", response_model=PartyResponse)
@limiter.limit(RATE_LIMITS["create_party"])
async def create_party(request: Request, data: PartyCreate, user: dict = Depends(require_auth)):
    """
    Create a new party. Status will be 'pending' until admin approves.
    Rate limited to 10 requests per minute per IP.
    Geocode failures surface as 422 (no silent fake pins — Epic 8.2 / §8.14).
    """
    ensure_profile(user)

    if data.poster_image is not None:
        prefix = f"{user['id']}/"
        if not data.poster_image.startswith(prefix):
            raise HTTPException(
                status_code=422,
                detail="poster_image must be a path uploaded by this account",
            )

    lat, lng = data.latitude, data.longitude
    if lat is None or lng is None:
        # Off the event loop — Nominatim is sync HTTP (§8.13).
        geocoded = await asyncio.to_thread(geocode_address, data.address)
        if geocoded is None:
            raise HTTPException(
                status_code=422,
                detail="We couldn't find that address. Check the street and try again.",
            )
        lat, lng = geocoded

    # Derive day and weekend_of from the submitted date
    party_date = date.fromisoformat(data.date)
    if not weekend_service.is_creatable_party_date(party_date):
        raise HTTPException(
            status_code=422,
            detail="Party date must be a Friday or Saturday today or in the future",
        )
    day = "friday" if party_date.weekday() == 4 else "saturday"
    # weekend_of is always the Friday of that weekend
    if party_date.weekday() == 5:  # Saturday
        weekend = party_date - timedelta(days=1)
    else:
        weekend = party_date

    try:
        party_data = {
            "title": data.title,
            "host": data.host,
            "pin_label": data.pin_label,
            "category": data.category,
            "day": day,
            "date": data.date,
            "doors_open": data.doors_open,
            "address": data.address,
            "latitude": lat,
            "longitude": lng,
            "going_count": 0,
            "created_by": user["id"],
            "status": "pending",
            "weekend_of": weekend.isoformat(),
            "poster_image": data.poster_image,
            "description": data.description,
            "ticket_price": data.ticket_price,
        }

        result = supabase.table("parties").insert(party_data).execute()

        return db_to_response(result.data[0], reveal=True)

    except HTTPException:
        raise
    except Exception:
        logger.exception("POST /parties failed")
        raise HTTPException(status_code=400, detail="Failed to create party")


@router.delete("/{party_id}")
@limiter.limit(RATE_LIMITS["delete_party"])
async def delete_party(request: Request, party_id: str, user: dict = Depends(require_auth)):
    """
    Delete a party. Only the creator can delete their party.
    """
    # Check if party exists and belongs to user
    result = supabase.table("parties").select("*").eq("id", party_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    party = result.data[0]

    if party["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own parties")

    supabase.table("parties").delete().eq("id", party_id).execute()

    return {"message": "Party deleted"}


@router.post("/{party_id}/going")
@limiter.limit(RATE_LIMITS["toggle_going_auth"])
async def mark_going(request: Request, party_id: str, user: dict = Depends(require_auth)):
    """
    Mark the current user as going to a party (idempotent).
    going_count is maintained by the DB trigger from party_going rows.
    """
    party_result = (
        supabase.table("parties")
        .select("id, status, going_count")
        .eq("id", party_id)
        .execute()
    )

    if not party_result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    party = party_result.data[0]
    if party.get("status") != "approved":
        raise HTTPException(status_code=404, detail="Party not found")

    existing = (
        supabase.table("party_going")
        .select("party_id")
        .eq("party_id", party_id)
        .eq("user_id", user["id"])
        .execute()
    )

    if not existing.data:
        try:
            supabase.table("party_going").insert({
                "party_id": party_id,
                "user_id": user["id"],
            }).execute()
        except Exception:
            # Race: another request inserted first — treat as already going
            pass

    return {"going": True, "goingCount": _read_going_count(party_id)}


@router.delete("/{party_id}/going")
@limiter.limit(RATE_LIMITS["toggle_going_auth"])
async def unmark_going(request: Request, party_id: str, user: dict = Depends(require_auth)):
    """
    Remove the current user from a party's going list (idempotent).
    going_count is maintained by the DB trigger from party_going rows.
    """
    party_result = (
        supabase.table("parties")
        .select("id")
        .eq("id", party_id)
        .execute()
    )

    if not party_result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    supabase.table("party_going").delete().eq("party_id", party_id).eq("user_id", user["id"]).execute()

    return {"going": False, "goingCount": _read_going_count(party_id)}


@router.post("/{party_id}/going/anonymous")
@limiter.limit(RATE_LIMITS["toggle_going_anon"])
async def increment_going_anonymous(request: Request, party_id: str):
    """
    Increment going count for anonymous users.
    Kept until Epic 10.2 cutover — conflicts with the going_count trigger on dev.
    """
    party_result = supabase.table("parties").select("going_count").eq("id", party_id).execute()

    if not party_result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    count_result = supabase.table("party_going").select("*", count="exact").eq("party_id", party_id).execute()
    tracked_count = count_result.count if count_result.count is not None else 0

    current_total = party_result.data[0]["going_count"]
    anonymous_count = max(0, current_total - tracked_count)
    new_count = tracked_count + anonymous_count + 1

    supabase.table("parties").update({"going_count": new_count}).eq("id", party_id).execute()

    return {"going": True, "goingCount": new_count}


@router.post("/{party_id}/going/anonymous/decrement")
@limiter.limit(RATE_LIMITS["toggle_going_anon"])
async def decrement_going_anonymous(request: Request, party_id: str):
    """
    Decrement going count for anonymous users.
    Kept until Epic 10.2 cutover — conflicts with the going_count trigger on dev.
    """
    party_result = supabase.table("parties").select("going_count").eq("id", party_id).execute()

    if not party_result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    count_result = supabase.table("party_going").select("*", count="exact").eq("party_id", party_id).execute()
    tracked_count = count_result.count if count_result.count is not None else 0

    current_total = party_result.data[0]["going_count"] or 0
    anonymous_count = max(0, current_total - tracked_count)
    if anonymous_count == 0:
        new_count = tracked_count
    else:
        new_count = tracked_count + anonymous_count - 1

    supabase.table("parties").update({"going_count": new_count}).eq("id", party_id).execute()

    return {"going": False, "goingCount": new_count}
