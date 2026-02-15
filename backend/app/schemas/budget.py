import uuid
from datetime import datetime

from pydantic import BaseModel


class BudgetCreate(BaseModel):
    name: str
    fiscal_year: int


class BudgetEntryUpsert(BaseModel):
    account_number: str
    month: int
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
