import uuid

from pydantic import BaseModel


class FinancialStatementDetailRow(BaseModel):
    id: str
    label: str
    current: float = 0.0
    prior: float = 0.0
    variation: float = 0.0
    variationAmount: float = 0.0
    isBold: bool = False
    isSection: bool = False
    isResult: bool = False


class FinancialStatementRow(BaseModel):
    id: str
    label: str
    current: float = 0.0
    prior: float = 0.0
    variation: float = 0.0
    variationAmount: float = 0.0
    isBold: bool = False
    isSection: bool = False
    isResult: bool = False
    detailRows: list[FinancialStatementDetailRow] = []
    annexLetter: str | None = None
    detailOnly: bool | None = None
    indent: bool | None = None
    separatorAbove: bool | None = None
    hasLiaisonCode: bool | None = None


class FinancialStatementResponse(BaseModel):
    companyId: str
    statementType: str
    fiscalYear: int
    month: int
    period: str
    comparisonType: str = "prior_year"
    rows: list[FinancialStatementRow] = []


class SummaryMetricsResponse(BaseModel):
    fiscalYear: int
    month: int
    revenue: float = 0.0
    revenueVariation: float = 0.0
    netIncome: float = 0.0
    netIncomeVariation: float = 0.0
    totalAssets: float = 0.0
    totalAssetsVariation: float = 0.0


# --- Series schemas ---


class SeriesPeriod(BaseModel):
    fiscalYear: int
    fiscalMonth: int
    label: str


class SeriesDetailRow(BaseModel):
    id: str
    label: str
    amounts: dict[str, float] = {}


class SeriesRow(BaseModel):
    id: str
    label: str
    isBold: bool = False
    isSection: bool = False
    isResult: bool = False
    amounts: dict[str, float] = {}
    detailRows: list[SeriesDetailRow] = []
    annexLetter: str | None = None
    detailOnly: bool | None = None
    indent: bool | None = None
    separatorAbove: bool | None = None
    hasLiaisonCode: bool | None = None


class FinancialStatementSeriesResponse(BaseModel):
    companyId: str
    statementType: str
    fiscalYear: int
    periods: list[SeriesPeriod] = []
    rows: list[SeriesRow] = []


class SummarySeriesMonth(BaseModel):
    month: int
    revenue: float = 0.0
    revenueVariation: float = 0.0
    netIncome: float = 0.0
    netIncomeVariation: float = 0.0
    totalAssets: float = 0.0
    totalAssetsVariation: float = 0.0


class SummarySeriesResponse(BaseModel):
    fiscalYear: int
    months: list[SummarySeriesMonth] = []
