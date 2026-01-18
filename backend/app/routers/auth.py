from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from app.database import supabase
from app.models.user import UserCreate, UserUpdate, User

router = APIRouter(prefix="/auth", tags=["auth"])


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Extract and verify user from Supabase JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "")

    try:
        # Verify the JWT with Supabase
        user_response = supabase.auth.get_user(token)
        if user_response and user_response.user:
            return {
                "id": user_response.user.id,
                "email": user_response.user.email
            }
    except Exception:
        pass

    return None


async def require_auth(authorization: Optional[str] = Header(None)) -> dict:
    """Require authenticated user."""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/signup")
async def signup(data: UserCreate):
    """
    Initiate signup by sending magic link to @temple.edu email.
    """
    email = data.email.lower()

    # Validate Temple email
    if not email.endswith("@temple.edu"):
        raise HTTPException(
            status_code=400,
            detail="Only @temple.edu email addresses are allowed"
        )

    try:
        # Send magic link via Supabase Auth
        response = supabase.auth.sign_in_with_otp({
            "email": email,
            "options": {
                "should_create_user": True
            }
        })

        return {"message": "Magic link sent to your email"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/set-username")
async def set_username(data: UserUpdate, user: dict = Depends(require_auth)):
    """
    Set username after magic link verification.
    Creates or updates user in our user_profiles table.
    """
    if len(data.username) < 2:
        raise HTTPException(
            status_code=400,
            detail="Username must be at least 2 characters"
        )

    try:
        # Check if user profile exists
        existing = supabase.table("user_profiles").select("*").eq("id", user["id"]).execute()

        if existing.data:
            # Update existing profile
            result = supabase.table("user_profiles").update({
                "username": data.username
            }).eq("id", user["id"]).execute()
        else:
            # Create new profile
            result = supabase.table("user_profiles").insert({
                "id": user["id"],
                "username": data.username,
                "is_admin": False
            }).execute()

        return {"message": "Username set successfully", "username": data.username}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=Optional[User])
async def get_me(user: dict = Depends(require_auth)):
    """
    Get current user info from our user_profiles table.
    """
    try:
        result = supabase.table("user_profiles").select("*").eq("id", user["id"]).execute()

        if not result.data:
            # User exists in Supabase Auth but not in our profiles table yet
            return None

        profile = result.data[0]
        return User(
            id=profile["id"],
            email=user["email"],  # Email comes from auth token
            username=profile.get("username"),
            is_admin=profile.get("is_admin", False),
            created_at=profile["created_at"]
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
