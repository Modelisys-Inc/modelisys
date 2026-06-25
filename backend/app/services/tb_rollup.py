"""Maintenance of the AccountAnnualBalance rollup (annual totals per GL account).

The rollup is a derived cache of `trial_balance_entries` summed over months,
recomputed for a (company, fiscal_year) slice after every TB write. It is never
the source of truth; if it ever drifts, `refresh_annual_balances` rebuilds it
exactly from the underlying entries.
"""

import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.trial_balance import AccountAnnualBalance, TrialBalanceEntry


def refresh_annual_balances(db: Session, company_id: uuid.UUID, fiscal_year: int) -> int:
    """Recompute the annual rollup for one (company, fiscal_year) slice.

    Deletes the existing rollup rows for the slice and rebuilds them from the
    current trial-balance entries. Caller is responsible for committing.
    Returns the number of rollup rows written.
    """
    db.query(AccountAnnualBalance).filter(
        AccountAnnualBalance.company_id == company_id,
        AccountAnnualBalance.fiscal_year == fiscal_year,
    ).delete(synchronize_session=False)

    aggregates = (
        db.query(
            TrialBalanceEntry.account_id.label("account_id"),
            func.coalesce(func.sum(TrialBalanceEntry.amount), 0).label("amount"),
            func.count(TrialBalanceEntry.month).label("month_count"),
        )
        .filter(
            TrialBalanceEntry.company_id == company_id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
        )
        .group_by(TrialBalanceEntry.account_id)
        .all()
    )

    written = 0
    for row in aggregates:
        db.add(
            AccountAnnualBalance(
                id=uuid.uuid4(),
                company_id=company_id,
                account_id=row.account_id,
                fiscal_year=fiscal_year,
                amount=row.amount,
                month_count=row.month_count,
            )
        )
        written += 1

    db.flush()
    return written
