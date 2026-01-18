from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime, date


class PartyBase(BaseModel):
    title: str
    host: str
    category: str
    day: Literal["friday", "saturday"]
    doors_open: str
    address: str
    latitude: float
    longitude: float


class PartyCreate(BaseModel):
    title: str
    host: str
    category: str
    day: Literal["friday", "saturday"]
    doors_open: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


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
