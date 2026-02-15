import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


CURRENCY_CODES = {"CAD", "USD", "EUR", "GBP", "CHF", "JPY", "AUD", "NZD", "CNY", "HKD", "SGD", "MXN", "BRL"}


# --- Sub-Division ---
class SubDivisionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class SubDivisionResponse(BaseModel):
    id: uuid.UUID
    name: str

    model_config = {"from_attributes": True}


# --- Division ---
class DivisionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    sub_divisions: list[SubDivisionCreate] = []


class DivisionResponse(BaseModel):
    id: uuid.UUID
    name: str
    sub_divisions: list[SubDivisionResponse] = []

    model_config = {"from_attributes": True}


# --- Company ---
class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    fiscal_year_end: str = Field(default="12-31", pattern=r"^\d{2}-\d{2}$")
    currency: str = Field(default="CAD", min_length=3, max_length=3)
    is_cumulative_tb: bool = False
    divisions: list[DivisionCreate] = []

    @field_validator("fiscal_year_end")
    @classmethod
    def validate_fiscal_year_end(cls, v: str) -> str:
        if not re.match(r"^\d{2}-\d{2}$", v):
            raise ValueError("fiscal_year_end must be in MM-DD format")
        month, day = int(v[:2]), int(v[3:])
        if not (1 <= month <= 12 and 1 <= day <= 31):
            raise ValueError("Invalid month or day in fiscal_year_end")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        v = v.upper()
        if v not in CURRENCY_CODES:
            raise ValueError(f"currency must be one of: {', '.join(sorted(CURRENCY_CODES))}")
        return v


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    fiscal_year_end: str | None = Field(default=None, pattern=r"^\d{2}-\d{2}$")
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    is_cumulative_tb: bool | None = None

    @field_validator("fiscal_year_end")
    @classmethod
    def validate_fiscal_year_end(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not re.match(r"^\d{2}-\d{2}$", v):
            raise ValueError("fiscal_year_end must be in MM-DD format")
        month, day = int(v[:2]), int(v[3:])
        if not (1 <= month <= 12 and 1 <= day <= 31):
            raise ValueError("Invalid month or day in fiscal_year_end")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.upper()
        if v not in CURRENCY_CODES:
            raise ValueError(f"currency must be one of: {', '.join(sorted(CURRENCY_CODES))}")
        return v


class CompanyResponse(BaseModel):
    id: uuid.UUID
    name: str
    fiscal_year_end: str
    currency: str
    is_cumulative_tb: bool = False
    divisions: list[DivisionResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CompanyListResponse(BaseModel):
    companies: list[CompanyResponse]
    total: int | None = None
    limit: int | None = None
    offset: int | None = None
    has_more: bool | None = None
