from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime, date as date_type


class PartyBase(BaseModel):
    title: str = Field(..., max_length=50)
    host: str = Field(..., max_length=30)
    category: str = Field(..., max_length=50)
    day: Literal["friday", "saturday"]
    date: str  # ISO format date string (YYYY-MM-DD)
    doors_open: str = Field(..., max_length=20)
    address: str = Field(..., max_length=500)
    latitude: float
    longitude: float


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

    @field_validator('title', 'host', 'pin_label', 'category', 'doors_open', 'address')
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()

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


class Party(PartyBase):
    id: str
    going_count: int = 0
    created_by: Optional[str] = None
    status: Literal["pending", "approved", "rejected"] = "pending"
    created_at: datetime
    weekend_of: date_type

    class Config:
        from_attributes = True


class PartyResponse(BaseModel):
    id: str
    title: str
    host: str
    pinLabel: str  # camelCase for frontend compatibility
    category: str
    day: Literal["friday", "saturday"]
    date: str  # ISO format date string
    doorsOpen: str  # camelCase for frontend compatibility
    address: str
    latitude: float
    longitude: float
    goingCount: int  # camelCase for frontend compatibility
    status: Optional[str] = None

    class Config:
        from_attributes = True
