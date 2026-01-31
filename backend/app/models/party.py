from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime, date


class PartyBase(BaseModel):
    title: str = Field(..., max_length=50)
    host: str = Field(..., max_length=30)
    category: str = Field(..., max_length=50)
    day: Literal["friday", "saturday"]
    doors_open: str = Field(..., max_length=20)
    address: str = Field(..., max_length=500)
    latitude: float
    longitude: float


class PartyCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=50)
    host: str = Field(..., min_length=1, max_length=30)
    category: str = Field(..., min_length=1, max_length=50)
    day: Literal["friday", "saturday"]
    doors_open: str = Field(..., min_length=1, max_length=20)
    address: str = Field(..., min_length=1, max_length=500)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

    @field_validator('title', 'host', 'category', 'doors_open', 'address')
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class Party(PartyBase):
    id: str
    going_count: int = 0
    created_by: Optional[str] = None
    status: Literal["pending", "approved", "rejected"] = "pending"
    created_at: datetime
    weekend_of: date

    class Config:
        from_attributes = True


class PartyResponse(BaseModel):
    id: str
    title: str
    host: str
    category: str
    day: Literal["friday", "saturday"]
    doorsOpen: str  # camelCase for frontend compatibility
    address: str
    latitude: float
    longitude: float
    goingCount: int  # camelCase for frontend compatibility
    status: Optional[str] = None

    class Config:
        from_attributes = True
