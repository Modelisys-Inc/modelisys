import uuid

from pydantic import BaseModel


class TrialBalanceAccountResponse(BaseModel):
    account_number: str
    description: str
    monthly_amounts: dict[str, float]  # {"Janvier": 1000.0, "Février": 500.0, ...}


class TrialBalanceResponse(BaseModel):
    company_id: uuid.UUID
    fiscal_year: int
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
