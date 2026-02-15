import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class BudgetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    fiscal_year: int = Field(..., ge=1900, le=2100)


class BudgetEntryUpsert(BaseModel):
    account_number: str = Field(..., min_length=1, max_length=50)
    month: int = Field(..., ge=1, le=12)
    amount: float


class BudgetEntryResponse(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    month: int
    amount: float

    model_config = {"from_attributes": True}


class BudgetResponse(BaseModel):
    id: uuid.UUID
    name: str
    fiscal_year: int
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BudgetWithEntriesResponse(BaseModel):
    id: uuid.UUID
    name: str
    fiscal_year: int
    created_by_id: uuid.UUID
    entries: list[BudgetEntryResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BudgetListResponse(BaseModel):
    budgets: list[BudgetResponse]
    total: int | None = None
    limit: int | None = None
    offset: int | None = None
    has_more: bool | None = None
