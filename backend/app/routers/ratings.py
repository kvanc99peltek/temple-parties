from fastapi import APIRouter, HTTPException, Request, Query
from typing import List, Optional
from datetime import date, datetime, timedelta
import hashlib
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import supabase
from app.models.rating import RatingCreate, RatingResponse, PartyRankingResponse, HostRankingResponse
from app.routers.parties import get_current_weekend, EASTERN
from app.constants import RATE_LIMITS

router = APIRouter(prefix="/ratings", tags=["ratings"])
limiter = Limiter(key_func=get_remote_address)


def hash_ip(ip: str) -> str:
    """Hash IP address for privacy-safe storage."""
    return hashlib.sha256(ip.encode()).hexdigest()


def parse_doors_open(doors_open: str, party_date: str) -> datetime:
    """
    Parse doors_open string (e.g., '10 PM', '9:30 PM') combined with party date
    into a timezone-aware datetime object in Eastern time.
    """
    party_dt = date.fromisoformat(party_date)
    time_str = doors_open.strip().upper()
    for fmt in ("%I %p", "%I:%M %p", "%I%p", "%I:%M%p"):
        try:
            parsed_time = datetime.strptime(time_str, fmt).time()
            return datetime.combine(party_dt, parsed_time, tzinfo=EASTERN)
        except ValueError:
            continue
    # Fallback: assume 10 PM if parsing fails
    return datetime.combine(party_dt, datetime.strptime("10 PM", "%I %p").time(), tzinfo=EASTERN)


def get_monday_cutoff(weekend_of: str) -> datetime:
    """
    Given weekend_of (the Friday date), return Monday 11:59 PM Eastern.
    Friday + 3 days = Monday.
    """
    friday = date.fromisoformat(weekend_of)
    monday = friday + timedelta(days=3)
    return datetime.combine(monday, datetime.max.time(), tzinfo=EASTERN)


def get_party_date(party: dict) -> str:
    """Get party date, computing from weekend_of + day if date column is empty."""
    party_date = party.get("date") or ""
    if not party_date and party.get("weekend_of") and party.get("day"):
        if party["day"] == "saturday":
            friday = date.fromisoformat(party["weekend_of"])
            party_date = (friday + timedelta(days=1)).isoformat()
        else:
            party_date = party["weekend_of"]
    return party_date


def is_rating_active(party: dict) -> bool:
    """Check if rating is currently active (after doors_open time)."""
    now = datetime.now(EASTERN)
    party_date = get_party_date(party)
    if not party_date:
        return False
    doors_open_dt = parse_doors_open(party["doors_open"], party_date)
    return now >= doors_open_dt


def is_rating_locked(party: dict) -> bool:
    """Check if rating is locked (after Monday 11:59 PM)."""
    now = datetime.now(EASTERN)
    weekend_of = party.get("weekend_of", "")
    if not weekend_of:
        return False
    cutoff = get_monday_cutoff(weekend_of)
    return now > cutoff


@router.post("/{party_id}", response_model=RatingResponse)
@limiter.limit(RATE_LIMITS["submit_rating"])
async def submit_rating(request: Request, party_id: str, data: RatingCreate):
    """
    Submit or update a rating for a party.
    Anonymous - uses IP hash for one-per-user tracking.
    Only allowed after doors_open and before Monday cutoff.
    """
    # Check if party exists
    party_result = supabase.table("parties").select("*").eq("id", party_id).execute()
    if not party_result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    party = party_result.data[0]

    # Check if rating is active (after doors_open)
    if not is_rating_active(party):
        raise HTTPException(status_code=403, detail="Rating not yet active. Opens at doors open time.")

    # Check if rating is locked (after Monday)
    if is_rating_locked(party):
        raise HTTPException(status_code=403, detail="Rating period has ended.")

    # Get IP hash
    client_ip = get_remote_address(request)
    ip = hash_ip(client_ip)

    # Upsert rating (insert or update if exists)
    existing = supabase.table("party_ratings").select("id").eq("party_id", party_id).eq("ip_hash", ip).execute()

    if existing.data:
        supabase.table("party_ratings").update({
            "rating": data.rating,
            "updated_at": datetime.now().isoformat()
        }).eq("party_id", party_id).eq("ip_hash", ip).execute()
    else:
        supabase.table("party_ratings").insert({
            "party_id": party_id,
            "ip_hash": ip,
            "rating": data.rating,
        }).execute()

    # Recompute like percentage and count from source of truth
    all_ratings = supabase.table("party_ratings").select("rating").eq("party_id", party_id).execute()
    ratings = [r["rating"] for r in all_ratings.data]
    count = len(ratings)
    like_pct = round((sum(ratings) / count) * 100, 2) if count else 0

    # Update denormalized columns on parties table
    supabase.table("parties").update({
        "like_percentage": like_pct,
        "rating_count": count,
    }).eq("id", party_id).execute()

    return RatingResponse(
        partyId=party_id,
        rating=data.rating,
        likePercentage=like_pct,
        ratingCount=count,
    )


