"""Shared admin lookup — used by require_admin and party visibility checks."""

from app.database import supabase


def user_is_admin(user_id: str) -> bool:
    """Return True if user_profiles.is_admin is set for this user."""
    result = (
        supabase.table("user_profiles")
        .select("is_admin")
        .eq("id", user_id)
        .execute()
    )
    if not result.data:
        return False
    return bool(result.data[0].get("is_admin", False))
