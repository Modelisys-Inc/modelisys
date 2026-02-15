import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class MemberResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str  # "admin" | "member" | "viewer"
    created_at: datetime

    model_config = {"from_attributes": True}


class MemberListResponse(BaseModel):
    members: list[MemberResponse]


class MemberInvite(BaseModel):
    email: EmailStr
    role: str = "member"


class MemberRoleUpdate(BaseModel):
    role: str
