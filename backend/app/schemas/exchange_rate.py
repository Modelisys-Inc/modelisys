import uuid
from datetime import datetime

from pydantic import BaseModel


class ExchangeRateUpsert(BaseModel):
    currency: str
    fiscal_year: int | None = None
    monthly_rates: dict[str, float] = {}
    notes: dict[str, str] = {}


class ExchangeRateResponse(BaseModel):
    id: uuid.UUID
    currency: str
    fiscal_year: int | None = None
    monthly_rates: dict[str, float] = {}
    notes: dict[str, str] = {}
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExchangeRateListResponse(BaseModel):
    exchange_rates: list[ExchangeRateResponse]
