from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr


class UserUpdate(BaseModel):
    username: str


class User(UserBase):
    id: str
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
