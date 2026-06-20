import uuid

from pydantic import BaseModel


class GlobalMatchSuggestion(BaseModel):
    code: str
    label: str
    family: str


class PromotionCandidate(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    company_name: str
    code: str
    family: str
    label: str
    account_type: str | None
    ft_category: str | None
    promotion_status: str
    suggested_match: GlobalMatchSuggestion | None = None


class PromotionCandidateList(BaseModel):
    candidates: list[PromotionCandidate]


class PromoteRequest(BaseModel):
    # If set, link the candidate to this existing global code instead of creating one.
    link_to_existing_code: str | None = None
    # Otherwise create a new global code (defaults to the custom code's values).
    code: str | None = None
    label_account: str | None = None
    label_sub_account: str | None = None


class PromoteResponse(BaseModel):
    company_link_code_id: uuid.UUID
    promoted_to_standard_code: str
    created_new_code: bool
