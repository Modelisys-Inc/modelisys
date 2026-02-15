import uuid
from datetime import datetime

from pydantic import BaseModel


class SupplierCreate(BaseModel):
    name: str
    sort_order: int = 0


class SupplierResponse(BaseModel):
    id: uuid.UUID
    name: str
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SupplierListResponse(BaseModel):
    suppliers: list[SupplierResponse]
