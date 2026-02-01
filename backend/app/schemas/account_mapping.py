import uuid

from pydantic import BaseModel


class AccountMappingUpsert(BaseModel):
    account_number: str
    description: str = ""
    link_code: str | None = None
    summary_ef: str | None = None
    detail_ef: str | None = None
    divisions: str | None = None
    sub_divisions: str | None = None
    fdrhc: bool = False
    interests: bool = False
    amortization: bool = False
    variable_costs: bool = False
    fixed_costs: bool = False
    product: str | None = None
    interco_company_id: str | None = None


class AccountMappingResponse(BaseModel):
    id: uuid.UUID
    account_number: str
    description: str
    link_code: str | None = None
    summary_ef: str | None = None
    detail_ef: str | None = None
    divisions: str | None = None
    sub_divisions: str | None = None
    fdrhc: bool = False
    interests: bool = False
    amortization: bool = False
    variable_costs: bool = False
    fixed_costs: bool = False
    product: str | None = None
    interco_company_id: uuid.UUID | None = None

    model_config = {"from_attributes": True}


class AccountMappingListResponse(BaseModel):
    mappings: list[AccountMappingResponse]


class ProductCreate(BaseModel):
    name: str


class ProductResponse(BaseModel):
    id: uuid.UUID
    name: str
    sort_order: int | None = 0

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    products: list[ProductResponse]
