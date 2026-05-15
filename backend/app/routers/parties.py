from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import supabase
from app.models.party import PartyCreate, PartyResponse
from app.routers.auth import get_current_user, require_auth
from app.services.geocoding import geocode_address, generate_fallback_coordinates
from app.constants import RATE_LIMITS

router = APIRouter(prefix="/parties", tags=["parties"])
limiter = Limiter(key_func=get_remote_address)

EASTERN = ZoneInfo("America/New_York")


def today_eastern() -> date:
    """Get today's date in US/Eastern timezone."""
    return datetime.now(EASTERN).date()


def get_current_weekend() -> date:
    """Get the Friday of the current or next weekend.
    Sat/Sun/Mon -> this past Friday. Tue-Fri -> upcoming Friday."""
    today = today_eastern()
    if today.weekday() in (5, 6):  # Sat, Sun
        days_until_friday = (4 - today.weekday()) % 7 - 7
    elif today.weekday() == 0:  # Mon -> past Friday (rollover at Tuesday 00:00)
        days_until_friday = -3
    else:  # Tue-Fri
        days_until_friday = (4 - today.weekday()) % 7
    return today + timedelta(days=days_until_friday)


def db_to_response(party: dict) -> PartyResponse:
    """Convert database party to API response format."""
    # Compute date from weekend_of + day if date column is empty
    party_date = party.get("date") or ""
    if not party_date and party.get("weekend_of") and party.get("day"):
        weekend_of_str = party["weekend_of"]
        if party["day"] == "saturday":
            friday = date.fromisoformat(weekend_of_str)
            party_date = (friday + timedelta(days=1)).isoformat()
        else:
            party_date = weekend_of_str

    return PartyResponse(
        id=party["id"],
        title=party["title"],
        host=party["host"],
        pinLabel=party.get("pin_label", ""),
        category=party["category"],
        day=party["day"],
        date=party_date,
        doorsOpen=party["doors_open"],
        address=party["address"],
        latitude=float(party["latitude"]),
        longitude=float(party["longitude"]),
        goingCount=party["going_count"],
        status=party.get("status"),
        likePercentage=float(party.get("like_percentage") or 0),
        ratingCount=party.get("rating_count") or 0,
        isVerified=party.get("is_verified", False),
        posterImage=party.get("poster_image"),
    )


@router.get("", response_model=List[PartyResponse])
async def get_parties(
    day: Optional[str] = Query(None, description="Filter by day (friday/saturday)"),
    weekend_of: Optional[str] = Query(None, description="Friday date (YYYY-MM-DD) of the weekend to query"),
    user: Optional[dict] = Depends(get_current_user)
):
    """
    Get all approved parties for the current weekend.
    """
    weekend = date.fromisoformat(weekend_of) if weekend_of else get_current_weekend()

    query = supabase.table("parties").select("*").eq("status", "approved").eq("weekend_of", weekend.isoformat())

    if day:
        query = query.eq("day", day)

    result = query.order("going_count", desc=True).execute()

    return [db_to_response(party) for party in result.data]


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
    now = datetime.now(EASTERN)
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


@router.get("/{party_id}", response_model=PartyResponse)
async def get_party(party_id: str):
    """
    Get a single party by ID.
    """
    result = supabase.table("parties").select("*").eq("id", party_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    return db_to_response(result.data[0])


@router.post("", response_model=PartyResponse)
@limiter.limit(RATE_LIMITS["create_party"])
async def create_party(request: Request, data: PartyCreate, user: dict = Depends(require_auth)):
    """
    Create a new party. Status will be 'pending' until admin approves.
    Rate limited to 10 requests per minute per IP.
    Field validation (length limits, coordinate ranges) handled by Pydantic model.
    """
    # Determine coordinates: use provided, geocode from address, or fallback to random
    lat, lng = data.latitude, data.longitude
    if lat is None or lng is None:
        geocoded = geocode_address(data.address)
        if geocoded is not None:
            lat, lng = geocoded
        else:
            lat, lng = generate_fallback_coordinates()

    # Derive day and weekend_of from the submitted date
    party_date = date.fromisoformat(data.date)
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
        }

        result = supabase.table("parties").insert(party_data).execute()

        return db_to_response(result.data[0])

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{party_id}")
async def delete_party(party_id: str, user: dict = Depends(require_auth)):
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
async def toggle_going(request: Request, party_id: str, user: dict = Depends(require_auth)):
    """
    Toggle going status for a party.
    If user is going, removes them and decrements count.
    If user is not going, adds them and increments count.
    Rate limited to 30 requests per minute per IP.
    Uses count from party_going table to avoid race conditions.
    """
    # Check if party exists
    party_result = supabase.table("parties").select("id").eq("id", party_id).execute()

    if not party_result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    # Check if user is already going
    going_result = supabase.table("party_going").select("*").eq("party_id", party_id).eq("user_id", user["id"]).execute()

    is_currently_going = len(going_result.data) > 0

    if is_currently_going:
        # Remove from going
        supabase.table("party_going").delete().eq("party_id", party_id).eq("user_id", user["id"]).execute()
    else:
        # Add to going
        try:
            supabase.table("party_going").insert({
                "party_id": party_id,
                "user_id": user["id"]
            }).execute()
        except Exception:
            # Record may already exist due to race condition, ignore
            pass

    # Compute going count from the actual party_going table (source of truth)
    # This avoids race conditions by counting actual records instead of incrementing
    count_result = supabase.table("party_going").select("*", count="exact").eq("party_id", party_id).execute()
    new_count = count_result.count if count_result.count is not None else 0

    # Update the denormalized count for display/sorting purposes
    supabase.table("parties").update({"going_count": new_count}).eq("id", party_id).execute()

    return {"going": not is_currently_going, "goingCount": new_count}


@router.post("/{party_id}/going/anonymous")
@limiter.limit(RATE_LIMITS["toggle_going_anon"])
async def increment_going_anonymous(request: Request, party_id: str):
    """
    Increment going count for anonymous users.
    No user tracking - just increments the count.
    Rate limited to 3 requests per minute per IP to prevent abuse.
    """
    # Check if party exists
    party_result = supabase.table("parties").select("going_count").eq("id", party_id).execute()

    if not party_result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    # Get current count from party_going table and add 1 for this anonymous increment
    count_result = supabase.table("party_going").select("*", count="exact").eq("party_id", party_id).execute()
    tracked_count = count_result.count if count_result.count is not None else 0

    # Anonymous increments are stored in going_count beyond the tracked count
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
    No user tracking - decrements only the anonymous portion of going_count.
    Rate limited to 3 requests per minute per IP to prevent abuse.
    """
    # Check if party exists
    party_result = supabase.table("parties").select("going_count").eq("id", party_id).execute()

    if not party_result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    # tracked_count is source of truth for authenticated going
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
