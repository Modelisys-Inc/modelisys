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
