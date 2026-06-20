import uuid
from datetime import datetime

from pydantic import BaseModel, computed_field


class CompanyLinkCodeCreate(BaseModel):
    """Create a tenant-local custom link code.

    ``code`` is optional: when omitted, the server auto-generates a
    collision-free code within a reserved per-company namespace for the family.
    ``parent_code`` may reference a global or another custom code for grouping.
    """

    family: str
    label_account: str | None = None
    label_sub_account: str | None = None
    code: str | None = None
    parent_code: str | None = None
    account_type: str | None = None
    account_sub_type: str | None = None
    variable_or_fixed: str | None = None
    ft_category: str | None = None
    ft_line_item: str | None = None
    projections: str | None = None
    # Which company statement structure to append this leaf to so it renders
    # in reports. Defaults are derived from the family when omitted.
    statement_type: str | None = None


class CompanyLinkCodeResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
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
    promoted_to_standard_code: str | None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def label(self) -> str:
        return self.label_sub_account or self.label_account or self.code

    @computed_field
    @property
    def is_custom(self) -> bool:
        return True

    model_config = {"from_attributes": True}
