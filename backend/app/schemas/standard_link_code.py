import uuid
from datetime import datetime

from pydantic import BaseModel, computed_field


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
    ft_line_item: str | None = None
    projections: str | None = None
    sort_order: int | None = None


class StandardLinkCodeUpdate(BaseModel):
    parent_code: str | None = None
    label_account: str | None = None
    label_sub_account: str | None = None
    account_type: str | None = None
    account_sub_type: str | None = None
    variable_or_fixed: str | None = None
    ft_category: str | None = None
    ft_line_item: str | None = None
    projections: str | None = None
    sort_order: int | None = None
