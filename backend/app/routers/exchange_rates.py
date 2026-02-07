import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.exchange_rate import ExchangeRate
from app.models.user import User, UserOrganization
from app.schemas.exchange_rate import (
    ExchangeRateListResponse,
    ExchangeRateUpsert,
)

router = APIRouter(prefix="/api/companies/{company_id}/exchange-rates", tags=["exchange-rates"])


def _verify_company_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    memberships = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    org_ids = {m.organization_id for m in memberships}

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or company.organization_id not in org_ids:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("", response_model=ExchangeRateListResponse)
def list_exchange_rates(
    company_id: uuid.UUID,
    fiscal_year: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    query = db.query(ExchangeRate).filter(
        ExchangeRate.organization_id == company.organization_id,
    )
    if fiscal_year is not None:
        query = query.filter(ExchangeRate.fiscal_year == fiscal_year)
    rates = query.order_by(ExchangeRate.currency).all()
    return ExchangeRateListResponse(exchange_rates=rates)


@router.put("", response_model=ExchangeRateListResponse)
def upsert_exchange_rates(
    company_id: uuid.UUID,
    entries: list[ExchangeRateUpsert],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upsert exchange rates. Matches on currency + fiscal_year within the organization."""
    company = _verify_company_access(db, current_user, company_id)

    for entry in entries:
        existing = (
            db.query(ExchangeRate)
            .filter(
                ExchangeRate.organization_id == company.organization_id,
                ExchangeRate.currency == entry.currency,
                ExchangeRate.fiscal_year == entry.fiscal_year,
            )
            .first()
        )
        if existing:
            existing.monthly_rates = entry.monthly_rates
            existing.notes = entry.notes
        else:
            rate = ExchangeRate(
                organization_id=company.organization_id,
                currency=entry.currency,
                fiscal_year=entry.fiscal_year,
                monthly_rates=entry.monthly_rates,
                notes=entry.notes,
            )
            db.add(rate)

    db.commit()

    rates = (
        db.query(ExchangeRate)
        .filter(ExchangeRate.organization_id == company.organization_id)
        .order_by(ExchangeRate.currency)
        .all()
    )
    return ExchangeRateListResponse(exchange_rates=rates)
