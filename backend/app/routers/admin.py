from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.database import supabase
from app.models.party import AdminPartyResponse
from app.routers.auth import require_auth
from app.routers.parties import db_to_response

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin(user: dict = Depends(require_auth)) -> dict:
    """Require user to be an admin."""
    result = supabase.table("user_profiles").select("is_admin").eq("id", user["id"]).execute()

    if not result.data or not result.data[0].get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")

    return user


@router.get("/parties", response_model=List[AdminPartyResponse])
async def get_all_parties(
    status: Optional[str] = Query(None, description="Filter by status: pending, approved, rejected"),
    user: dict = Depends(require_admin),
):
    """
    Get all parties with submitter info. Optionally filter by status.
    """
    query = supabase.table("parties").select("*, user_profiles!created_by(username, email)")

    if status:
        query = query.eq("status", status)

    result = query.order("created_at", desc=True).execute()

    parties = []
    for row in result.data:
        base = db_to_response(row)
        profile = row.get("user_profiles")
        parties.append(AdminPartyResponse(
            **base.model_dump(),
            createdByUsername=profile.get("username") if profile else None,
            createdByEmail=profile.get("email") if profile else None,
            createdAt=row.get("created_at"),
        ))

    return parties


@router.get("/parties/pending", response_model=List[AdminPartyResponse])
async def get_pending_parties(user: dict = Depends(require_admin)):
    """
    Get all pending parties awaiting approval (legacy endpoint).
    """
    result = supabase.table("parties").select("*, user_profiles!created_by(username, email)").eq("status", "pending").order("created_at", desc=True).execute()

    parties = []
    for row in result.data:
        base = db_to_response(row)
        profile = row.get("user_profiles")
        parties.append(AdminPartyResponse(
            **base.model_dump(),
            createdByUsername=profile.get("username") if profile else None,
            createdByEmail=profile.get("email") if profile else None,
            createdAt=row.get("created_at"),
        ))

    return parties


@router.post("/parties/{party_id}/approve")
async def approve_party(party_id: str, user: dict = Depends(require_admin)):
    """
    Approve a pending party.
    """
    result = supabase.table("parties").select("*").eq("id", party_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    party = result.data[0]

    if party["status"] != "pending":
        raise HTTPException(status_code=400, detail="Party is not pending")

    supabase.table("parties").update({"status": "approved"}).eq("id", party_id).execute()

    return {"message": "Party approved", "party_id": party_id}


@router.post("/parties/{party_id}/reject")
async def reject_party(party_id: str, user: dict = Depends(require_admin)):
    """
    Reject a pending party.
    """
    result = supabase.table("parties").select("*").eq("id", party_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    party = result.data[0]

    if party["status"] != "pending":
        raise HTTPException(status_code=400, detail="Party is not pending")

    supabase.table("parties").update({"status": "rejected"}).eq("id", party_id).execute()

    return {"message": "Party rejected", "party_id": party_id}
