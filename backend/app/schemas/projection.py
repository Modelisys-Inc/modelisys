import uuid
from datetime import datetime

from pydantic import BaseModel


# --- Loan ---
class LoanCreate(BaseModel):
    name: str
    principal: float
    interest_rate: float
    remaining_payments: int
    payment_amount: float | None = None
    start_month: int = 0
    notes: str | None = None


class LoanResponse(BaseModel):
    id: uuid.UUID
    name: str
    principal: float
    interest_rate: float
    remaining_payments: int
    payment_amount: float | None = None
    start_month: int = 0
    notes: str | None = None

    model_config = {"from_attributes": True}


# --- Projection Adjustment ---
class ProjectionAdjustmentCreate(BaseModel):
    module: str
    row_id: str
    year_index: int
    type: str
    value: float
    is_recurring: bool = False
    note: str | None = None


class ProjectionAdjustmentResponse(BaseModel):
    id: uuid.UUID
    module: str
    row_id: str
    year_index: int
    type: str
    value: float
    is_recurring: bool = False
    note: str | None = None

    model_config = {"from_attributes": True}


# --- Projection ---
class ProjectionCreate(BaseModel):
    name: str
    projection_years: int = 5
    projection_mode: str = "gl"
    company_id: uuid.UUID | None = None
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None


class ProjectionUpdate(BaseModel):
    name: str | None = None
    projection_years: int | None = None
    projection_mode: str | None = None


class ProjectionResponse(BaseModel):
    id: uuid.UUID
    name: str
    projection_years: int
    projection_mode: str
    company_id: uuid.UUID | None = None
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectionWithDetailsResponse(BaseModel):
    id: uuid.UUID
    name: str
    projection_years: int
    projection_mode: str
    company_id: uuid.UUID | None = None
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None
    created_by_id: uuid.UUID
    adjustments: list[ProjectionAdjustmentResponse] = []
    loans: list[LoanResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectionListResponse(BaseModel):
    projections: list[ProjectionResponse]
