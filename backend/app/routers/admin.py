from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import Optional
from slowapi import Limiter
from app.rate_limit import client_ip_key
from app.constants import RATE_LIMITS
from app.database import supabase
from app.models.party import (
    AdminPartyResponse,
    AdminPartiesListResponse,
    PartyCreate,
    PartyResponse,
)
from app.models.host import (
    AdminHostApplicationResponse,
    AdminHostApplicationsListResponse,
)
from app.routers.auth import require_auth
from app.routers.parties import db_to_response, insert_party
from app.routers.hosts import row_to_application
from app.services.admin_check import user_is_admin
from app.services import weekend as weekend_service

router = APIRouter(prefix="/admin", tags=["admin"])
limiter = Limiter(key_func=client_ip_key)


async def require_admin(user: dict = Depends(require_auth)) -> dict:
    """Require user to be an admin."""
    if not user_is_admin(user["id"]):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.post("/parties", response_model=PartyResponse)
@limiter.limit(RATE_LIMITS["admin_write"])
async def admin_create_party(
    request: Request,
    data: PartyCreate,
    user: dict = Depends(require_admin),
):
    """Manual upload — an admin posts on behalf of a host with no account.

    This is the one deliberate exception to the org-name stamp: the typed
    host name is kept verbatim (the org being posted for hasn't onboarded,
    so there's nothing to stamp), and the listing goes live immediately —
    the poster IS the approver, so a pending queue would be theater.
    Normal posting still goes through POST /parties and gets stamped.
    """
    return await insert_party(data, user["id"], host_name=data.host, status="approved")


def _row_to_admin_party(row: dict) -> AdminPartyResponse:
    base = db_to_response(row)
    profile = row.get("user_profiles")
    return AdminPartyResponse(
        **base.model_dump(),
        createdByUsername=profile.get("username") if profile else None,
        createdByEmail=profile.get("email") if profile else None,
        createdAt=row.get("created_at"),
    )


def _list_admin_parties(
    status: Optional[str],
    limit: int,
    offset: int,
) -> AdminPartiesListResponse:
    query = supabase.table("parties").select(
        "*, user_profiles!created_by(username, email)",
        count="exact",
    )

    if status:
        query = query.eq("status", status)

    result = (
        query.order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    parties = [_row_to_admin_party(row) for row in (result.data or [])]
    total = result.count if result.count is not None else len(parties)

    return AdminPartiesListResponse(
        parties=parties,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/parties", response_model=AdminPartiesListResponse)
@limiter.limit(RATE_LIMITS["admin_read"])
async def get_all_parties(
    request: Request,
    status: Optional[str] = Query(None, description="Filter by status: pending, approved, rejected"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_admin),
):
    """
    Get parties with submitter info. Optionally filter by status. Paginated.
    """
    return _list_admin_parties(status=status, limit=limit, offset=offset)


@router.get("/parties/pending", response_model=AdminPartiesListResponse)
@limiter.limit(RATE_LIMITS["admin_read"])
async def get_pending_parties(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_admin),
):
    """
    Get pending parties awaiting approval (legacy alias of ?status=pending).
    """
    return _list_admin_parties(status="pending", limit=limit, offset=offset)


@router.post("/parties/{party_id}/approve")
@limiter.limit(RATE_LIMITS["admin_write"])
async def approve_party(request: Request, party_id: str, user: dict = Depends(require_admin)):
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
@limiter.limit(RATE_LIMITS["admin_write"])
async def reject_party(request: Request, party_id: str, user: dict = Depends(require_admin)):
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


def _row_to_admin_host_app(row: dict) -> AdminHostApplicationResponse:
    base = row_to_application(row)
    profile = row.get("user_profiles") or {}
    return AdminHostApplicationResponse(
        **base.model_dump(),
        applicantUsername=profile.get("username"),
        applicantEmail=profile.get("email"),
    )


@router.get("/host-applications", response_model=AdminHostApplicationsListResponse)
@limiter.limit(RATE_LIMITS["admin_read"])
async def list_host_applications(
    request: Request,
    status: Optional[str] = Query(None, description="pending, approved, rejected"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_admin),
):
    query = supabase.table("host_applications").select(
        "*, user_profiles!user_id(username, email)",
        count="exact",
    )
    if status:
        query = query.eq("status", status)

    result = (
        query.order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    applications = [_row_to_admin_host_app(row) for row in (result.data or [])]
    total = result.count if result.count is not None else len(applications)
    return AdminHostApplicationsListResponse(
        applications=applications,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/host-applications/{application_id}/approve")
@limiter.limit(RATE_LIMITS["admin_write"])
async def approve_host_application(
    request: Request,
    application_id: str,
    user: dict = Depends(require_admin),
):
    result = (
        supabase.table("host_applications").select("*").eq("id", application_id).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    application = result.data[0]
    if application["status"] != "pending":
        raise HTTPException(status_code=400, detail="Application is not pending")

    now = weekend_service.now_eastern().isoformat()
    supabase.table("host_applications").update(
        {
            "status": "approved",
            "reviewed_at": now,
            "reviewed_by": user["id"],
        }
    ).eq("id", application_id).execute()
    supabase.table("user_profiles").update({"is_host": True}).eq(
        "id", application["user_id"]
    ).execute()

    return {"message": "Host approved", "application_id": application_id}


@router.post("/host-applications/{application_id}/reject")
@limiter.limit(RATE_LIMITS["admin_write"])
async def reject_host_application(
    request: Request,
    application_id: str,
    user: dict = Depends(require_admin),
):
    result = (
        supabase.table("host_applications").select("*").eq("id", application_id).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    application = result.data[0]
    if application["status"] != "pending":
        raise HTTPException(status_code=400, detail="Application is not pending")

    now = weekend_service.now_eastern().isoformat()
    supabase.table("host_applications").update(
        {
            "status": "rejected",
            "reviewed_at": now,
            "reviewed_by": user["id"],
        }
    ).eq("id", application_id).execute()

    return {"message": "Host application rejected", "application_id": application_id}
