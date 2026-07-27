from pydantic import BaseModel, Field


class DiagnosticSummary(BaseModel):
    latest_fiscal_year: int
    lifecycle_stage: str
    revenue_cagr_5y: float | None = None
    latest_revenue: float = 0.0
    latest_ebitda: float = 0.0
    latest_net_income: float = 0.0
    latest_gross_margin_pct: float | None = None
    latest_ebitda_margin_pct: float | None = None
    latest_net_margin_pct: float | None = None
    current_ratio: float | None = None
    quick_ratio: float | None = None
    debt_to_equity: float | None = None
    capex_latest: float = 0.0
    capex_revenue_pct: float | None = None
    indicative_enterprise_value_mid: float = 0.0


class DiagnosticTrendYear(BaseModel):
    fiscal_year: int
    revenue: float = 0.0
    gross_profit: float = 0.0
    gross_margin_pct: float | None = None
    ebitda: float = 0.0
    ebitda_margin_pct: float | None = None
    net_income: float = 0.0
    net_margin_pct: float | None = None
    current_assets: float = 0.0
    current_liabilities: float = 0.0
    inventory: float = 0.0
    total_assets: float = 0.0
    total_liabilities: float = 0.0
    equity: float = 0.0
    depreciation: float = 0.0
    capex: float = 0.0
    current_ratio: float | None = None
    quick_ratio: float | None = None
    debt_to_equity: float | None = None
    asset_turnover: float | None = None
    interest_coverage: float | None = None


class DiagnosticSeasonalityMonth(BaseModel):
    month_number: int
    month_label: str
    average_revenue: float = 0.0
    average_ebitda: float = 0.0
    revenue_share_pct: float | None = None
    ebitda_margin_pct: float | None = None


class DiagnosticDivisionPerformance(BaseModel):
    division_id: str
    division_name: str
    revenue: float = 0.0
    gross_profit: float = 0.0
    gross_margin_pct: float | None = None
    ebitda: float = 0.0
    ebitda_margin_pct: float | None = None
    net_income: float = 0.0
    revenue_share_pct: float | None = None
    revenue_cagr_5y: float | None = None
    profitable: bool = False


class DiagnosticProductPerformance(BaseModel):
    product_name: str
    revenue: float = 0.0
    gross_profit: float = 0.0
    gross_margin_pct: float | None = None
    ebitda: float = 0.0
    ebitda_margin_pct: float | None = None
    revenue_share_pct: float | None = None


class DiagnosticDivisionProductPerformance(BaseModel):
    division_id: str
    division_name: str
    product_name: str
    revenue: float = 0.0
    gross_profit: float = 0.0
    gross_margin_pct: float | None = None
    ebitda: float = 0.0
    ebitda_margin_pct: float | None = None


class DiagnosticValuation(BaseModel):
    normalized_ebitda: float = 0.0
    multiple_low: float = 0.0
    multiple_high: float = 0.0
    enterprise_value_low: float = 0.0
    enterprise_value_high: float = 0.0
    enterprise_value_mid: float = 0.0
    book_equity: float = 0.0
    rationale: list[str] = Field(default_factory=list)


class CompanyDiagnosticResponse(BaseModel):
    company_id: str
    company_name: str
    currency: str
    fiscal_year_end: str
    latest_fiscal_year: int
    summary: DiagnosticSummary
    trends: list[DiagnosticTrendYear] = Field(default_factory=list)
    seasonality: list[DiagnosticSeasonalityMonth] = Field(default_factory=list)
    divisions: list[DiagnosticDivisionPerformance] = Field(default_factory=list)
    products: list[DiagnosticProductPerformance] = Field(default_factory=list)
    division_products: list[DiagnosticDivisionProductPerformance] = Field(default_factory=list)
    valuation: DiagnosticValuation
    notes: list[str] = Field(default_factory=list)
    generated_at: str
