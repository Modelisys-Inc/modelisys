import uuid
from datetime import datetime

from pydantic import BaseModel


# --- Sub-Division ---
class SubDivisionCreate(BaseModel):
    name: str


class SubDivisionResponse(BaseModel):
    id: uuid.UUID
    name: str

    model_config = {"from_attributes": True}


# --- Division ---
class DivisionCreate(BaseModel):
    name: str
    sub_divisions: list[SubDivisionCreate] = []


class DivisionResponse(BaseModel):
    id: uuid.UUID
    name: str
    sub_divisions: list[SubDivisionResponse] = []

    model_config = {"from_attributes": True}


# --- Company ---
class CompanyCreate(BaseModel):
    name: str
    fiscal_year_end: str = "12-31"
    currency: str = "CAD"
    divisions: list[DivisionCreate] = []


class CompanyUpdate(BaseModel):
    name: str | None = None
    fiscal_year_end: str | None = None
    currency: str | None = None


class CompanyResponse(BaseModel):
    id: uuid.UUID
    name: str
    fiscal_year_end: str
    currency: str
    divisions: list[DivisionResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CompanyListResponse(BaseModel):
    companies: list[CompanyResponse]
