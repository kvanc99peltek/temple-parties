from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# Legacy class-standing values from the original onboarding. The field moved
# to graduation YEARS (owner call 2026-08-17) — see _validate_school_year in
# routers/profiles.py, which accepts a 4-digit year OR one of these so rows
# written before the switch keep saving without errors.
ALLOWED_SCHOOL_YEARS = (
    "freshman",
    "sophomore",
    "junior",
    "senior",
    "graduate",
)


class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr


class OtpVerify(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=8)


class UserUpdate(BaseModel):
    """Legacy set-username body — kept for type imports during transition."""
    username: str


class ProfileUpdate(BaseModel):
    """Partial profile update for onboarding / settings."""
    username: Optional[str] = None
    school_year: Optional[str] = None
    greek_life: Optional[str] = None
    instagram: Optional[str] = None
    avatar_url: Optional[str] = None


class User(UserBase):
    id: str
    is_admin: bool = False
    is_host: bool = False
    created_at: datetime
    school_year: Optional[str] = None
    greek_life: Optional[str] = None
    instagram: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True
