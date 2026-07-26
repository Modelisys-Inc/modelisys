import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, verify_company_access
from app.models.account_mapping import AccountMapping
from app.models.company import Company
from app.models.trial_balance import AccountAnnualBalance, ChartOfAccount, TrialBalanceEntry
from app.models.user import User
from app.services.tb_rollup import refresh_annual_balances
from app.services.trial_balance_import import (
    BALANCE_SUM_TOLERANCE,
    MONTHS_FR,
    MultiMonthParseResult,
    flatten_multi_month_for_unknown_preview,
    month_sums_are_balanced,
    parse_multi_month_file,
    parse_single_month_file,
    period_label,
)
from app.schemas.trial_balance import (
    AccountAnnualBalanceResponse,
    TrialBalanceAccountResponse,
    TrialBalanceAnnualSummaryResponse,
    TrialBalanceEntryUpsert,
    TrialBalanceMonthPreview,
    TrialBalanceResponse,
    TrialBalanceUnknownAccountPreview,
    TrialBalanceUploadPreviewResponse,
    TrialBalanceUploadResponse,
)

router = APIRouter(prefix="/api/companies/{company_id}/trial-balance", tags=["trial-balance"])

# Tolérance pour considérer la balance comme équilibrée (arrondis monétaires).


def _sort_account_numbers(account_numbers: set[str]) -> list[str]:
    """Tri stable : numérique si le numéro est entièrement numérique, sinon lexicographique."""

    def key(n: str) -> tuple:
        s = (n or "").strip()
        if s.isdigit():
            return (0, int(s))
        return (1, s)

    return sorted(account_numbers, key=key)


def _mapping_by_trimmed_number(
    db: Session, company_id: uuid.UUID
) -> dict[str, AccountMapping]:
    """Un mapping par # de compte trim (aligné sur le mapping comptable)."""
    rows = db.query(AccountMapping).filter(AccountMapping.company_id == company_id).all()
    out: dict[str, AccountMapping] = {}
    for row in rows:
        k = (row.account_number or "").strip()
        if k and k not in out:
            out[k] = row
    return out


def _unknown_accounts_preview(
    parsed_rows: list[tuple[str, str, float]], m_map: dict[str, AccountMapping]
) -> list[TrialBalanceUnknownAccountPreview]:
    from collections import defaultdict

    sums: dict[str, float] = defaultdict(float)
    desc_first: dict[str, str] = {}
    for acc, desc, amt in parsed_rows:
        k = acc.strip()
        if k in m_map:
            continue
        sums[k] += amt
        if k not in desc_first:
            desc_first[k] = desc
    ordered = _sort_account_numbers(set(sums.keys()))
    return [
        TrialBalanceUnknownAccountPreview(
            account_number=acc,
            description=desc_first.get(acc, ""),
            amount=sums[acc],
        )
        for acc in ordered
    ]


def _single_month_rows_as_tuples(rows) -> list[tuple[str, str, float]]:
    return [(r.account_number, r.description, r.amount) for r in rows]


def _multi_month_preview(
    company_id: uuid.UUID,
    parsed: MultiMonthParseResult,
    start_year: int,
    start_month: int,
    month_count: int,
    m_map: dict[str, AccountMapping],
) -> TrialBalanceUploadPreviewResponse:
    flat = flatten_multi_month_for_unknown_preview(parsed.rows)
    month_previews = [
        TrialBalanceMonthPreview(
            year=period.year,
            month=period.month,
            label=period_label(period),
            amount_sum=parsed.month_sums[idx],
            balance_is_valid=abs(parsed.month_sums[idx]) <= BALANCE_SUM_TOLERANCE,
        )
        for idx, period in enumerate(parsed.periods)
    ]
    return TrialBalanceUploadPreviewResponse(
        company_id=company_id,
        fiscal_year=start_year,
        month=start_month,
        amount_sum=sum(parsed.month_sums),
        balance_is_valid=month_sums_are_balanced(parsed.month_sums),
        row_count=len(parsed.rows),
        unknown_accounts=_unknown_accounts_preview(flat, m_map),
        import_mode="multi",
        start_year=start_year,
        start_month=start_month,
        month_count=month_count,
        month_previews=month_previews,
    )