@router.get("/hosts", response_model=List[HostRankingResponse])
async def get_host_rankings(request: Request):
    """
    Get hosts ranked by rating-count-weighted average like percentage.
    Aggregates across all approved parties; co-hosts (multiple entries in
    parties.host_codes) each receive full credit for the party's ratings.
    """
    result = supabase.rpc("get_host_rankings").execute()
    rows = result.data or []
    return [
        HostRankingResponse(
            hostCode=row["host_code"],
            displayName=row["display_name"],
            logoUrl=row.get("logo_url"),
            partiesHosted=row.get("parties_hosted") or 0,
            totalRatingCount=row.get("total_rating_count") or 0,
            totalGoingCount=row.get("total_going_count") or 0,
            avgLikePercentage=float(row.get("avg_like_percentage") or 0),
            bayesianScore=float(row.get("bayesian_score") or 0),
            finalScore=float(row.get("final_score") or 0),
            isEligible=bool(row.get("is_eligible")),
        )
        for row in rows
    ]


@router.get("/{party_id}")
async def get_party_rating(request: Request, party_id: str):
    """
    Get rating info for a single party, including the current user's rating.
    """
    party_result = supabase.table("parties").select("like_percentage, rating_count").eq("id", party_id).execute()
    if not party_result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    party = party_result.data[0]
    client_ip = get_remote_address(request)
    ip = hash_ip(client_ip)

    user_rating_result = supabase.table("party_ratings").select("rating").eq("party_id", party_id).eq("ip_hash", ip).execute()
    user_rating = user_rating_result.data[0]["rating"] if user_rating_result.data else None

    return {
        "partyId": party_id,
        "likePercentage": float(party.get("like_percentage") or 0),
        "ratingCount": party.get("rating_count") or 0,
        "userRating": user_rating,
    }


@router.get("", response_model=List[PartyRankingResponse])
async def get_rankings(
    request: Request,
    weekend_of: Optional[str] = Query(None, description="Single Friday date (YYYY-MM-DD)"),
    weekend_from: Optional[str] = Query(None, description="Range start Friday date (YYYY-MM-DD)"),
    weekend_to: Optional[str] = Query(None, description="Range end Friday date (YYYY-MM-DD)")
):
    """
    Get all parties ranked by like percentage.
    Supports single weekend (weekend_of) or date range (weekend_from + weekend_to).
    Includes the requesting user's rating per party (by IP).
    """
    query = supabase.table("parties").select("*").eq("status", "approved")

    if weekend_from and weekend_to:
        query = query.gte("weekend_of", weekend_from).lte("weekend_of", weekend_to)
    elif weekend_of:
        query = query.eq("weekend_of", weekend_of)
    else:
        weekend = get_current_weekend()
        query = query.eq("weekend_of", weekend.isoformat())

    result = query.order("like_percentage", desc=True).order("rating_count", desc=True).execute()

    # Get user's ratings
    client_ip = get_remote_address(request)
    ip = hash_ip(client_ip)
    user_ratings_result = supabase.table("party_ratings").select("party_id, rating").eq("ip_hash", ip).execute()
    user_ratings_map = {r["party_id"]: r["rating"] for r in user_ratings_result.data}

    rankings = []
    for party in result.data:
        rankings.append(PartyRankingResponse(
            id=party["id"],
            title=party["title"],
            host=party["host"],
            category=party["category"],
            day=party["day"],
            date=get_party_date(party),
            doorsOpen=party["doors_open"],
            likePercentage=float(party.get("like_percentage") or 0),
            ratingCount=party.get("rating_count") or 0,
            goingCount=party.get("going_count") or 0,
            userRating=user_ratings_map.get(party["id"]),
        ))

    return rankings
