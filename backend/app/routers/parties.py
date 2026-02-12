from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional
from datetime import date, timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import supabase
from app.models.party import PartyCreate, PartyResponse
from app.routers.auth import get_current_user, require_auth
from app.services.geocoding import geocode_address, generate_fallback_coordinates
from app.constants import RATE_LIMITS

router = APIRouter(prefix="/parties", tags=["parties"])
limiter = Limiter(key_func=get_remote_address)


def get_current_weekend() -> date:
    """Get the Friday of the current or next weekend."""
    today = date.today()
    days_until_friday = (4 - today.weekday()) % 7
    if today.weekday() > 4:  # If Saturday or Sunday, use this weekend's Friday
        days_until_friday = (4 - today.weekday()) % 7 - 7
    return today + timedelta(days=days_until_friday)


def db_to_response(party: dict) -> PartyResponse:
    """Convert database party to API response format."""
    return PartyResponse(
        id=party["id"],
        title=party["title"],
        host=party["host"],
        pinLabel=party.get("pin_label", ""),
        category=party["category"],
        day=party["day"],
        date=party.get("date", ""),
        doorsOpen=party["doors_open"],
        address=party["address"],
        latitude=float(party["latitude"]),
        longitude=float(party["longitude"]),
        goingCount=party["going_count"],
        status=party.get("status")
    )


@router.get("", response_model=List[PartyResponse])
async def get_parties(
    day: Optional[str] = Query(None, description="Filter by day (friday/saturday)"),
    user: Optional[dict] = Depends(get_current_user)
):
    """
    Get all approved parties for the current weekend.
    """
    weekend = get_current_weekend()

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
            "weekend_of": weekend.isoformat()
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
