from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal


ORG_TYPES = ("frat", "house", "other")
APPLICATION_STATUSES = ("pending", "approved", "rejected")


class HostApplicationCreate(BaseModel):
    org_type: Literal["frat", "house", "other"]
    org_name: str = Field(..., min_length=1, max_length=60)
    instagram: str = Field(..., min_length=1, max_length=30)
    address: str = Field(..., min_length=1, max_length=500)

    @field_validator("org_name", "address")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip()

    @field_validator("instagram")
    @classmethod
    def normalize_instagram(cls, v: str) -> str:
        return v.strip().lstrip("@")


class HostApplicationResponse(BaseModel):
    id: str
    userId: str
    orgType: str
    orgName: str
    instagram: str
    address: str
    status: str
    createdAt: Optional[str] = None
    reviewedAt: Optional[str] = None


class HostMeResponse(BaseModel):
    isHost: bool
    application: Optional[HostApplicationResponse] = None


class AdminHostApplicationResponse(HostApplicationResponse):
    applicantUsername: Optional[str] = None
    applicantEmail: Optional[str] = None


class AdminHostApplicationsListResponse(BaseModel):
    applications: list[AdminHostApplicationResponse]
    total: int
    limit: int
    offset: int
