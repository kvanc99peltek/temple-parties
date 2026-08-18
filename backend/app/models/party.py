from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Literal
from datetime import date as date_type
from urllib.parse import urlparse
import re


_PROMO_CODE_RE = re.compile(r"^[A-Za-z0-9]{2,24}$")


def _strip_optional(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    stripped = v.strip()
    return stripped or None


def _validate_friday_or_saturday(v: str) -> str:
    try:
        parsed = date_type.fromisoformat(v)
    except ValueError:
        raise ValueError("Invalid date format. Use YYYY-MM-DD.")
    if parsed.weekday() not in (4, 5):  # 4 = Friday, 5 = Saturday
        raise ValueError("Date must be a Friday or Saturday.")
    return v


def _validate_poster_image(v: Optional[str]) -> Optional[str]:
    stripped = _strip_optional(v)
    if stripped is None:
        return None
    lower = stripped.lower()
    if lower.startswith("http://") or lower.startswith("https://") or lower.startswith("//"):
        raise ValueError("poster_image must be a storage path, not a URL")
    if ".." in stripped or stripped.startswith("/"):
        raise ValueError("Invalid poster_image path")
    return stripped


def _validate_ticket_url(v: Optional[str]) -> Optional[str]:
    stripped = _strip_optional(v)
    if stripped is None:
        return None
    lower = stripped.lower()
    if lower.startswith("javascript:") or lower.startswith("data:") or lower.startswith("//"):
        raise ValueError("external_ticket_url must be an https URL")
    parsed = urlparse(stripped)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("external_ticket_url must be an https URL")
    return stripped


def _validate_promo_code(v: Optional[str]) -> Optional[str]:
    stripped = _strip_optional(v)
    if stripped is None:
        return None
    if not _PROMO_CODE_RE.match(stripped):
        raise ValueError("promo_code must be 2–24 alphanumeric characters")
    return stripped.upper()


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
    doors_close: Optional[str] = Field(None, max_length=20)
    external_ticket_url: Optional[str] = Field(None, max_length=500)
    promo_code: Optional[str] = Field(None, max_length=24)
    promo_label: Optional[str] = Field(None, max_length=40)
    promo_hint: Optional[str] = Field(None, max_length=200)

    @field_validator("title", "host", "pin_label", "category", "doors_open", "address")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()

    @field_validator("description", "ticket_price", "doors_close", "promo_label", "promo_hint")
    @classmethod
    def strip_optional_text(cls, v: Optional[str]) -> Optional[str]:
        return _strip_optional(v)

    @field_validator("poster_image")
    @classmethod
    def reject_external_poster_urls(cls, v: Optional[str]) -> Optional[str]:
        return _validate_poster_image(v)

    @field_validator("external_ticket_url")
    @classmethod
    def https_ticket_url(cls, v: Optional[str]) -> Optional[str]:
        return _validate_ticket_url(v)

    @field_validator("promo_code")
    @classmethod
    def normalize_promo_code(cls, v: Optional[str]) -> Optional[str]:
        return _validate_promo_code(v)

    @field_validator("date")
    @classmethod
    def validate_date_is_friday_or_saturday(cls, v: str) -> str:
        return _validate_friday_or_saturday(v)

    @model_validator(mode="after")
    def promo_label_required_with_code(self):
        if self.promo_code and not self.promo_label:
            raise ValueError("promo_label is required when promo_code is set")
        return self


class PartyUpdate(BaseModel):
    """Partial update — omitted fields are left unchanged."""

    title: Optional[str] = Field(None, min_length=1, max_length=50)
    host: Optional[str] = Field(None, min_length=1, max_length=30)
    pin_label: Optional[str] = Field(None, min_length=1, max_length=5)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    date: Optional[str] = Field(None, description="ISO format date (YYYY-MM-DD), must be a Friday or Saturday")
    doors_open: Optional[str] = Field(None, min_length=1, max_length=20)
    address: Optional[str] = Field(None, min_length=1, max_length=500)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    poster_image: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None, max_length=1000)
    ticket_price: Optional[str] = Field(None, max_length=50)
    doors_close: Optional[str] = Field(None, max_length=20)
    external_ticket_url: Optional[str] = Field(None, max_length=500)
    promo_code: Optional[str] = Field(None, max_length=24)
    promo_label: Optional[str] = Field(None, max_length=40)
    promo_hint: Optional[str] = Field(None, max_length=200)

    @field_validator("title", "host", "pin_label", "category", "doors_open", "address")
    @classmethod
    def strip_required_style(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        stripped = v.strip()
        if not stripped:
            raise ValueError("must not be empty")
        return stripped

    @field_validator("description", "ticket_price", "doors_close", "promo_label", "promo_hint")
    @classmethod
    def strip_optional_text(cls, v: Optional[str]) -> Optional[str]:
        return _strip_optional(v)

    @field_validator("poster_image")
    @classmethod
    def reject_external_poster_urls(cls, v: Optional[str]) -> Optional[str]:
        return _validate_poster_image(v)

    @field_validator("external_ticket_url")
    @classmethod
    def https_ticket_url(cls, v: Optional[str]) -> Optional[str]:
        return _validate_ticket_url(v)

    @field_validator("promo_code")
    @classmethod
    def normalize_promo_code(cls, v: Optional[str]) -> Optional[str]:
        return _validate_promo_code(v)

    @field_validator("date")
    @classmethod
    def validate_date_is_friday_or_saturday(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return _validate_friday_or_saturday(v)

    @model_validator(mode="after")
    def promo_label_required_with_code(self):
        if self.promo_code and not self.promo_label:
            raise ValueError("promo_label is required when promo_code is set")
        return self


class PosterUploadResponse(BaseModel):
    path: str


class AddressSuggestion(BaseModel):
    display_name: str
    lat: float
    lon: float


class HostStats(BaseModel):
    """Host credibility line for the party page (WF-D host row).

    Values come from the same get_host_rankings() RPC that powers the public
    leaderboard, so the party page and the Ranks tab can never disagree.
    Only parties whose host_codes were linked by an admin have these —
    self-serve listings render the host row without a stats line.
    """

    displayName: str
    partiesHosted: int
    avgLikePercentage: float
    logoUrl: Optional[str] = None


class PartyResponse(BaseModel):
    id: str
    title: str
    host: str
    pinLabel: str  # camelCase for frontend compatibility
    category: str
    day: Literal["friday", "saturday"]
    date: str  # ISO format date string
    doorsOpen: str  # camelCase for frontend compatibility
    doorsClose: Optional[str] = None
    # Soft-gate (Epic 7.3): anon callers get null address + engagement counts
    address: Optional[str] = None
    latitude: float
    longitude: float
    goingCount: Optional[int] = None
    status: Optional[str] = None
    likePercentage: Optional[float] = None
    ratingCount: Optional[int] = None
    likeCount: Optional[int] = None
    dislikeCount: Optional[int] = None
    isVerified: bool = False
    posterImage: Optional[str] = None
    description: Optional[str] = None
    ticketPrice: Optional[str] = None
    ticketUrl: Optional[str] = None
    promoCode: Optional[str] = None
    promoLabel: Optional[str] = None
    promoHint: Optional[str] = None
    ratingOpen: bool = False
    ratingLocked: bool = False
    # Detail endpoint only (GET /parties/{id}); the list stays lean.
    hostStats: Optional[HostStats] = None
    # Detail endpoint only: is this the top party (by going count) of its
    # night? The feed computes this client-side from the full list; the
    # detail page can't, so the server answers it here.
    isHeadliner: bool = False

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
