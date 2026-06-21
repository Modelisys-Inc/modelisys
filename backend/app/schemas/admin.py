import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class FeatureFlagDef(BaseModel):
    key: str
    label: str
    default: bool


class AdminOrgResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    member_count: int
    company_count: int
    feature_flags: dict[str, bool]  # effective (defaults merged with overrides)
    created_at: datetime


class AdminOrgListResponse(BaseModel):
    organizations: list[AdminOrgResponse]


class CreateClientRequest(BaseModel):
    name: str
    admin_email: EmailStr


class FeatureFlagsUpdate(BaseModel):
    flags: dict[str, bool]
