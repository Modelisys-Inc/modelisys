import uuid
from datetime import datetime

from pydantic import BaseModel, computed_field, field_validator


class StandardLinkCodeResponse(BaseModel):
    id: uuid.UUID
    code: str
    parent_code: str | None
    family: str
    label_account: str | None
    label_sub_account: str | None
    account_type: str | None
    account_sub_type: str | None
    variable_or_fixed: str | None
    ft_category: str | None
    attached_link_codes: list[str] = []

    @field_validator("attached_link_codes", mode="before")
    @classmethod
    def _coerce_attached_link_codes(cls, value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        return []

    ft_line_item: str | None
    projections: str | None
    is_leaf: bool
    sort_order: int
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def label(self) -> str:
        return self.label_sub_account or self.label_account or self.code

    model_config = {"from_attributes": True}


class StandardLinkCodeFamilyGroup(BaseModel):
    family: str
    account_type: str | None
    codes: list[StandardLinkCodeResponse]


class StandardLinkCodeCreate(BaseModel):
    code: str
    family: str
    parent_code: str | None = None
    label_account: str | None = None
    label_sub_account: str | None = None
    account_type: str | None = None
    account_sub_type: str | None = None
    variable_or_fixed: str | None = None
    ft_category: str | None = None
    attached_link_codes: list[str] = []
    ft_line_item: str | None = None
    projections: str | None = None
    is_leaf: bool = True
    sort_order: int | None = None


class StandardLinkCodeUpdate(BaseModel):
    new_code: str | None = None
    parent_code: str | None = None
    label_account: str | None = None
    label_sub_account: str | None = None
    account_type: str | None = None
    account_sub_type: str | None = None
    variable_or_fixed: str | None = None
    ft_category: str | None = None
    attached_link_codes: list[str] | None = None
    ft_line_item: str | None = None
    projections: str | None = None
    is_leaf: bool | None = None
    sort_order: int | None = None


class StandardLinkCodeSyncResponse(BaseModel):
    companies_updated: int
