import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.budget import Budget, BudgetEntry
from app.models.company import Company
from app.models.trial_balance import ChartOfAccount
from app.models.user import User, UserOrganization
from app.schemas.budget import (
    BudgetCreate,
    BudgetEntryUpsert,
    BudgetListResponse,
    BudgetWithEntriesResponse,
)

router = APIRouter(prefix="/api/companies/{company_id}/budgets", tags=["budgets"])


def _verify_company_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    memberships = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    org_ids = {m.organization_id for m in memberships}

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or company.organization_id not in org_ids:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("", response_model=BudgetListResponse)
def list_budgets(
    company_id: uuid.UUID,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    query = db.query(Budget).filter(Budget.company_id == company_id)
    total = query.count()
    budgets = query.order_by(Budget.fiscal_year.desc(), Budget.name).offset(offset).limit(limit).all()
    return BudgetListResponse(
        budgets=budgets,
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(budgets) < total,
    )


@router.post("", response_model=BudgetWithEntriesResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    company_id: uuid.UUID,
    request: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    budget = Budget(
        organization_id=company.organization_id,
        company_id=company_id,
        name=request.name,
        fiscal_year=request.fiscal_year,
        created_by_id=current_user.id,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.get("/{budget_id}", response_model=BudgetWithEntriesResponse)
def get_budget(
    company_id: uuid.UUID,
    budget_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_company_access(db, current_user, company_id)
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.company_id == company_id)
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget


@router.put("/{budget_id}/entries", response_model=BudgetWithEntriesResponse)
def upsert_budget_entries(
    company_id: uuid.UUID,
    budget_id: uuid.UUID,
    entries: list[BudgetEntryUpsert],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk upsert budget entries. Matches on account + month."""
    _verify_company_access(db, current_user, company_id)
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.company_id == company_id)
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    for entry in entries:
        # Find account by account_number
        account = (
            db.query(ChartOfAccount)
            .filter(
                ChartOfAccount.company_id == company_id,
                ChartOfAccount.account_number == entry.account_number,
            )
            .first()
        )
        if not account:
            continue

        existing = (
            db.query(BudgetEntry)
            .filter(
                BudgetEntry.budget_id == budget_id,
                BudgetEntry.account_id == account.id,
                BudgetEntry.month == entry.month,
            )
            .first()
        )
        if existing:
            existing.amount = entry.amount
        else:
            db.add(BudgetEntry(
                budget_id=budget_id,
                account_id=account.id,
                month=entry.month,
                amount=entry.amount,
            ))

    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    company_id: uuid.UUID,
    budget_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_company_access(db, current_user, company_id)
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.company_id == company_id)
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()
