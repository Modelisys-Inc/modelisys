import uuid
from datetime import datetime

from pydantic import BaseModel


class ForecastConfigUpsert(BaseModel):
    config_type: str
    data: dict
    company_id: uuid.UUID | None = None
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None


class ForecastConfigResponse(BaseModel):
    id: uuid.UUID
    config_type: str
    data: dict
    company_id: uuid.UUID | None = None
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ForecastConfigListResponse(BaseModel):
    configs: list[ForecastConfigResponse]


class EbitdaMultipleNoteUpsert(BaseModel):
    note_type: str
    data: dict
    company_id: uuid.UUID | None = None
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None


class EbitdaMultipleNoteResponse(BaseModel):
    id: uuid.UUID
    note_type: str
    data: dict
    company_id: uuid.UUID | None = None
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EbitdaMultipleNoteListResponse(BaseModel):
    notes: list[EbitdaMultipleNoteResponse]
