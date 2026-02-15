import uuid
from datetime import datetime

from pydantic import BaseModel


class NoteCreate(BaseModel):
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
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None


class NoteUpdate(BaseModel):
    content: str | None = None
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
