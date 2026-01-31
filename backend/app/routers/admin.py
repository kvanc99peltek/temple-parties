from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.database import supabase
from app.models.party import PartyResponse
from app.routers.auth import require_auth
from app.routers.parties import db_to_response

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin(user: dict = Depends(require_auth)) -> dict:
    """Require user to be an admin."""
    result = supabase.table("user_profiles").select("is_admin").eq("id", user["id"]).execute()

    if not result.data or not result.data[0].get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")

    return user


@router.get("/parties/pending", response_model=List[PartyResponse])
async def get_pending_parties(user: dict = Depends(require_admin)):
    """
    Get all pending parties awaiting approval.
    """
    result = supabase.table("parties").select("*").eq("status", "pending").order("created_at", desc=True).execute()

    return [db_to_response(party) for party in result.data]


@router.post("/parties/{party_id}/approve")
async def approve_party(party_id: str, user: dict = Depends(require_admin)):
    """
    Approve a pending party.
    """
    # Check if party exists
    result = supabase.table("parties").select("*").eq("id", party_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    party = result.data[0]

    if party["status"] != "pending":
        raise HTTPException(status_code=400, detail="Party is not pending")

    # Update status to approved
    supabase.table("parties").update({"status": "approved"}).eq("id", party_id).execute()

    return {"message": "Party approved", "party_id": party_id}


@router.post("/parties/{party_id}/reject")
async def reject_party(party_id: str, user: dict = Depends(require_admin)):
    """
    Reject a pending party.
    """
    # Check if party exists
    result = supabase.table("parties").select("*").eq("id", party_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Party not found")

    party = result.data[0]

    if party["status"] != "pending":
        raise HTTPException(status_code=400, detail="Party is not pending")

    # Update status to rejected
    supabase.table("parties").update({"status": "rejected"}).eq("id", party_id).execute()

    return {"message": "Party rejected", "party_id": party_id}
