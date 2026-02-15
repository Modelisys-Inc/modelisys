import uuid
from datetime import datetime

from pydantic import BaseModel


class CustomerCreate(BaseModel):
    name: str
    sort_order: int = 0


class CustomerResponse(BaseModel):
    id: uuid.UUID
    name: str
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CustomerListResponse(BaseModel):
    customers: list[CustomerResponse]
