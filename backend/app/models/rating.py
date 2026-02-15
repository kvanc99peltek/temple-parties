from pydantic import BaseModel, Field
from typing import Optional


class RatingCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Star rating from 1 to 5")


class RatingResponse(BaseModel):
    partyId: str
    rating: int
    avgRating: float
    ratingCount: int


class PartyRankingResponse(BaseModel):
    id: str
    title: str
    host: str
    category: str
    day: str
    date: str
    doorsOpen: str
    avgRating: float
    ratingCount: int
    goingCount: int
    userRating: Optional[int] = None
