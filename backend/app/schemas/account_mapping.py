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
    variable_cost_revenue_link_code: str | None = None
    liability_remaining_years: float | None = None
    liability_interest_rate: float | None = None
    product: str | None = None
    customer: str | None = None
    supplier: str | None = None
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
    variable_cost_revenue_link_code: str | None = None
    liability_remaining_years: float | None = None
    liability_interest_rate: float | None = None
    product: str | None = None
    customer: str | None = None
    supplier: str | None = None
    interco_company_id: uuid.UUID | None = None

    model_config = {"from_attributes": True}


class AccountMappingListResponse(BaseModel):
    mappings: list[AccountMappingResponse]
    total: int | None = None
    limit: int | None = None
    offset: int | None = None
    has_more: bool | None = None


class ProductCreate(BaseModel):
    name: str


class ProductResponse(BaseModel):
    id: uuid.UUID
    name: str
    sort_order: int | None = 0

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    products: list[ProductResponse]
