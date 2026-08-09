from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


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
    created_at: datetime
    school_year: Optional[str] = None
    greek_life: Optional[str] = None
    instagram: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True
