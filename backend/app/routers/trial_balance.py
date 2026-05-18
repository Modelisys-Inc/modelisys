import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, verify_company_access
from app.models.account_mapping import AccountMapping
from app.models.company import Company
from app.models.trial_balance import ChartOfAccount, TrialBalanceEntry
from app.models.user import User
from app.schemas.trial_balance import (
    TrialBalanceAccountResponse,
    TrialBalanceEntryUpsert,
    TrialBalanceResponse,
    TrialBalanceUnknownAccountPreview,
    TrialBalanceUploadPreviewResponse,
    TrialBalanceUploadResponse,
)

router = APIRouter(prefix="/api/companies/{company_id}/trial-balance", tags=["trial-balance"])

MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

# Tolérance pour considérer la balance comme équilibrée (arrondis monétaires).
BALANCE_SUM_TOLERANCE = 0.01


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


def _excel_account_number_str(raw) -> str:
    """Normalise le # de compte lu depuis Excel (ex. float 100001.0 → \"100001\")."""
    if raw is None:
        return ""
    if isinstance(raw, bool):
        return str(raw)
    if isinstance(raw, int):
        return str(raw)
    if isinstance(raw, float):
        if raw.is_integer():
            return str(int(raw))
        return str(raw).strip()
    s = str(raw).strip()
    if len(s) > 2 and s.endswith(".0") and s[:-2].replace("-", "").isdigit():
        return s[:-2]
    return s


def _parse_trial_balance_excel_rows(content: bytes) -> tuple[list[tuple[str, str, float]], float]:
    import openpyxl
    from io import BytesIO

    wb = openpyxl.load_workbook(BytesIO(content), read_only=True)
    ws = wb.active
    rows_out: list[tuple[str, str, float]] = []
    total = 0.0
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or len(row) < 3 or row[0] is None:
            continue
        account_number = _excel_account_number_str(row[0])
        if not account_number:
            continue
        description = str(row[1] or "").strip() if len(row) > 1 else ""
        try:
            amount = float(row[2] or 0)
        except (ValueError, TypeError):
            continue
        rows_out.append((account_number, description, amount))
        total += amount
    return rows_out, total


def _parse_trial_balance_csv_rows(content: bytes) -> tuple[list[tuple[str, str, float]], float]:
    import csv
    import io

    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return [], 0.0
    rows_out: list[tuple[str, str, float]] = []
    total = 0.0
    for row in rows[1:]:
        if len(row) < 3 or row[0] is None or str(row[0]).strip() == "":
            continue
        account_number = _excel_account_number_str(row[0])
        if not account_number:
            continue
        description = str(row[1] or "").strip() if len(row) > 1 else ""
        raw_amt = row[2] if len(row) > 2 else 0
        if isinstance(raw_amt, str):
            raw_amt = raw_amt.replace(",", ".").replace(" ", "").strip()
        try:
            amount = float(raw_amt or 0)
        except (ValueError, TypeError):
            continue
        rows_out.append((account_number, description, amount))
        total += amount
    return rows_out, total


def _parse_trial_balance_file(content: bytes, filename: str | None) -> tuple[list[tuple[str, str, float]], float]:
    fn = (filename or "").lower()
    if fn.endswith(".csv"):
        return _parse_trial_balance_csv_rows(content)
    return _parse_trial_balance_excel_rows(content)


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


@router.delete("", response_model=TrialBalanceResponse)
def delete_trial_balance_month(
    company_id: uuid.UUID,
    fiscal_year: int = Query(..., description="Exercice fiscal"),
    month: int = Query(..., ge=1, le=12, description="Mois 1–12"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Supprime toutes les écritures de balance pour un mois donné (exercice + mois)."""
    verify_company_access(db, current_user, company_id)

    db.query(TrialBalanceEntry).filter(
        TrialBalanceEntry.company_id == company_id,
        TrialBalanceEntry.fiscal_year == fiscal_year,
        TrialBalanceEntry.month == month,
    ).delete(synchronize_session=False)
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

    db.commit()

    # Return updated data
    return get_trial_balance(company_id, fiscal_year, current_user, db)


@router.post("/upload-preview", response_model=TrialBalanceUploadPreviewResponse)
async def preview_upload_trial_balance(
    company_id: uuid.UUID,
    file: UploadFile = File(...),
    fiscal_year: int = Query(default=None),
    month: int = Query(default=1, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Analyse le fichier sans écrire en base : somme des montants, comptes absents du mapping."""
    verify_company_access(db, current_user, company_id)

    if fiscal_year is None:
        fiscal_year = datetime.now().year

    content = await file.read()
    try:
        parsed_rows, amount_sum = _parse_trial_balance_file(content, file.filename)
    except Exception:
        raise HTTPException(status_code=400, detail="Fichier invalide ou illisible.")

    m_map = _mapping_by_trimmed_number(db, company_id)
    unknown = _unknown_accounts_preview(parsed_rows, m_map)

    return TrialBalanceUploadPreviewResponse(
        company_id=company_id,
        fiscal_year=fiscal_year,
        month=month,
        amount_sum=amount_sum,
        balance_is_valid=abs(amount_sum) <= BALANCE_SUM_TOLERANCE,
        row_count=len(parsed_rows),
        unknown_accounts=unknown,
    )


@router.post("/upload", response_model=TrialBalanceUploadResponse)
async def upload_trial_balance(
    company_id: uuid.UUID,
    file: UploadFile = File(...),
    fiscal_year: int = Query(default=None),
    month: int = Query(default=1, ge=1, le=12),
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

    if fiscal_year is None:
        fiscal_year = datetime.now().year

    content = await file.read()
    try:
        parsed_rows, amount_sum = _parse_trial_balance_file(content, file.filename)
    except Exception:
        raise HTTPException(status_code=400, detail="Fichier invalide ou illisible.")

    ignored_set = {str(x).strip() for x in (ignored_accounts or []) if str(x).strip()}
    if ignored_set:
        # Exclure les comptes ignorés du fichier pour la validation et l'import.
        parsed_rows = [(acc, desc, amt) for (acc, desc, amt) in parsed_rows if acc.strip() not in ignored_set]
        amount_sum = sum((amt for (_acc, _desc, amt) in parsed_rows), 0.0)

    if abs(amount_sum) > BALANCE_SUM_TOLERANCE:
        raise HTTPException(
            status_code=400,
            detail="La somme des montants doit être égale à 0,00 $ (balance non équilibrée).",
        )

    m_map = _mapping_by_trimmed_number(db, company_id)
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

    db.commit()

    return TrialBalanceUploadResponse(
        company_id=company_id,
        fiscal_year=fiscal_year,
        accounts_imported=count,
        message=f"{count} compte(s) importé(s) pour {MONTHS_FR[month - 1]} {fiscal_year}",
    )