def _commit_multi_month_upload(
    db: Session,
    company_id: uuid.UUID,
    parsed: MultiMonthParseResult,
    m_map: dict[str, AccountMapping],
    ignored_set: set[str],
) -> tuple[int, int, set[int]]:
    """Returns (accounts_imported, months_imported, fiscal_years_touched)."""
    rows = [
        row
        for row in parsed.rows
        if row.account_number.strip() not in ignored_set
    ]
    if not rows:
        return 0, len(parsed.periods), set()

    for row in rows:
        ak = row.account_number.strip()
        if ak not in m_map:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Le compte « {ak} » n'est pas dans le mapping comptable. "
                    "Ajoutez-le ou complétez l'étape de validation avant import."
                ),
            )

    affected_years = {p.year for p in parsed.periods}
    chart_by_number: dict[str, ChartOfAccount] = {
        (c.account_number or "").strip(): c
        for c in db.query(ChartOfAccount).filter(ChartOfAccount.company_id == company_id).all()
    }

    new_charts: list[ChartOfAccount] = []
    account_numbers = {row.account_number.strip() for row in rows}
    for acc in account_numbers:
        m = m_map.get(acc)
        if not m:
            continue
        account = chart_by_number.get(acc)
        if account is None:
            account = ChartOfAccount(
                company_id=company_id,
                account_number=acc,
                account_name=m.description,
            )
            chart_by_number[acc] = account
            new_charts.append(account)
        else:
            account.account_name = m.description
    if new_charts:
        db.add_all(new_charts)
        db.flush()

    existing_entries: dict[tuple[uuid.UUID, int, int], TrialBalanceEntry] = {
        (e.account_id, e.fiscal_year, e.month): e
        for e in db.query(TrialBalanceEntry).filter(
            TrialBalanceEntry.company_id == company_id,
            TrialBalanceEntry.fiscal_year.in_(affected_years),
        ).all()
    }

    new_entries: list[TrialBalanceEntry] = []
    account_count = 0
    for row in rows:
        acc = row.account_number.strip()
        account = chart_by_number.get(acc)
        if account is None:
            continue
        account_count += 1
        for idx, amount in enumerate(row.amounts):
            period = parsed.periods[idx]
            key = (account.id, period.year, period.month)
            existing = existing_entries.get(key)
            if existing:
                existing.amount = amount
            else:
                entry = TrialBalanceEntry(
                    company_id=company_id,
                    account_id=account.id,
                    fiscal_year=period.year,
                    month=period.month,
                    amount=amount,
                )
                new_entries.append(entry)
                existing_entries[key] = entry

    if new_entries:
        db.add_all(new_entries)

    db.flush()
    for year in affected_years:
        refresh_annual_balances(db, company_id, year)
    db.commit()

    return account_count, len(parsed.periods), affected_years


