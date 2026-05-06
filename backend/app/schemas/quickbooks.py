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


class TrialBalanceRowProposal(BaseModel):
    qbo_account_id: str
    account_number: str
    account_name: str
    qbo_account_type: str | None = None
    qbo_account_sub_type: str | None = None
    debit: float
    credit: float
    existing_link_code: str | None = None


class TrialBalancePreviewRequest(BaseModel):
    fiscal_year: int
    month: int


class TrialBalancePreviewResponse(BaseModel):
    fiscal_year: int
    month: int
    currency: str
    fetched_at: datetime
    rows: list[TrialBalanceRowProposal]


class TrialBalanceCommitRow(BaseModel):
    account_number: str
    account_name: str
    debit: float
    credit: float
    link_code: str | None = None
    skip: bool = False


class TrialBalanceCommitRequest(BaseModel):
    fiscal_year: int
    month: int
    rows: list[TrialBalanceCommitRow]
    overwrite_existing_tb: bool = False


class TrialBalanceCommitResponse(BaseModel):
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
