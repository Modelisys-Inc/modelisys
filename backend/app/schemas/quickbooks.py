from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ConnectionStatusResponse(BaseModel):
    status: Literal["connected", "revoked", "not_connected"]
    realm_id: str | None = None
    connected_at: datetime | None = None
    connected_by_user_id: str | None = None


class AuthorizeUrlResponse(BaseModel):
    authorize_url: str


class MonthAmount(BaseModel):
    debit: float
    credit: float


class ObservedPair(BaseModel):
    division: str
    sub_division: str


class ClassLocationTracking(BaseModel):
    classes: bool = False
    locations: bool = False


class TrialBalanceRowProposal(BaseModel):
    qbo_account_id: str
    account_number: str
    account_name: str
    qbo_account_type: str | None = None
    qbo_account_sub_type: str | None = None
    existing_link_code: str | None = None
    monthly_amounts: dict[str, MonthAmount]
    discovered_divisions: list[str] = []
    discovered_sub_divisions: list[str] = []
    divisions: list[str] = []
    sub_divisions: list[str] = []


class TrialBalancePreviewRequest(BaseModel):
    fiscal_year: int
    months: list[int]


class TrialBalancePreviewResponse(BaseModel):
    fiscal_year: int
    months: list[int]
    currency: str
    fetched_at: datetime
    existing_months: list[int]
    rows: list[TrialBalanceRowProposal]
    observed_pairs: list[ObservedPair] = []
    class_location_tracking: ClassLocationTracking = ClassLocationTracking()


class TrialBalanceCommitRow(BaseModel):
    account_number: str
    account_name: str
    link_code: str | None = None
    skip: bool = False
    divisions: list[str] = []
    sub_divisions: list[str] = []


class TrialBalanceCommitRequest(BaseModel):
    fiscal_year: int
    months: list[int]
    rows: list[TrialBalanceCommitRow]
    overwrite_existing_tb: bool = False


class TrialBalanceCommitResponse(BaseModel):
    months_imported: int
    accounts_imported: int
    mappings_created: int
    mappings_updated: int


class LinkCodeOption(BaseModel):
    code: str
    label: str
    statement_type: str
    parent_id: str | None = None
    parent_label: str | None = None


class LinkCodeCreateRequest(BaseModel):
    statement_type: str
    parent_id: str
    link_code: str
    label: str
