import uuid

from pydantic import BaseModel, Field


class TrialBalanceAccountResponse(BaseModel):
    account_number: str
    description: str
    monthly_amounts: dict[str, float]  # {"Janvier": 1000.0, "Février": 500.0, ...}


class TrialBalanceResponse(BaseModel):
    company_id: uuid.UUID
    fiscal_year: int
    months_with_data: list[int] = Field(
        ...,
        description="Mois (1–12) pour lesquels au moins une écriture de balance existe pour cet exercice.",
    )
    accounts: list[TrialBalanceAccountResponse]


class TrialBalanceEntryUpsert(BaseModel):
    account_number: str
    description: str
    monthly_amounts: dict[str, float]


class TrialBalanceUploadResponse(BaseModel):
    company_id: uuid.UUID
    fiscal_year: int
    accounts_imported: int
    message: str


class AccountAnnualBalanceResponse(BaseModel):
    account_id: uuid.UUID
    account_number: str
    account_name: str
    fiscal_year: int
    amount: float
    month_count: int


class TrialBalanceAnnualSummaryResponse(BaseModel):
    company_id: uuid.UUID
    fiscal_year: int
    accounts: list[AccountAnnualBalanceResponse]
    total: float


class TrialBalanceUnknownAccountPreview(BaseModel):
    account_number: str
    description: str
    amount: float


class TrialBalanceUploadPreviewResponse(BaseModel):
    company_id: uuid.UUID
    fiscal_year: int
    month: int
    amount_sum: float
    balance_is_valid: bool
    row_count: int
    unknown_accounts: list[TrialBalanceUnknownAccountPreview]
