from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import date, timedelta
from app.database import supabase
from app.models.party import PartyCreate, PartyResponse
from app.routers.auth import get_current_user, require_auth
import random

router = APIRouter(prefix="/parties", tags=["parties"])

# Temple University area bounds for random coordinate generation
TEMPLE_BOUNDS = {
    "min_lat": 39.978,
    "max_lat": 39.985,
    "min_lng": -75.162,
    "max_lng": -75.148,
}


def get_current_weekend() -> date:
    """Get the Friday of the current or next weekend."""
    today = date.today()
    days_until_friday = (4 - today.weekday()) % 7
    if today.weekday() > 4:  # If Saturday or Sunday, use this weekend's Friday
        days_until_friday = (4 - today.weekday()) % 7 - 7
    return today + timedelta(days=days_until_friday)


def generate_coordinates() -> tuple[float, float]:
    """Generate random coordinates within Temple area."""
    lat = random.uniform(TEMPLE_BOUNDS["min_lat"], TEMPLE_BOUNDS["max_lat"])
    lng = random.uniform(TEMPLE_BOUNDS["min_lng"], TEMPLE_BOUNDS["max_lng"])
    return round(lat, 8), round(lng, 8)


def db_to_response(party: dict) -> PartyResponse:
    """Convert database party to API response format."""
    return PartyResponse(
        id=party["id"],
        title=party["title"],
        host=party["host"],
        category=party["category"],
        day=party["day"],
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
async def create_party(data: PartyCreate, user: dict = Depends(require_auth)):
    """
    Create a new party. Status will be 'pending' until admin approves.
    """
    # Validate title and host length
    if len(data.title) > 50:
        raise HTTPException(status_code=400, detail="Title must be 50 characters or less")
    if len(data.host) > 30:
        raise HTTPException(status_code=400, detail="Host must be 30 characters or less")

    # Generate coordinates if not provided
    lat, lng = data.latitude, data.longitude
    if lat is None or lng is None:
        lat, lng = generate_coordinates()

    weekend = get_current_weekend()

    try:
        party_data = {
            "title": data.title,
            "host": data.host,
            "category": data.category,
            "day": data.day,
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
async def toggle_going(party_id: str, user: dict = Depends(require_auth)):
    """
    Toggle going status for a party.
    If user is going, removes them and decrements count.
    If user is not going, adds them and increments count.
    """
    # Check if party exists
    party_result = supabase.table("parties").select("*").eq("id", party_id).execute()

    if not party_result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    party = party_result.data[0]

    # Check if user is already going
    going_result = supabase.table("party_going").select("*").eq("party_id", party_id).eq("user_id", user["id"]).execute()

    is_currently_going = len(going_result.data) > 0

    if is_currently_going:
        # Remove from going and decrement count
        supabase.table("party_going").delete().eq("party_id", party_id).eq("user_id", user["id"]).execute()

        new_count = max(0, party["going_count"] - 1)
        supabase.table("parties").update({"going_count": new_count}).eq("id", party_id).execute()

        return {"going": False, "goingCount": new_count}
    else:
        # Add to going and increment count
        supabase.table("party_going").insert({
            "party_id": party_id,
            "user_id": user["id"]
        }).execute()

        new_count = party["going_count"] + 1
        supabase.table("parties").update({"going_count": new_count}).eq("id", party_id).execute()

        return {"going": True, "goingCount": new_count}
