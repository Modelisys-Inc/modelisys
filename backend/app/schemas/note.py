import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    row_id: str = Field(..., min_length=1, max_length=100)
    row_label: str = Field(..., min_length=1, max_length=200)
    page: str = Field(..., min_length=1, max_length=100)
    period: str = Field(..., min_length=1, max_length=50)
    view: str = Field(..., min_length=1, max_length=50)
    current_amount: float | None = None
    prior_amount: float | None = None
    variation_percent: float | None = None
    variation_amount: float | None = None
    content: str = Field(..., min_length=1, max_length=10000)
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None


class NoteUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=1, max_length=10000)
    current_amount: float | None = None
    prior_amount: float | None = None
    variation_percent: float | None = None
    variation_amount: float | None = None


class NoteResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID | None = None
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None
    row_id: str
    row_label: str
    page: str
    period: str
    view: str
    current_amount: float | None = None
    prior_amount: float | None = None
    variation_percent: float | None = None
    variation_amount: float | None = None
    content: str
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoteListResponse(BaseModel):
    notes: list[NoteResponse]
    total: int | None = None
    limit: int | None = None
    offset: int | None = None
    has_more: bool | None = None
