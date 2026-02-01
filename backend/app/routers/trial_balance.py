import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.trial_balance import ChartOfAccount, TrialBalanceEntry
from app.models.user import User, UserOrganization
from app.schemas.trial_balance import (
    TrialBalanceAccountResponse,
    TrialBalanceEntryUpsert,
    TrialBalanceResponse,
    TrialBalanceUploadResponse,
)

router = APIRouter(prefix="/api/companies/{company_id}/trial-balance", tags=["trial-balance"])

MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]


def _verify_company_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    memberships = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    org_ids = {m.organization_id for m in memberships}

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or company.organization_id not in org_ids:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("", response_model=TrialBalanceResponse)
def get_trial_balance(
    company_id: uuid.UUID,
    fiscal_year: int = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)

    if fiscal_year is None:
        fiscal_year = datetime.now().year

    # Get all chart of accounts for this company
    chart = db.query(ChartOfAccount).filter(ChartOfAccount.company_id == company_id).all()
    account_map = {a.id: a for a in chart}

    # Get all entries for this fiscal year
    entries = (
        db.query(TrialBalanceEntry)
        .filter(
            TrialBalanceEntry.company_id == company_id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
        )
        .all()
    )

    # Group entries by account
    account_entries: dict[uuid.UUID, dict[int, float]] = {}
    for entry in entries:
        if entry.account_id not in account_entries:
            account_entries[entry.account_id] = {}
        account_entries[entry.account_id][entry.month] = float(entry.amount)

    # Build response
    accounts = []
    for account in chart:
        monthly = account_entries.get(account.id, {})
        monthly_amounts = {}
        for i, month_name in enumerate(MONTHS_FR, 1):
            monthly_amounts[month_name] = monthly.get(i, 0.0)

        accounts.append(
            TrialBalanceAccountResponse(
                account_number=account.account_number,
                description=account.account_name,
                monthly_amounts=monthly_amounts,
            )
        )

    return TrialBalanceResponse(
        company_id=company_id,
        fiscal_year=fiscal_year,
        accounts=accounts,
    )


@router.put("", response_model=TrialBalanceResponse)
def upsert_trial_balance(
    company_id: uuid.UUID,
    entries: list[TrialBalanceEntryUpsert],
    fiscal_year: int = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk upsert trial balance entries. Creates chart of accounts entries as needed."""
    company = _verify_company_access(db, current_user, company_id)

    if fiscal_year is None:
        fiscal_year = datetime.now().year

    for entry in entries:
        # Find or create chart of account
        account = (
            db.query(ChartOfAccount)
            .filter(
                ChartOfAccount.company_id == company_id,
                ChartOfAccount.account_number == entry.account_number,
            )
            .first()
        )
        if not account:
            account = ChartOfAccount(
                company_id=company_id,
                account_number=entry.account_number,
                account_name=entry.description,
            )
            db.add(account)
            db.flush()
        else:
            account.account_name = entry.description

        # Upsert monthly amounts
        for month_name, amount in entry.monthly_amounts.items():
            try:
                month_num = MONTHS_FR.index(month_name) + 1
            except ValueError:
                continue

            existing = (
                db.query(TrialBalanceEntry)
                .filter(
                    TrialBalanceEntry.company_id == company_id,
                    TrialBalanceEntry.account_id == account.id,
                    TrialBalanceEntry.fiscal_year == fiscal_year,
                    TrialBalanceEntry.month == month_num,
                )
                .first()
            )
            if existing:
                existing.amount = amount
            else:
                db.add(
                    TrialBalanceEntry(
                        company_id=company_id,
                        account_id=account.id,
                        fiscal_year=fiscal_year,
                        month=month_num,
                        amount=amount,
                    )
                )

    db.commit()

    # Return updated data
    return get_trial_balance(company_id, fiscal_year, current_user, db)


@router.post("/upload", response_model=TrialBalanceUploadResponse)
async def upload_trial_balance(
    company_id: uuid.UUID,
    file: UploadFile = File(...),
    fiscal_year: int = Query(default=None),
    month: int = Query(default=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload an Excel file with trial balance data.
    Expected columns: # de compte, Description, Montant"""
    import openpyxl

    company = _verify_company_access(db, current_user, company_id)

    if fiscal_year is None:
        fiscal_year = datetime.now().year

    content = await file.read()

    try:
        from io import BytesIO
        wb = openpyxl.load_workbook(BytesIO(content), read_only=True)
        ws = wb.active
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Excel file")

    rows = list(ws.iter_rows(min_row=2, values_only=True))  # Skip header
    count = 0

    for row in rows:
        if len(row) < 3 or row[0] is None:
            continue

        account_number = str(row[0]).strip()
        description = str(row[1] or "").strip()
        try:
            amount = float(row[2] or 0)
        except (ValueError, TypeError):
            continue

        # Find or create chart of account
        account = (
            db.query(ChartOfAccount)
            .filter(
                ChartOfAccount.company_id == company_id,
                ChartOfAccount.account_number == account_number,
            )
            .first()
        )
        if not account:
            account = ChartOfAccount(
                company_id=company_id,
                account_number=account_number,
                account_name=description,
            )
            db.add(account)
            db.flush()

        # Upsert entry
        existing = (
            db.query(TrialBalanceEntry)
            .filter(
                TrialBalanceEntry.company_id == company_id,
                TrialBalanceEntry.account_id == account.id,
                TrialBalanceEntry.fiscal_year == fiscal_year,
                TrialBalanceEntry.month == month,
            )
            .first()
        )
        if existing:
            existing.amount = amount
        else:
            db.add(
                TrialBalanceEntry(
                    company_id=company_id,
                    account_id=account.id,
                    fiscal_year=fiscal_year,
                    month=month,
                    amount=amount,
                )
            )
        count += 1

    db.commit()

    return TrialBalanceUploadResponse(
        company_id=company_id,
        fiscal_year=fiscal_year,
        accounts_imported=count,
        message=f"{count} accounts imported for {MONTHS_FR[month - 1]} {fiscal_year}",
    )
