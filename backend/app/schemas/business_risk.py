import uuid
from datetime import datetime

from pydantic import BaseModel


class BusinessRiskCreate(BaseModel):
    risk_id: str
    category: str
    name: str
    description: str | None = None
    impact: str | None = None
    recommendation: str | None = None
    level: str | None = None
    note: str | None = None


class BusinessRiskUpdate(BaseModel):
    level: str | None = None
    note: str | None = None
    description: str | None = None
    impact: str | None = None
    recommendation: str | None = None


class BusinessRiskResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID | None = None
    risk_id: str
    category: str
    name: str
    description: str | None = None
    impact: str | None = None
    recommendation: str | None = None
    level: str | None = None
    note: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BusinessRiskListResponse(BaseModel):
    risks: list[BusinessRiskResponse]
