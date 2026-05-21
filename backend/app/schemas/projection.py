import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# --- Loan ---
class LoanCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    principal: float = Field(..., ge=0)
    interest_rate: float = Field(..., ge=0, le=100)  # percentage
    remaining_payments: int = Field(..., ge=0, le=600)  # max 50 years monthly
    payment_amount: float | None = Field(default=None, ge=0)
    start_month: int = Field(default=0, ge=0, le=120)
    notes: str | None = Field(default=None, max_length=1000)


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
    module: str = Field(..., min_length=1, max_length=50)
    row_id: str = Field(..., min_length=1, max_length=100)
    year_index: int = Field(..., ge=0, le=10)
    type: str = Field(..., min_length=1, max_length=50)
    value: float
    is_recurring: bool = False
    note: str | None = Field(default=None, max_length=1000)


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
    name: str = Field(..., min_length=1, max_length=100)
    projection_years: int = Field(default=5, ge=1, le=10)
    projection_mode: Literal["gl", "account"] = "gl"
    projection_horizon: Literal["annual", "monthly"] = "annual"
    start_year: int | None = Field(default=None, ge=1900, le=2200)
    start_month: int | None = Field(default=None, ge=1, le=12)
    company_id: uuid.UUID | None = None
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None


class ProjectionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    projection_years: int | None = Field(default=None, ge=1, le=10)
    projection_mode: Literal["gl", "account"] | None = None
    projection_horizon: Literal["annual", "monthly"] | None = None
    start_year: int | None = Field(default=None, ge=1900, le=2200)
    start_month: int | None = Field(default=None, ge=1, le=12)


class ProjectionResponse(BaseModel):
    id: uuid.UUID
    name: str
    projection_years: int
    projection_mode: str
    projection_horizon: str
    start_year: int | None = None
    start_month: int | None = None
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
    projection_horizon: str
    start_year: int | None = None
    start_month: int | None = None
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
    total: int | None = None
    limit: int | None = None
    offset: int | None = None
    has_more: bool | None = None


# --- Projection Compute ---

class ProjectionYearResult(BaseModel):
    year_index: int
    fiscal_year: int
    total_revenue: float
    total_expenses: float
    ebitda: float
    ebitda_margin: float
    depreciation: float
    ebit: float
    net_income: float
    capex: float
    debt_service: float
    free_cash_flow: float


class ProjectionComputeResult(BaseModel):
    projection_id: str
    projection_name: str
    base_fiscal_year: int
    projection_years: int
    computed_at: str
    years: list[ProjectionYearResult]
