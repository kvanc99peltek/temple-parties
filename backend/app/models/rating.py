from pydantic import BaseModel, Field
from typing import Optional


class RatingCreate(BaseModel):
    rating: int = Field(..., ge=0, le=1, description="Thumbs down (0) or thumbs up (1)")


class RatingResponse(BaseModel):
    partyId: str
    rating: int
    likePercentage: float
    ratingCount: int


class PartyRankingResponse(BaseModel):
    id: str
    title: str
    host: str
    category: str
    day: str
    date: str
    doorsOpen: str
    likePercentage: float
    ratingCount: int
    goingCount: int
    userRating: Optional[int] = None


class HostRankingResponse(BaseModel):
    hostCode: str
    displayName: str
    logoUrl: Optional[str] = None
    partiesHosted: int
    totalRatingCount: int
    totalGoingCount: int
    avgLikePercentage: float
    bayesianScore: float
    finalScore: float
    isEligible: bool