@router.get("", response_model=TrialBalanceResponse)
def get_trial_balance(
    company_id: uuid.UUID,
    fiscal_year: int = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = verify_company_access(db, current_user, company_id)

    if fiscal_year is None:
        # Default to the most recent fiscal year that has any entries for this company.
        # This prevents "data disappears" when users imported a past year but revisit without ?fiscal_year=.
        latest_year = (
            db.query(func.max(TrialBalanceEntry.fiscal_year))
            .filter(TrialBalanceEntry.company_id == company_id)
            .scalar()
        )
        fiscal_year = int(latest_year) if latest_year is not None else datetime.now().year

    chart = db.query(ChartOfAccount).filter(ChartOfAccount.company_id == company_id).all()
    chart_by_number: dict[str, ChartOfAccount] = {}
    for account in chart:
        k = (account.account_number or "").strip()
        if k:
            chart_by_number[k] = account

    entries = (
        db.query(TrialBalanceEntry)
        .filter(
            TrialBalanceEntry.company_id == company_id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
        )
        .all()
    )

    account_entries: dict[uuid.UUID, dict[int, float]] = {}
    for entry in entries:
        if entry.account_id not in account_entries:
            account_entries[entry.account_id] = {}
        account_entries[entry.account_id][entry.month] = float(entry.amount)

    months_with_data = sorted({e.month for e in entries})

    # Une ligne par compte du mapping comptable uniquement (# + Description = mapping)
    mapping_by_number = _mapping_by_trimmed_number(db, company_id)
    ordered_nums = _sort_account_numbers(set(mapping_by_number.keys()))

    accounts = []
    for num in ordered_nums:
        m = mapping_by_number[num]
        coa = chart_by_number.get(num)
        monthly = account_entries.get(coa.id, {}) if coa is not None else {}

        monthly_amounts = {}
        for i, month_name in enumerate(MONTHS_FR, 1):
            monthly_amounts[month_name] = monthly.get(i, 0.0)

        accounts.append(
            TrialBalanceAccountResponse(
                account_number=m.account_number.strip(),
                description=m.description,
                monthly_amounts=monthly_amounts,
            )
        )

    return TrialBalanceResponse(
        company_id=company_id,
        fiscal_year=fiscal_year,
        months_with_data=months_with_data,
        accounts=accounts,
    )


@router.get("/fiscal-years", response_model=list[int])
def list_fiscal_years_with_trial_balance_data(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Exercices fiscaux pour lesquels au moins une écriture de balance existe."""
    verify_company_access(db, current_user, company_id)
    rows = (
        db.query(TrialBalanceEntry.fiscal_year)
        .filter(TrialBalanceEntry.company_id == company_id)
        .distinct()
        .order_by(TrialBalanceEntry.fiscal_year.desc())
        .all()
    )
    return [int(r[0]) for r in rows]


@router.get("/annual-summary", response_model=TrialBalanceAnnualSummaryResponse)
def get_annual_summary(
    company_id: uuid.UUID,
    fiscal_year: int = Query(..., description="Exercice fiscal"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Annual total per GL account for a fiscal year, served from the
    pre-aggregated rollup (account_annual_balances)."""
    verify_company_access(db, current_user, company_id)

    rows = (
        db.query(AccountAnnualBalance, ChartOfAccount)
        .join(ChartOfAccount, ChartOfAccount.id == AccountAnnualBalance.account_id)
        .filter(
            AccountAnnualBalance.company_id == company_id,
            AccountAnnualBalance.fiscal_year == fiscal_year,
        )
        .order_by(ChartOfAccount.account_number)
        .all()
    )

    accounts = [
        AccountAnnualBalanceResponse(
            account_id=bal.account_id,
            account_number=chart.account_number,
            account_name=chart.account_name,
            fiscal_year=bal.fiscal_year,
            amount=float(bal.amount),
            month_count=bal.month_count,
        )
        for bal, chart in rows
    ]
    return TrialBalanceAnnualSummaryResponse(
        company_id=company_id,
        fiscal_year=fiscal_year,
        accounts=accounts,
        total=sum(a.amount for a in accounts),
    )


def _parse_months_csv(months: str) -> list[int]:
    """Parse une liste de mois 1–12 (ex. « 1,2,3 »)."""
    parsed: list[int] = []
    for part in months.split(","):
        token = part.strip()
        if not token:
            continue
        try:
            m = int(token)
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail="months must be a comma-separated list of integers 1–12",
            ) from exc
        if m < 1 or m > 12:
            raise HTTPException(status_code=422, detail="each month must be between 1 and 12")
        parsed.append(m)
    if not parsed:
        raise HTTPException(status_code=422, detail="months must contain at least one month")
    return sorted(set(parsed))


@router.delete("", response_model=TrialBalanceResponse)
def delete_trial_balance(
    company_id: uuid.UUID,
    fiscal_year: int | None = Query(default=None, description="Exercice fiscal"),
    month: int | None = Query(default=None, ge=1, le=12, description="Mois unique 1–12"),
    months: str | None = Query(
        default=None,
        description="Mois multiples séparés par des virgules (ex. 1,2,3)",
    ),
    all_months: bool = Query(
        default=False,
        description="Supprimer tous les mois importés pour l'exercice fiscal",
    ),
    delete_all: bool = Query(
        default=False,
        description="Supprimer toutes les périodes importées pour la société",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Supprime des écritures de balance (un mois, plusieurs mois, une année entière ou tout)."""
    verify_company_access(db, current_user, company_id)

    if delete_all:
        years_touched = [
            int(r[0])
            for r in db.query(TrialBalanceEntry.fiscal_year)
            .filter(TrialBalanceEntry.company_id == company_id)
            .distinct()
            .all()
        ]
        db.query(TrialBalanceEntry).filter(
            TrialBalanceEntry.company_id == company_id,
        ).delete(synchronize_session=False)
        for fy in years_touched:
            refresh_annual_balances(db, company_id, fy)
        db.commit()
        return get_trial_balance(company_id, None, current_user, db)

    if fiscal_year is None:
        raise HTTPException(
            status_code=400,
            detail="fiscal_year is required unless delete_all=true",
        )

    if all_months:
        db.query(TrialBalanceEntry).filter(
            TrialBalanceEntry.company_id == company_id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
        ).delete(synchronize_session=False)
    elif months is not None:
        month_list = _parse_months_csv(months)
        db.query(TrialBalanceEntry).filter(
            TrialBalanceEntry.company_id == company_id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
            TrialBalanceEntry.month.in_(month_list),
        ).delete(synchronize_session=False)
    elif month is not None:
        db.query(TrialBalanceEntry).filter(
            TrialBalanceEntry.company_id == company_id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
            TrialBalanceEntry.month == month,
        ).delete(synchronize_session=False)
    else:
        raise HTTPException(
            status_code=400,
            detail="Specify month, months, all_months, or delete_all",
        )

    refresh_annual_balances(db, company_id, fiscal_year)
    db.commit()

    return get_trial_balance(company_id, fiscal_year, current_user, db)


@router.put("", response_model=TrialBalanceResponse)
def upsert_trial_balance(
    company_id: uuid.UUID,
    entries: list[TrialBalanceEntryUpsert],
    fiscal_year: int = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk upsert montants : uniquement pour les # de compte présents dans le mapping comptable."""
    company = verify_company_access(db, current_user, company_id)

    if fiscal_year is None:
        fiscal_year = datetime.now().year

    m_map = _mapping_by_trimmed_number(db, company_id)
    chart_by_number: dict[str, ChartOfAccount] = {
        (c.account_number or "").strip(): c
        for c in db.query(ChartOfAccount)
        .filter(ChartOfAccount.company_id == company_id)
        .all()
    }

    new_charts: list[ChartOfAccount] = []
    for entry in entries:
        an = (entry.account_number or "").strip()
        m = m_map.get(an)
        if not m:
            continue
        account = chart_by_number.get(an)
        if account is None:
            account = ChartOfAccount(
                company_id=company_id,
                account_number=an,
                account_name=m.description,
            )
            chart_by_number[an] = account
            new_charts.append(account)
        else:
            account.account_name = m.description
    if new_charts:
        db.add_all(new_charts)
        db.flush()

    existing_entries: dict[tuple[uuid.UUID, int], TrialBalanceEntry] = {
        (e.account_id, e.month): e
        for e in db.query(TrialBalanceEntry).filter(
            TrialBalanceEntry.company_id == company_id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
        ).all()
    }

    new_entries: list[TrialBalanceEntry] = []
    for entry in entries:
        an = (entry.account_number or "").strip()
        account = chart_by_number.get(an)
        if account is None:
            continue
        for month_name, amount in entry.monthly_amounts.items():
            try:
                month_num = MONTHS_FR.index(month_name) + 1
            except ValueError:
                continue
            existing = existing_entries.get((account.id, month_num))
            if existing:
                existing.amount = amount
            else:
                new_entries.append(
                    TrialBalanceEntry(
                        company_id=company_id,
                        account_id=account.id,
                        fiscal_year=fiscal_year,
                        month=month_num,
                        amount=amount,
                    )
                )
    if new_entries:
        db.add_all(new_entries)

    db.flush()
    refresh_annual_balances(db, company_id, fiscal_year)
    db.commit()

    # Return updated data
    return get_trial_balance(company_id, fiscal_year, current_user, db)


@router.post("/upload-preview", response_model=TrialBalanceUploadPreviewResponse)
async def preview_upload_trial_balance(
    company_id: uuid.UUID,
    file: UploadFile = File(...),
    fiscal_year: int = Query(default=None),
    month: int = Query(default=1, ge=1, le=12),
    import_mode: str = Query(default="single"),
    start_year: int | None = Query(default=None),
    start_month: int | None = Query(default=None, ge=1, le=12),
    month_count: int = Query(default=1, ge=1, le=120),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Analyse le fichier sans écrire en base : somme des montants, comptes absents du mapping."""
    verify_company_access(db, current_user, company_id)

    content = await file.read()
    m_map = _mapping_by_trimmed_number(db, company_id)

    if import_mode == "multi":
        sy = start_year if start_year is not None else datetime.now().year
        sm = start_month if start_month is not None else 1
        try:
            parsed = parse_multi_month_file(content, file.filename, sy, sm, month_count)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Fichier invalide ou illisible.") from exc
        return _multi_month_preview(company_id, parsed, sy, sm, month_count, m_map)

    if fiscal_year is None:
        fiscal_year = datetime.now().year

    try:
        rows, amount_sum = parse_single_month_file(content, file.filename)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Fichier invalide ou illisible.") from exc

    parsed_rows = _single_month_rows_as_tuples(rows)
    unknown = _unknown_accounts_preview(parsed_rows, m_map)

    return TrialBalanceUploadPreviewResponse(
        company_id=company_id,
        fiscal_year=fiscal_year,
        month=month,
        amount_sum=amount_sum,
        balance_is_valid=abs(amount_sum) <= BALANCE_SUM_TOLERANCE,
        row_count=len(parsed_rows),
        unknown_accounts=unknown,
        import_mode="single",
        month_count=1,
    )


@router.post("/upload", response_model=TrialBalanceUploadResponse)
async def upload_trial_balance(
    company_id: uuid.UUID,
    file: UploadFile = File(...),
    fiscal_year: int = Query(default=None),
    month: int = Query(default=1, ge=1, le=12),
    import_mode: str = Query(default="single"),
    start_year: int | None = Query(default=None),
    start_month: int | None = Query(default=None, ge=1, le=12),
    month_count: int = Query(default=1, ge=1, le=120),
    ignored_accounts: list[str] | None = Query(
        default=None,
        description="Liste de # de compte à ignorer lors de l'import (ex. comptes absents du mapping à 0$).",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Import Excel : # de compte, Description, Montant — somme = 0 requise ; tous les comptes du fichier
    doivent être dans le mapping comptable (dernière ligne l’emporte si doublon de compte)."""
    verify_company_access(db, current_user, company_id)

    content = await file.read()
    ignored_set = {str(x).strip() for x in (ignored_accounts or []) if str(x).strip()}
    m_map = _mapping_by_trimmed_number(db, company_id)

    if import_mode == "multi":
        sy = start_year if start_year is not None else datetime.now().year
        sm = start_month if start_month is not None else 1
        try:
            parsed = parse_multi_month_file(content, file.filename, sy, sm, month_count)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Fichier invalide ou illisible.") from exc

        if ignored_set:
            parsed.rows = [
                row for row in parsed.rows if row.account_number.strip() not in ignored_set
            ]
            parsed.month_sums = [0.0] * len(parsed.periods)
            for row in parsed.rows:
                for idx, amount in enumerate(row.amounts):
                    parsed.month_sums[idx] += amount

        if not month_sums_are_balanced(parsed.month_sums):
            bad = [
                period_label(parsed.periods[i])
                for i, s in enumerate(parsed.month_sums)
                if abs(s) > BALANCE_SUM_TOLERANCE
            ]
            raise HTTPException(
                status_code=400,
                detail=(
                    "La somme des montants doit être égale à 0,00 $ pour chaque mois "
                    f"(périodes non équilibrées : {', '.join(bad)})."
                ),
            )

        account_count, months_imported, _years = _commit_multi_month_upload(
            db, company_id, parsed, m_map, ignored_set
        )
        first_label = period_label(parsed.periods[0])
        last_label = period_label(parsed.periods[-1])
        return TrialBalanceUploadResponse(
            company_id=company_id,
            fiscal_year=sy,
            accounts_imported=account_count,
            months_imported=months_imported,
            message=(
                f"{account_count} compte(s) importé(s) sur {months_imported} mois "
                f"({first_label} → {last_label})."
            ),
        )

    if fiscal_year is None:
        fiscal_year = datetime.now().year

    try:
        rows, amount_sum = parse_single_month_file(content, file.filename)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Fichier invalide ou illisible.") from exc

    parsed_rows = _single_month_rows_as_tuples(rows)
    if ignored_set:
        # Exclure les comptes ignorés du fichier pour la validation et l'import.
        parsed_rows = [(acc, desc, amt) for (acc, desc, amt) in parsed_rows if acc.strip() not in ignored_set]
        amount_sum = sum((amt for (_acc, _desc, amt) in parsed_rows), 0.0)

    if abs(amount_sum) > BALANCE_SUM_TOLERANCE:
        raise HTTPException(
            status_code=400,
            detail="La somme des montants doit être égale à 0,00 $ (balance non équilibrée).",
        )

    for acc, _desc, _amt in parsed_rows:
        ak = acc.strip()
        if ak not in m_map:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Le compte « {ak} » n'est pas dans le mapping comptable. "
                    "Ajoutez-le ou complétez l'étape de validation avant import."
                ),
            )

    last_by_account: dict[str, float] = {}
    for acc, _desc, amt in parsed_rows:
        last_by_account[acc.strip()] = amt

    chart_by_number: dict[str, ChartOfAccount] = {
        (c.account_number or "").strip(): c
        for c in db.query(ChartOfAccount)
        .filter(ChartOfAccount.company_id == company_id)
        .all()
    }

    new_charts: list[ChartOfAccount] = []
    for acc in last_by_account:
        m = m_map.get(acc)
        if not m:
            continue
        account = chart_by_number.get(acc)
        if account is None:
            account = ChartOfAccount(
                company_id=company_id,
                account_number=acc,
                account_name=m.description,
            )
            chart_by_number[acc] = account
            new_charts.append(account)
        else:
            account.account_name = m.description
    if new_charts:
        db.add_all(new_charts)
        db.flush()

    existing_entries: dict[uuid.UUID, TrialBalanceEntry] = {
        e.account_id: e
        for e in db.query(TrialBalanceEntry).filter(
            TrialBalanceEntry.company_id == company_id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
            TrialBalanceEntry.month == month,
        ).all()
    }

    count = 0
    new_entries: list[TrialBalanceEntry] = []
    for acc, amt in last_by_account.items():
        account = chart_by_number.get(acc)
        if account is None:
            continue
        existing = existing_entries.get(account.id)
        if existing:
            existing.amount = amt
        else:
            new_entries.append(
                TrialBalanceEntry(
                    company_id=company_id,
                    account_id=account.id,
                    fiscal_year=fiscal_year,
                    month=month,
                    amount=amt,
                )
            )
        count += 1
    if new_entries:
        db.add_all(new_entries)

    db.flush()
    refresh_annual_balances(db, company_id, fiscal_year)
    db.commit()

    return TrialBalanceUploadResponse(
        company_id=company_id,
        fiscal_year=fiscal_year,
        accounts_imported=count,
        months_imported=1,
        message=f"{count} compte(s) importé(s) pour {MONTHS_FR[month - 1]} {fiscal_year}",
    )
