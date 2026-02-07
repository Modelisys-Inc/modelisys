import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.user import User, UserOrganization
from app.schemas.financial_statement import (
    FinancialStatementResponse,
    FinancialStatementSeriesResponse,
    SummaryMetricsResponse,
    SummarySeriesResponse,
)
from app.services.financial_statements import (
    compute_financial_statement,
    compute_financial_statement_series,
    compute_summary_metrics,
    compute_summary_series,
)

router = APIRouter(
    prefix="/api/companies/{company_id}/financial-statements",
    tags=["financial-statements"],
)


def _verify_company_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    memberships = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    org_ids = {m.organization_id for m in memberships}

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or company.organization_id not in org_ids:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    return compute_financial_statement(
        db, company, "income-statement", fiscal_year, month,
        period, comparison_type, budget_id, division_id, sub_division_id,
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    return compute_financial_statement(
        db, company, "balance-sheet", fiscal_year, month,
        period, comparison_type, budget_id, division_id, sub_division_id,
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cash flow is derived from the income statement and balance sheet deltas.

    For now, we treat it as a separate statement structure type that can be
    configured per company, similar to income-statement and balance-sheet.
    """
    company = _verify_company_access(db, current_user, company_id)
    return compute_financial_statement(
        db, company, "cash-flow", fiscal_year, month,
        period, comparison_type, budget_id, division_id, sub_division_id,
    )


@router.get("/summary/series", response_model=SummarySeriesResponse)
def get_summary_series(
    company_id: uuid.UUID,
    fiscal_year: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    return compute_summary_series(db, company, fiscal_year)


@router.get("/summary", response_model=SummaryMetricsResponse)
def get_summary_metrics(
    company_id: uuid.UUID,
    fiscal_year: int = Query(...),
    month: int = Query(default=12, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    return compute_summary_metrics(db, company, fiscal_year, month)


@router.get("/{statement_type}/series", response_model=FinancialStatementSeriesResponse)
def get_financial_statement_series(
    company_id: uuid.UUID,
    statement_type: str,
    fiscal_year: int = Query(...),
    months: int = Query(default=12, ge=1, le=60),
    division_id: uuid.UUID | None = Query(default=None),
    sub_division_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    return compute_financial_statement_series(
        db, company, statement_type, fiscal_year, months,
        division_id, sub_division_id,
    )
