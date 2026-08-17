from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import date as date_type


class PartyCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=50)
    host: str = Field(..., min_length=1, max_length=30)
    pin_label: str = Field(..., min_length=1, max_length=5)
    category: str = Field(..., min_length=1, max_length=50)
    date: str = Field(..., description="ISO format date (YYYY-MM-DD), must be a Friday or Saturday")
    doors_open: str = Field(..., min_length=1, max_length=20)
    address: str = Field(..., min_length=1, max_length=500)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    # Storage path only (e.g. "{user_id}/{uuid}.jpg") — arbitrary URLs rejected.
    poster_image: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None, max_length=1000)
    ticket_price: Optional[str] = Field(None, max_length=50)

    @field_validator('title', 'host', 'pin_label', 'category', 'doors_open', 'address')
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()

    @field_validator('description', 'ticket_price')
    @classmethod
    def strip_optional_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        stripped = v.strip()
        return stripped or None

    @field_validator('poster_image')
    @classmethod
    def reject_external_poster_urls(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        stripped = v.strip()
        if not stripped:
            return None
        lower = stripped.lower()
        if lower.startswith("http://") or lower.startswith("https://") or lower.startswith("//"):
            raise ValueError("poster_image must be a storage path, not a URL")
        if ".." in stripped or stripped.startswith("/"):
            raise ValueError("Invalid poster_image path")
        return stripped

    @field_validator('date')
    @classmethod
    def validate_date_is_friday_or_saturday(cls, v: str) -> str:
        try:
            parsed = date_type.fromisoformat(v)
        except ValueError:
            raise ValueError('Invalid date format. Use YYYY-MM-DD.')
        if parsed.weekday() not in (4, 5):  # 4 = Friday, 5 = Saturday
            raise ValueError('Date must be a Friday or Saturday.')
        return v


class PosterUploadResponse(BaseModel):
    path: str


class AddressSuggestion(BaseModel):
    display_name: str
    lat: float
    lon: float


class PartyResponse(BaseModel):
    id: str
    title: str
    host: str
    pinLabel: str  # camelCase for frontend compatibility
    category: str
    day: Literal["friday", "saturday"]
    date: str  # ISO format date string
    doorsOpen: str  # camelCase for frontend compatibility
    # Soft-gate (Epic 7.3): anon callers get null address + engagement counts
    address: Optional[str] = None
    latitude: float
    longitude: float
    goingCount: Optional[int] = None
    status: Optional[str] = None
    likePercentage: Optional[float] = None
    ratingCount: Optional[int] = None
    isVerified: bool = False
    posterImage: Optional[str] = None
    description: Optional[str] = None
    ticketPrice: Optional[str] = None
    ratingOpen: bool = False
    ratingLocked: bool = False

    class Config:
        from_attributes = True


class PartiesListResponse(BaseModel):
    """GET /parties envelope with authoritative weekend metadata."""

    weekendOf: str
    fridayDate: str
    saturdayDate: str
    parties: list[PartyResponse]


class WeekendOption(BaseModel):
    weekendOf: str
    fridayDate: str
    saturdayDate: str


class CreateWeekendOptionsResponse(BaseModel):
    """Weekends hosts may schedule onto (today onward — never a past weekend)."""

    today: str
    weekends: list[WeekendOption]


class AdminPartyResponse(PartyResponse):
    createdByUsername: Optional[str] = None
    createdByEmail: Optional[str] = None
    createdAt: Optional[str] = None


class AdminPartiesListResponse(BaseModel):
    """GET /admin/parties paginated envelope."""

    parties: list[AdminPartyResponse]
    total: int
    limit: int
    offset: int
