import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, verify_company_access
from app.models.company import Company
from app.models.user import User
from app.schemas.financial_statement import (
    FinancialStatementResponse,
    FinancialStatementSeriesResponse,
    SummaryMetricsResponse,
    SummarySeriesResponse,
)
from app.services.financial_statements import (
    _calendar_to_fiscal_date,
    _parse_fiscal_year_end,
    compute_financial_statement,
    compute_financial_statement_series,
    compute_summary_metrics,
    compute_summary_series,
)

router = APIRouter(
    prefix="/api/companies/{company_id}/financial-statements",
    tags=["financial-statements"],
)


def _convert_calendar_to_fiscal(company: Company, calendar_year: int, calendar_month: int) -> tuple[int, int]:
    """Convert calendar year/month from frontend to fiscal year/month for backend.

    The frontend sends calendar dates (e.g. year=2025, month=2 for February 2025).
    The backend service functions expect fiscal year and fiscal month.
    """
    fy_end_month, _ = _parse_fiscal_year_end(company.fiscal_year_end)
    return _calendar_to_fiscal_date(calendar_year, calendar_month, fy_end_month)


@router.get("/income-statement", response_model=FinancialStatementResponse)
def get_income_statement(
    company_id: uuid.UUID,
    fiscal_year: int = Query(...),
    month: int = Query(default=12, ge=1, le=12),
    period: str = Query(default="monthly"),
    comparison_type: str = Query(default="prior_year"),
    budget_id: uuid.UUID | None = Query(default=None),
    division_id: uuid.UUID | None = Query(default=None),
    sub_division_id: uuid.UUID | None = Query(default=None),
    customer: str | None = Query(default=None),
    supplier: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = verify_company_access(db, current_user, company_id)
    fy, fm = _convert_calendar_to_fiscal(company, fiscal_year, month)
    return compute_financial_statement(
        db, company, "income-statement", fy, fm,
        period, comparison_type, budget_id, division_id, sub_division_id,
        customer, supplier,
    )


@router.get("/balance-sheet", response_model=FinancialStatementResponse)
def get_balance_sheet(
    company_id: uuid.UUID,
    fiscal_year: int = Query(...),
    month: int = Query(default=12, ge=1, le=12),
    period: str = Query(default="monthly"),
    comparison_type: str = Query(default="prior_year"),
    budget_id: uuid.UUID | None = Query(default=None),
    division_id: uuid.UUID | None = Query(default=None),
    sub_division_id: uuid.UUID | None = Query(default=None),
    customer: str | None = Query(default=None),
    supplier: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = verify_company_access(db, current_user, company_id)
    fy, fm = _convert_calendar_to_fiscal(company, fiscal_year, month)
    return compute_financial_statement(
        db, company, "balance-sheet", fy, fm,
        period, comparison_type, budget_id, division_id, sub_division_id,
        customer, supplier,
    )


@router.get("/cash-flow", response_model=FinancialStatementResponse)
def get_cash_flow(
    company_id: uuid.UUID,
    fiscal_year: int = Query(...),
    month: int = Query(default=12, ge=1, le=12),
    period: str = Query(default="monthly"),
    comparison_type: str = Query(default="prior_year"),
    budget_id: uuid.UUID | None = Query(default=None),
    division_id: uuid.UUID | None = Query(default=None),
    sub_division_id: uuid.UUID | None = Query(default=None),
    customer: str | None = Query(default=None),
    supplier: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cash-flow summary computed from the company `cash-flow` structure.

    Link codes (TEX/TIN/TFI) expand via attached Bilan/CDR codes on the
    Code de liaison page, then sum matching trial-balance accounts.
    """
    company = verify_company_access(db, current_user, company_id)
    fy, fm = _convert_calendar_to_fiscal(company, fiscal_year, month)
    return compute_financial_statement(
        db, company, "cash-flow", fy, fm,
        period, comparison_type, budget_id, division_id, sub_division_id,
        customer, supplier,
    )


@router.get("/cash-flow-detail", response_model=FinancialStatementResponse)
def get_cash_flow_detail(
    company_id: uuid.UUID,
    fiscal_year: int = Query(...),
    month: int = Query(default=12, ge=1, le=12),
    period: str = Query(default="monthly"),
    comparison_type: str = Query(default="prior_year"),
    budget_id: uuid.UUID | None = Query(default=None),
    division_id: uuid.UUID | None = Query(default=None),
    sub_division_id: uuid.UUID | None = Query(default=None),
    customer: str | None = Query(default=None),
    supplier: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cash-flow detail: same liaison/TB aggregation as summary, using `cash-flow-detail`."""
    company = verify_company_access(db, current_user, company_id)
    fy, fm = _convert_calendar_to_fiscal(company, fiscal_year, month)
    return compute_financial_statement(
        db, company, "cash-flow-detail", fy, fm,
        period, comparison_type, budget_id, division_id, sub_division_id,
        customer, supplier,
    )


@router.get("/summary/series", response_model=SummarySeriesResponse)
def get_summary_series(
    company_id: uuid.UUID,
    fiscal_year: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = verify_company_access(db, current_user, company_id)
    return compute_summary_series(db, company, fiscal_year)


@router.get("/summary", response_model=SummaryMetricsResponse)
def get_summary_metrics(
    company_id: uuid.UUID,
    fiscal_year: int = Query(...),
    month: int = Query(default=12, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = verify_company_access(db, current_user, company_id)
    fy, fm = _convert_calendar_to_fiscal(company, fiscal_year, month)
    return compute_summary_metrics(db, company, fy, fm)


@router.get("/{statement_type}/series", response_model=FinancialStatementSeriesResponse)
def get_financial_statement_series(
    company_id: uuid.UUID,
    statement_type: str,
    fiscal_year: int = Query(...),
    month: int = Query(default=12, ge=1, le=12),
    months: int = Query(default=12, ge=1, le=120),
    division_id: uuid.UUID | None = Query(default=None),
    sub_division_id: uuid.UUID | None = Query(default=None),
    customer: str | None = Query(default=None),
    supplier: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = verify_company_access(db, current_user, company_id)
    fy, fm = _convert_calendar_to_fiscal(company, fiscal_year, month)
    return compute_financial_statement_series(
        db, company, statement_type, fy, fm, months,
        division_id, sub_division_id, customer, supplier,
    )
