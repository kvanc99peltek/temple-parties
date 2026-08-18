import asyncio
import logging
import re
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from typing import Optional
from slowapi import Limiter
from app.rate_limit import client_ip_key
from supabase_auth.errors import AuthApiError
from app.database import supabase
from app.models.user import UserCreate, OtpVerify
from app.constants import ALLOWED_EMAIL_TLD, RATE_LIMITS
from app.services.email_rate_limit import EmailRateLimiter

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=client_ip_key)
logger = logging.getLogger(__name__)

# Per-email caps (slowapi covers per-IP). Windows match RATE_LIMITS comments.
_otp_request_by_email = EmailRateLimiter(max_calls=5, window_seconds=60)
_otp_verify_by_email = EmailRateLimiter(max_calls=10, window_seconds=60)

_OTP_CODE_RE = re.compile(r"^\d{6}$")


# The domain part of an allowed email: letters/digits/dots/dashes ending in
# .edu — e.g. "temple.edu", "sas.upenn.edu". Anchored so "temple.edu.evil.com"
# (extra labels AFTER .edu) can't pass.
_EDU_DOMAIN_RE = re.compile(r"^[a-z0-9.-]+\.edu$")


def _normalize_edu_email(email: str) -> str:
    """Lowercase the email and require a college (.edu) domain — any school.

    We validate the domain part (everything after the last '@') rather than
    just the string's ending, so only the actual mail domain is judged.
    Pydantic's EmailStr already rejected malformed addresses before the
    router runs; this is purely the "students only" gate.
    """
    normalized = email.strip().lower()
    local_part, at, domain = normalized.rpartition("@")
    if not at or not local_part or not _EDU_DOMAIN_RE.fullmatch(domain):
        raise HTTPException(
            status_code=400,
            detail=f"Only college ({ALLOWED_EMAIL_TLD}) email addresses are allowed",
        )
    return normalized


class AuthServiceUnavailable(Exception):
    """We couldn't ASK Supabase about a token (network trouble, Supabase
    outage) — deliberately distinct from "Supabase said the token is bad".
    Callers turn this into a 503 so the app knows to retry, never into a
    401 that would log a real user out. (During the 2026-08-18 incident,
    infra failures surfacing as auth failures sent onboarded users back
    through onboarding five times in a row.)"""


async def _verify_token(token: str) -> Optional[dict]:
    """Ask Supabase who this JWT belongs to.

    Returns the user dict, or None when Supabase examined the token and
    rejected it (expired, forged, revoked). Raises AuthServiceUnavailable
    when Supabase couldn't be reached or answered with a server error —
    in that case we simply don't know, and must not pretend we do.
    """
    try:
        # Run in a thread so the sync Supabase client doesn't block the event loop.
        user_response = await asyncio.to_thread(supabase.auth.get_user, token)
    except AuthApiError as e:
        # Supabase answered. A 5xx body is still "service trouble", so only
        # sub-500 statuses count as a genuine rejection of the token.
        if (getattr(e, "status", None) or 0) >= 500:
            logger.warning("Supabase auth 5xx during token check: %s", e)
            raise AuthServiceUnavailable() from e
        logger.info("Token rejected by Supabase: %s", e)
        return None
    except Exception as e:
        # Network blip, timeout, library error — verification never happened.
        logger.warning(
            "Token check unavailable: %s: %s", type(e).__name__, e, exc_info=True
        )
        raise AuthServiceUnavailable() from e

    if user_response and user_response.user:
        return {
            "id": user_response.user.id,
            "email": user_response.user.email
        }
    return None


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Optional auth: anonymous callers get None, valid tokens get the user.
    If the auth service is unreachable, public reads degrade to the anonymous
    (soft-gated) view instead of erroring the whole page."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    try:
        return await _verify_token(token)
    except AuthServiceUnavailable:
        return None


async def require_auth(authorization: Optional[str] = Header(None)) -> dict:
    """Require an authenticated user.

    Status codes carry meaning the frontend relies on:
    - 401 = the token itself is bad → the client may treat the session as dead.
    - 503 = we couldn't check right now → the client should retry, NOT sign out.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    try:
        user = await _verify_token(token)
    except AuthServiceUnavailable:
        raise HTTPException(
            status_code=503,
            detail="Sign-in check is temporarily unavailable — try again in a moment.",
        )
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
    Request a 6-digit email OTP for college (.edu) signup/login.
    Rate limited per IP (slowapi) and per email (in-process).
    """
    email = _normalize_edu_email(data.email)
    return await _request_otp(email)


@router.post("/otp/verify")
@limiter.limit(RATE_LIMITS["otp_verify"])
async def verify_otp(request: Request, data: OtpVerify):
    """
    Verify a 6-digit email OTP and return a Supabase session JWT.
    Profile row is created by the auth.users INSERT trigger (Epic 3.4).
    """
    email = _normalize_edu_email(data.email)
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
    email = _normalize_edu_email(data.email)
    return await _request_otp(email)
