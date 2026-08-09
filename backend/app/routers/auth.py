import asyncio
import logging
import re
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import supabase
from app.models.user import UserCreate, OtpVerify
from app.constants import ALLOWED_EMAIL_DOMAIN, RATE_LIMITS
from app.services.email_rate_limit import EmailRateLimiter

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

# Per-email caps (slowapi covers per-IP). Windows match RATE_LIMITS comments.
_otp_request_by_email = EmailRateLimiter(max_calls=5, window_seconds=60)
_otp_verify_by_email = EmailRateLimiter(max_calls=10, window_seconds=60)

_OTP_CODE_RE = re.compile(r"^\d{6}$")


def _normalize_temple_email(email: str) -> str:
    normalized = email.strip().lower()
    if not normalized.endswith(ALLOWED_EMAIL_DOMAIN):
        raise HTTPException(
            status_code=400,
            detail="Only @temple.edu email addresses are allowed",
        )
    return normalized


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Extract and verify user from Supabase JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "")

    try:
        # Verify the JWT with Supabase (run in thread to avoid blocking event loop)
        user_response = await asyncio.to_thread(supabase.auth.get_user, token)
        if user_response and user_response.user:
            return {
                "id": user_response.user.id,
                "email": user_response.user.email
            }
    except Exception as e:
        logger.warning(
            "Supabase token verification failed: %s: %s",
            type(e).__name__,
            str(e),
            exc_info=True,
        )

    return None


async def require_auth(authorization: Optional[str] = Header(None)) -> dict:
    """Require authenticated user."""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def _request_otp(email: str) -> dict:
    """Send a 6-digit email OTP via Supabase Auth (no magic-link redirect)."""
    if not _otp_request_by_email.allow(email):
        raise HTTPException(
            status_code=429,
            detail="Too many code requests for this email. Try again shortly.",
        )

    try:
        await asyncio.to_thread(
            supabase.auth.sign_in_with_otp,
            {
                "email": email,
                "options": {
                    "should_create_user": True,
                    # No emailRedirectTo — OTP code flow, not magic link.
                },
            },
        )
        return {"message": "Verification code sent to your email"}
    except Exception as e:
        logger.warning("OTP request failed for %s: %s", email, type(e).__name__)
        raise HTTPException(status_code=400, detail="Failed to send verification code") from e


@router.post("/otp/request")
@limiter.limit(RATE_LIMITS["otp_request"])
async def request_otp(request: Request, data: UserCreate):
    """
    Request a 6-digit email OTP for @temple.edu signup/login.
    Rate limited per IP (slowapi) and per email (in-process).
    """
    email = _normalize_temple_email(data.email)
    return await _request_otp(email)


@router.post("/otp/verify")
@limiter.limit(RATE_LIMITS["otp_verify"])
async def verify_otp(request: Request, data: OtpVerify):
    """
    Verify a 6-digit email OTP and return a Supabase session JWT.
    Profile row is created by the auth.users INSERT trigger (Epic 3.4).
    """
    email = _normalize_temple_email(data.email)
    code = data.code.strip()

    if not _OTP_CODE_RE.match(code):
        raise HTTPException(status_code=400, detail="Code must be a 6-digit number")

    if not _otp_verify_by_email.allow(email):
        raise HTTPException(
            status_code=429,
            detail="Too many verification attempts for this email. Try again shortly.",
        )

    try:
        response = await asyncio.to_thread(
            supabase.auth.verify_otp,
            {
                "email": email,
                "token": code,
                "type": "email",
            },
        )
    except Exception as e:
        logger.warning("OTP verify failed for %s: %s", email, type(e).__name__)
        raise HTTPException(status_code=400, detail="Invalid or expired code") from e

    session = getattr(response, "session", None)
    user = getattr(response, "user", None)
    if not session or not getattr(session, "access_token", None):
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_in": getattr(session, "expires_in", None),
        "token_type": getattr(session, "token_type", "bearer") or "bearer",
        "user": {
            "id": user.id if user else None,
            "email": user.email if user else email,
        },
    }


@router.post("/signup")
@limiter.limit(RATE_LIMITS["otp_request"])
async def signup(request: Request, data: UserCreate):
    """
    Backward-compatible alias for POST /auth/otp/request.
    Prefer /auth/otp/request — this path remains for older clients/tests.
    """
    email = _normalize_temple_email(data.email)
    return await _request_otp(email)
