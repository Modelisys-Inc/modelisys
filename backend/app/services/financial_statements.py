"""Financial statement computation service.

Takes trial balance entries, statement structure, and account mappings,
then computes the full financial statement (income statement or balance sheet)
with current period, prior period, and variation columns.
"""

import re
import uuid
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import or_, and_
from sqlalchemy.orm import Session, joinedload

from app.models.account_mapping import AccountMapping
from app.models.budget import BudgetEntry
from app.models.company import Company, Division, SubDivision
from app.models.financial_statement_mapping import CompanyStatementStructure
from app.models.trial_balance import ChartOfAccount, TrialBalanceEntry


def _parse_fiscal_year_end(fiscal_year_end: str) -> tuple[int, int]:
    """Parse 'MM-DD' into (month, day). Returns (12, 31) on failure."""
    try:
        parts = fiscal_year_end.split("-")
        return int(parts[0]), int(parts[1])
    except (ValueError, IndexError):
        return 12, 31


def _fiscal_month_to_calendar(fiscal_month: int, fy_end_month: int) -> tuple[int, int]:
    """Convert a fiscal month (1-12) to (calendar_month, year_offset).

    Fiscal month 1 is the month after the fiscal year end month.
    year_offset is 0 if still in the fiscal year's calendar year,
    or -1 if the calendar month falls in the prior calendar year.

    Example: fiscal_year_end = "03-31" (March), fiscal_year = 2025
      - Fiscal month 1 = April  (calendar month 4, year_offset 0 => April 2024)
      - Fiscal month 9 = December (calendar month 12, year_offset 0 => Dec 2024)
      - Fiscal month 10 = January (calendar month 1, year_offset 1 => Jan 2025)
      - Fiscal month 12 = March (calendar month 3, year_offset 1 => March 2025)

    For standard calendar year (fy_end_month=12):
      - Fiscal month 1 = January, year_offset 0
      - Fiscal month 12 = December, year_offset 0
    """
    calendar_month = (fy_end_month + fiscal_month - 1) % 12 + 1
    if fy_end_month == 12:
        year_offset = 0
    else:
        year_offset = 0 if calendar_month > fy_end_month else 1
    return calendar_month, year_offset


def _calendar_to_fiscal_month(calendar_month: int, fy_end_month: int) -> int:
    """Convert a calendar month (1-12) to a fiscal month (1-12).

    Fiscal month 1 is the month after the fiscal year end month.

    Example: fiscal_year_end = "03-31" (fy_end_month=3):
      - April (4) -> fiscal month 1
      - December (12) -> fiscal month 9
      - January (1) -> fiscal month 10
      - March (3) -> fiscal month 12

    For standard calendar year (fy_end_month=12):
      - January (1) -> fiscal month 1
      - December (12) -> fiscal month 12
    """
    return (calendar_month - fy_end_month - 1) % 12 + 1


def _calendar_to_fiscal_date(
    calendar_year: int, calendar_month: int, fy_end_month: int,
) -> tuple[int, int]:
    """Convert a calendar date (year, month) to fiscal coordinates (fiscal_year, fiscal_month).

    The API receives calendar dates from the frontend (e.g. February 2025 = year=2025, month=2).
    This function converts to the fiscal year and fiscal month used internally.

    Example: fiscal_year_end = "03-31" (fy_end_month=3):
      - April 2024 (cal_year=2024, cal_month=4) -> FY 2025, FM 1
      - January 2025 (cal_year=2025, cal_month=1) -> FY 2025, FM 10
      - March 2025 (cal_year=2025, cal_month=3) -> FY 2025, FM 12

    For standard calendar year (fy_end_month=12):
      - January 2025 -> FY 2025, FM 1
      - December 2025 -> FY 2025, FM 12
    """
    fiscal_month = _calendar_to_fiscal_month(calendar_month, fy_end_month)
    fiscal_year = calendar_year + 1 if calendar_month > fy_end_month else calendar_year
    return fiscal_year, fiscal_month


def _fetch_fiscal_year_entries(
    db: Session, company_id: uuid.UUID, fiscal_year: int, fy_end_month: int,
) -> list[TrialBalanceEntry]:
    """Fetch TB entries for a fiscal year, handling calendar year boundary.

    The DB stores calendar year and calendar month. For FY ending March 2025,
    we need entries from (cal_year=2024, month 4-12) + (cal_year=2025, month 1-3).
    """
    if fy_end_month == 12:
        # Standard calendar year - simple query
        return (
            db.query(TrialBalanceEntry)
            .options(joinedload(TrialBalanceEntry.account))
            .filter(
                TrialBalanceEntry.company_id == company_id,
                TrialBalanceEntry.fiscal_year == fiscal_year,
            )
            .all()
        )

    # Fiscal year spans two calendar years
    first_cal_year = fiscal_year - 1   # months after fy_end (e.g. Apr-Dec 2024)
    second_cal_year = fiscal_year      # months up to fy_end (e.g. Jan-Mar 2025)

    return (
        db.query(TrialBalanceEntry)
        .options(joinedload(TrialBalanceEntry.account))
        .filter(
            TrialBalanceEntry.company_id == company_id,
            or_(
                and_(
                    TrialBalanceEntry.fiscal_year == first_cal_year,
                    TrialBalanceEntry.month > fy_end_month,
                ),
                and_(
                    TrialBalanceEntry.fiscal_year == second_cal_year,
                    TrialBalanceEntry.month <= fy_end_month,
                ),
            ),
        )
        .all()
    )


def _get_months_for_period(
    period: str, month: int, fy_end_month: int
) -> list[int]:
    """Return list of fiscal months to aggregate based on period type.

    Args:
        period: 'monthly', 'quarterly', 'annual', 'ytd'
        month: The fiscal month (1-12) being requested
        fy_end_month: Calendar month of fiscal year end
    """
    if period == "monthly":
        return [month]
    elif period == "quarterly":
        # Determine which fiscal quarter this month falls in
        quarter = (month - 1) // 3
        start = quarter * 3 + 1
        return list(range(start, start + 3))
    elif period == "annual":
        return list(range(1, 13))
    elif period == "ytd":
        return list(range(1, month + 1))
    else:
        return [month]


def _balance_sheet_months_to_aggregate(fiscal_month: int, is_cumulative_tb: bool) -> list[int]:
    """Fiscal months to aggregate for balance sheet rows.

    - **Non-cumulative TB** (default): each month stores the **closing balance** at that month-end.
      Only that month must be used — never sum Jan..Apr (that would add multiple closing balances).
    - **Cumulative TB**: monthly values are YTD running totals until de-cumulated; after
      de-cumulation, summing fiscal months ``1..fm`` restores the closing balance at ``fm``.
    """
    fm = max(1, min(12, int(fiscal_month)))
    if is_cumulative_tb:
        return list(range(1, fm + 1))
    return [fm]


def _build_amount_index(
    entries: list[TrialBalanceEntry],
) -> dict[str, dict[int, Decimal]]:
    """Build a lookup: account_number -> {calendar_month: amount}.

    Keys are calendar months (1-12) as stored in the DB entries.
    """
    index: dict[str, dict[int, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
    for entry in entries:
        acct_number = entry.account.account_number
        index[acct_number][entry.month] += Decimal(str(entry.amount))
    return index


def _rekey_to_fiscal(
    index: dict[str, dict[int, Decimal]], fy_end_month: int,
) -> dict[str, dict[int, Decimal]]:
    """Convert calendar-month-keyed index to fiscal-month-keyed index."""
    result: dict[str, dict[int, Decimal]] = {}
    for acct, monthly in index.items():
        result[acct] = {}
        for cal_month, amount in monthly.items():
            fm = _calendar_to_fiscal_month(cal_month, fy_end_month)
            result[acct][fm] = amount
    return result


def _build_fiscal_year_data(
    db: Session,
    company_id: uuid.UUID,
    fiscal_year: int,
    fy_end_month: int,
    is_cumulative_tb: bool,
) -> dict[str, dict[int, Decimal]]:
    """Build a fiscal-month-keyed amount index for one fiscal year.

    Handles:
    1. Calendar/fiscal year boundary (fetching from two calendar years)
    2. Conversion from calendar months to fiscal months
    3. De-cumulation of cumulative TB data (across the full fiscal year)

    For cumulative TB, the running total is continuous across the fiscal year
    (not resetting at the calendar year boundary). So we first merge all entries
    into fiscal month order, then de-cumulate once.
    """
    if fy_end_month == 12:
        # Standard calendar year - one segment
        entries = (
            db.query(TrialBalanceEntry)
            .options(joinedload(TrialBalanceEntry.account))
            .filter(
                TrialBalanceEntry.company_id == company_id,
                TrialBalanceEntry.fiscal_year == fiscal_year,
            )
            .all()
        )
        index = _build_amount_index(entries)
        if is_cumulative_tb:
            index = _decumulate_amount_index(index)
        # For fy_end=12, calendar month == fiscal month, no conversion needed
        return index

    # Non-December FY end: fetch from both calendar years, merge into fiscal months
    entries = _fetch_fiscal_year_entries(db, company_id, fiscal_year, fy_end_month)

    # Build index keyed by fiscal month (so entries are in fiscal chronological order)
    index: dict[str, dict[int, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
    for entry in entries:
        acct_number = entry.account.account_number
        fm = _calendar_to_fiscal_month(entry.month, fy_end_month)
        index[acct_number][fm] += Decimal(str(entry.amount))

    # De-cumulate across the full fiscal year (FM 1-12 in order)
    if is_cumulative_tb:
        index = _decumulate_amount_index(index)

    return dict(index)


def _decumulate_amount_index(
    index: dict[str, dict[int, Decimal]],
) -> dict[str, dict[int, Decimal]]:
    """Convert cumulative monthly amounts to period-specific amounts.

    When trial balance data is uploaded as running totals (cumulative),
    each month N contains the sum from month 1 to N.  This converts to
    period-specific activity: actual_N = cumulative_N - cumulative_(N-1).

    De-cumulated data is correct for both IS and BS computation:
    - IS reads single-month activity directly.
    - BS with **cumulative** TB re-cumulates (sum months 1..fm) to get the balance at that date.
      BS with **non-cumulative** TB uses the closing balance for month ``fm`` only (no sum).
    """
    result: dict[str, dict[int, Decimal]] = {}
    for acct_number, monthly in index.items():
        sorted_months = sorted(monthly.keys())
        decumulated: dict[int, Decimal] = {}
        for i, month in enumerate(sorted_months):
            if i == 0:
                decumulated[month] = monthly[month]
            else:
                prev_month = sorted_months[i - 1]
                decumulated[month] = monthly[month] - monthly[prev_month]
        result[acct_number] = decumulated
    return result


def _build_mapping_index(
    mappings: list[AccountMapping],
) -> dict[str, list[str]]:
    """Build a lookup: link_code -> [account_numbers].

    Only includes mappings with a non-empty link_code.
    """
    index: dict[str, list[str]] = defaultdict(list)
    for mapping in mappings:
        if mapping.link_code:
            index[mapping.link_code].append(mapping.account_number)
    return index


def _mapping_csv_matches_entity(
    field: str | None,
    entity_name: str | None,
    entity_id: uuid.UUID | None,
) -> bool:
    """True if field lists a token equal to the entity name or to the UUID string.

    Le mapping comptable enregistre souvent le nom affiché ; l'ancien écran « mapping standard »
    pouvait enregistrer l'UUID de la division / sous-division.
    """
    if not entity_name and not entity_id:
        return True
    if not field or not str(field).strip():
        return False
    parts = {p.strip() for p in str(field).split(",") if p.strip()}
    if entity_name and entity_name.strip() in parts:
        return True
    if entity_id and str(entity_id) in parts:
        return True
    return False


def _sum_for_link_code_single_month(
    link_code: str | None,
    mapping_index: dict[str, list[str]],
    amount_index: dict[str, dict[int, Decimal]],
    fiscal_month: int,
    division_filter: str | None = None,
    sub_division_filter: str | None = None,
    division_uuid: uuid.UUID | None = None,
    sub_division_uuid: uuid.UUID | None = None,
    mappings_by_account: dict[str, AccountMapping] | None = None,
    customer_filter: str | None = None,
    supplier_filter: str | None = None,
    groupe_index: dict[str, list[str]] | None = None,
    statement_type: str = "balance-sheet",
    dt_ct_by_link_code: dict[str, str] | None = None,
) -> float:
    """Sum trial balance amounts for all accounts matching a link_code for a single fiscal month."""
    if not link_code:
        return 0.0

    account_numbers = _account_numbers_for_single_link_sum(
        str(link_code).strip(), mapping_index, groupe_index, statement_type,
    )
    total = Decimal("0")
    for acct_num in account_numbers:
        if (
            division_filter
            or division_uuid
            or sub_division_filter
            or sub_division_uuid
            or customer_filter
            or supplier_filter
        ) and mappings_by_account:
            mapping = mappings_by_account.get(acct_num)
            if division_filter or division_uuid:
                if not mapping or not _mapping_csv_matches_entity(
                    mapping.divisions, division_filter, division_uuid
                ):
                    continue
            if sub_division_filter or sub_division_uuid:
                if not mapping or not _mapping_csv_matches_entity(
                    mapping.sub_divisions, sub_division_filter, sub_division_uuid
                ):
                    continue
            if mapping:
                if customer_filter and mapping.customer:
                    if customer_filter not in mapping.customer.split(","):
                        continue
                elif customer_filter and not mapping.customer:
                    continue
                if supplier_filter and mapping.supplier:
                    if supplier_filter not in mapping.supplier.split(","):
                        continue
                elif supplier_filter and not mapping.supplier:
                    continue

        monthly = amount_index.get(acct_num, {})
        raw = monthly.get(fiscal_month, Decimal("0"))
        mult = _dt_ct_multiplier_for_account(
            acct_num, mappings_by_account, dt_ct_by_link_code, statement_type
        )
        total += raw * mult
    return float(total)


def _sum_for_link_codes_single_month_aggregate(
    codes: list[str],
    mapping_index: dict[str, list[str]],
    amount_index: dict[str, dict[int, Decimal]],
    fiscal_month: int,
    division_filter: str | None = None,
    sub_division_filter: str | None = None,
    division_uuid: uuid.UUID | None = None,
    sub_division_uuid: uuid.UUID | None = None,
    mappings_by_account: dict[str, AccountMapping] | None = None,
    customer_filter: str | None = None,
    supplier_filter: str | None = None,
    groupe_index: dict[str, list[str]] | None = None,
    statement_type: str = "balance-sheet",
    dt_ct_by_link_code: dict[str, str] | None = None,
) -> float:
    total = 0.0
    for c in codes:
        total += _sum_for_link_code_single_month(
            c,
            mapping_index,
            amount_index,
            fiscal_month,
            division_filter,
            sub_division_filter,
            division_uuid,
            sub_division_uuid,
            mappings_by_account,
            customer_filter,
            supplier_filter,
            groupe_index,
            statement_type,
            dt_ct_by_link_code,
        )
    return total


def _normalize_liaison_mode(row: dict) -> str:
    """na | single | sum | difference — aligné sur le frontend."""
    raw = row.get("liaisonMode")
    if isinstance(raw, str) and raw.strip():
        m = raw.strip().lower()
        if m in ("na", "n/a", "none"):
            return "na"
        if m in ("single", "unique", "code"):
            return "single"
        if m in ("sum", "addition", "add"):
            return "sum"
        if m in ("difference", "subtraction", "subtract"):
            return "difference"
    lc = str(row.get("linkCode") or "").strip()
    if lc:
        return "single"
    sc = row.get("liaisonSumCodes") or []
    if isinstance(sc, list) and any(str(x).strip() for x in sc):
        return "sum"
    nums = row.get("liaisonNumeratorCodes") or []
    dens = row.get("liaisonDenominatorCodes") or []
    if isinstance(nums, list) and any(str(x).strip() for x in nums):
        return "difference"
    if isinstance(dens, list) and any(str(x).strip() for x in dens):
        return "difference"
    return "na"


def _normalize_code_list(val) -> list[str]:
    if not val:
        return []
    if isinstance(val, str):
        s = val.strip()
        return [s] if s else []
    out: list[str] = []
    for x in val:
        s = str(x).strip() if x is not None else ""
        if s:
            out.append(s)
    return out


def _is_structure_row_empty_label(row: dict) -> bool:
    return str(row.get("label") or "").strip() == ""


def _is_structure_row_detail_only(row: dict) -> bool:
    return bool(row.get("detailOnly"))


def _is_code_mapping_enabled(row: dict) -> bool:
    if _is_structure_row_empty_label(row):
        return False
    if bool(row.get("hidden")):
        return False
    if row.get("defineMapping") is False:
        return False
    if row.get("defineMapping") is True:
        return True
    has_link = bool(str(row.get("linkCode") or "").strip())
    has_annex = bool(str(row.get("annexLetter") or "").strip())
    return has_link or has_annex


def _is_show_in_detail(row: dict) -> bool:
    if _is_structure_row_empty_label(row):
        return False
    if bool(row.get("hidden")):
        return False
    if _is_structure_row_detail_only(row):
        return True
    if row.get("showInDetail") is False:
        return False
    if row.get("showInDetail") is True:
        return True
    return _is_code_mapping_enabled(row)


def _normalize_annex_letter(raw) -> str:
    return str(raw or "").strip().upper()[:8]


def _is_group_only_link_code(link_code: str) -> bool:
    t = str(link_code or "").strip()
    return bool(t) and re.fullmatch(r"\d+", t) is not None


def _extract_groupe_prefix_from_composite_link_code(link_code: str) -> str | None:
    t = str(link_code or "").strip()
    if not t:
        return None
    m = re.match(r"^(\d+)", t)
    return m.group(1) if m else None


def _flatten_structure_preorder(rows: list[dict]) -> list[dict]:
    """Ordre parent puis enfants (aligné sur le parcours des états financiers)."""
    out: list[dict] = []
    for row in rows:
        out.append(row)
        ch = row.get("children") or row.get("detailRows") or []
        if isinstance(ch, list) and ch:
            out.extend(_flatten_structure_preorder(ch))
    return out


def _map_annex_letter_to_groupe_link_code(structure_flat: list[dict]) -> dict[str, str]:
    current_groupe: str | None = None
    annex_to_groupe: dict[str, str] = {}
    for row in structure_flat:
        if _is_structure_row_empty_label(row):
            continue
        if bool(row.get("hidden")):
            continue
        if not _is_structure_row_detail_only(row):
            mode = _normalize_liaison_mode(row)
            if mode == "single":
                lc = str(row.get("linkCode") or "").strip()
                if _is_group_only_link_code(lc):
                    current_groupe = lc
            letter = _normalize_annex_letter(row.get("annexLetter"))
            if letter and current_groupe and letter not in annex_to_groupe:
                annex_to_groupe[letter] = current_groupe
        else:
            letter = _normalize_annex_letter(row.get("annexLetter"))
            if letter and current_groupe and letter not in annex_to_groupe:
                annex_to_groupe[letter] = current_groupe
    return annex_to_groupe


def _groupe_for_structure_row_and_code(
    row: dict, code: str, annex_to_groupe: dict[str, str],
) -> str | None:
    letter = _normalize_annex_letter(row.get("annexLetter"))
    if letter:
        g = annex_to_groupe.get(letter)
        if g:
            return g
    mode = _normalize_liaison_mode(row)
    if mode == "single":
        lc = str(row.get("linkCode") or "").strip()
        if _is_group_only_link_code(lc):
            return lc
        return _extract_groupe_prefix_from_composite_link_code(lc)
    return _extract_groupe_prefix_from_composite_link_code(code)


def _map_link_codes_to_groupe_link_codes(structure_flat: list[dict]) -> dict[str, str]:
    """Même périmètre que le frontend `mapLinkCodesToGroupeLinkCodes`."""
    annex_to_groupe = _map_annex_letter_to_groupe_link_code(structure_flat)
    result: dict[str, str] = {}

    def add_code(code: str, row: dict) -> None:
        t = str(code).strip()
        if not t or t in result:
            return
        g = _groupe_for_structure_row_and_code(row, t, annex_to_groupe)
        if g:
            result[t] = g

    for row in structure_flat:
        if _is_structure_row_empty_label(row):
            continue
        if not _is_show_in_detail(row):
            continue
        mode = _normalize_liaison_mode(row)
        if mode == "single":
            add_code(str(row.get("linkCode") or ""), row)
        elif mode == "sum":
            for c in _normalize_code_list(row.get("liaisonSumCodes")):
                add_code(c, row)
        elif mode == "difference":
            for c in _normalize_code_list(row.get("liaisonNumeratorCodes")):
                add_code(c, row)
            for c in _normalize_code_list(row.get("liaisonDenominatorCodes")):
                add_code(c, row)
    return result


def _normalize_dt_ct(raw) -> str | None:
    t = str(raw or "").strip().upper()
    if t in ("DT", "CT"):
        return t
    return None


def _map_link_codes_to_dt_ct(structure_flat: list[dict]) -> dict[str, str]:
    """Même périmètre que le frontend `mapLinkCodesToDtCt` : code de liaison -> DT | CT."""
    result: dict[str, str] = {}

    def add_code(code: str, row: dict) -> None:
        t = str(code).strip()
        if not t or t in result:
            return
        dt = _normalize_dt_ct(row.get("dtCt"))
        if dt:
            result[t] = dt

    for row in structure_flat:
        if _is_structure_row_empty_label(row):
            continue
        if not _is_show_in_detail(row):
            continue
        mode = _normalize_liaison_mode(row)
        if mode == "single":
            add_code(str(row.get("linkCode") or ""), row)
        elif mode == "sum":
            for c in _normalize_code_list(row.get("liaisonSumCodes")):
                add_code(c, row)
        elif mode == "difference":
            for c in _normalize_code_list(row.get("liaisonNumeratorCodes")):
                add_code(c, row)
            for c in _normalize_code_list(row.get("liaisonDenominatorCodes")):
                add_code(c, row)
    return result


def _dt_ct_multiplier_for_account(
    account_number: str,
    mappings_by_account: dict[str, AccountMapping] | None,
    dt_ct_by_link_code: dict[str, str] | None,
    statement_type: str,
) -> Decimal:
    """CR : CT -> -1 sur le montant de balance, sinon 1 (DT ou non défini)."""
    if statement_type != "income-statement" or not dt_ct_by_link_code or not mappings_by_account:
        return Decimal("1")
    m = mappings_by_account.get(account_number)
    if not m or not m.link_code:
        return Decimal("1")
    lc = str(m.link_code).strip()
    if dt_ct_by_link_code.get(lc) == "CT":
        return Decimal("-1")
    return Decimal("1")


def _build_groupe_index(
    mappings: list[AccountMapping], structure_flat: list[dict],
) -> dict[str, list[str]]:
    """groupe (ex. 20) -> [account_numbers] d’après le code de liaison du mapping."""
    link_to_groupe = _map_link_codes_to_groupe_link_codes(structure_flat)
    index: dict[str, list[str]] = defaultdict(list)
    for mapping in mappings:
        if not mapping.link_code:
            continue
        lc = str(mapping.link_code).strip()
        if not lc:
            continue
        g = link_to_groupe.get(lc) or _extract_groupe_prefix_from_composite_link_code(lc)
        if not g:
            continue
        index[g].append(mapping.account_number)
    return dict(index)


def _account_numbers_for_single_link_sum(
    link_code: str,
    mapping_index: dict[str, list[str]],
    groupe_index: dict[str, list[str]] | None,
    statement_type: str,
) -> list[str]:
    lc = str(link_code).strip()
    if statement_type == "income-statement" and groupe_index is not None and _is_group_only_link_code(lc):
        return groupe_index.get(lc, [])
    return mapping_index.get(lc, [])


def _row_suppresses_children_sum(row: dict) -> bool:
    """Ligne qui ne doit pas hériter de la somme des enfants (formule / liaison explicite)."""
    if row.get("formula"):
        return True
    if str(row.get("linkCode") or "").strip():
        return True
    mode = _normalize_liaison_mode(row)
    if mode in ("single", "sum", "difference"):
        return True
    return False


def _sum_for_link_code(
    link_code: str | None,
    mapping_index: dict[str, list[str]],
    amount_index: dict[str, dict[int, Decimal]],
    fiscal_months: list[int],
    division_filter: str | None = None,
    sub_division_filter: str | None = None,
    division_uuid: uuid.UUID | None = None,
    sub_division_uuid: uuid.UUID | None = None,
    mappings_by_account: dict[str, AccountMapping] | None = None,
    customer_filter: str | None = None,
    supplier_filter: str | None = None,
    groupe_index: dict[str, list[str]] | None = None,
    statement_type: str = "balance-sheet",
    dt_ct_by_link_code: dict[str, str] | None = None,
) -> float:
    """Sum trial balance amounts for all accounts matching a link_code across given fiscal months."""
    if not link_code:
        return 0.0

    account_numbers = _account_numbers_for_single_link_sum(
        str(link_code).strip(), mapping_index, groupe_index, statement_type,
    )
    total = Decimal("0")
    for acct_num in account_numbers:
        # Apply division/sub-division/customer/supplier filter if provided
        if (
            division_filter
            or division_uuid
            or sub_division_filter
            or sub_division_uuid
            or customer_filter
            or supplier_filter
        ) and mappings_by_account:
            mapping = mappings_by_account.get(acct_num)
            if division_filter or division_uuid:
                if not mapping or not _mapping_csv_matches_entity(
                    mapping.divisions, division_filter, division_uuid
                ):
                    continue
            if sub_division_filter or sub_division_uuid:
                if not mapping or not _mapping_csv_matches_entity(
                    mapping.sub_divisions, sub_division_filter, sub_division_uuid
                ):
                    continue
            if mapping:
                if customer_filter and mapping.customer:
                    if customer_filter not in mapping.customer.split(","):
                        continue
                elif customer_filter and not mapping.customer:
                    continue
                if supplier_filter and mapping.supplier:
                    if supplier_filter not in mapping.supplier.split(","):
                        continue
                elif supplier_filter and not mapping.supplier:
                    continue

        monthly = amount_index.get(acct_num, {})
        mult = _dt_ct_multiplier_for_account(
            acct_num, mappings_by_account, dt_ct_by_link_code, statement_type
        )
        for fm in fiscal_months:
            total += monthly.get(fm, Decimal("0")) * mult
    return float(total)


def _sum_budget_for_link_code(
    link_code: str | None,
    mapping_index: dict[str, list[str]],
    budget_amount_index: dict[str, dict[int, Decimal]],
    fiscal_months: list[int],
    groupe_index: dict[str, list[str]] | None = None,
    statement_type: str = "balance-sheet",
) -> float:
    """Sum budget amounts for all accounts matching a link_code across given fiscal months."""
    if not link_code:
        return 0.0

    account_numbers = _account_numbers_for_single_link_sum(
        str(link_code).strip(), mapping_index, groupe_index, statement_type,
    )
    total = Decimal("0")
    for acct_num in account_numbers:
        monthly = budget_amount_index.get(acct_num, {})
        for fm in fiscal_months:
            total += monthly.get(fm, Decimal("0"))
    return float(total)


def _sum_for_link_codes_aggregate(
    codes: list[str],
    mapping_index: dict[str, list[str]],
    amount_index: dict[str, dict[int, Decimal]],
    fiscal_months: list[int],
    division_filter: str | None = None,
    sub_division_filter: str | None = None,
    division_uuid: uuid.UUID | None = None,
    sub_division_uuid: uuid.UUID | None = None,
    mappings_by_account: dict[str, AccountMapping] | None = None,
    customer_filter: str | None = None,
    supplier_filter: str | None = None,
    groupe_index: dict[str, list[str]] | None = None,
    statement_type: str = "balance-sheet",
    dt_ct_by_link_code: dict[str, str] | None = None,
) -> float:
    total = 0.0
    for c in codes:
        total += _sum_for_link_code(
            c,
            mapping_index,
            amount_index,
            fiscal_months,
            division_filter,
            sub_division_filter,
            division_uuid,
            sub_division_uuid,
            mappings_by_account,
            customer_filter,
            supplier_filter,
            groupe_index,
            statement_type,
            dt_ct_by_link_code,
        )
    return total


def _sum_budget_for_link_codes_aggregate(
    codes: list[str],
    mapping_index: dict[str, list[str]],
    budget_amount_index: dict[str, dict[int, Decimal]],
    fiscal_months: list[int],
    groupe_index: dict[str, list[str]] | None = None,
    statement_type: str = "balance-sheet",
) -> float:
    total = 0.0
    for c in codes:
        total += _sum_budget_for_link_code(
            c, mapping_index, budget_amount_index, fiscal_months,
            groupe_index, statement_type,
        )
    return total


def _compute_variation(current: float, prior: float) -> float:
    """Compute percentage variation. Returns 0 if prior is 0."""
    if prior == 0:
        return 0.0
    return round(((current - prior) / abs(prior)) * 100, 2)


def _gl_account_single_month_income_statement(
    acct_num: str,
    amount_index: dict[str, dict[int, Decimal]],
    fiscal_month: int,
    division_filter: str | None,
    sub_division_filter: str | None,
    division_uuid: uuid.UUID | None,
    sub_division_uuid: uuid.UUID | None,
    mappings_by_account: dict[str, AccountMapping] | None,
    customer_filter: str | None,
    supplier_filter: str | None,
    dt_ct_by_link_code: dict[str, str] | None,
) -> float:
    """Montant d’un seul compte GL pour un mois fiscal (état des résultats). Aligné sur _sum_for_link_code_single_month."""
    if (
        division_filter
        or division_uuid
        or sub_division_filter
        or sub_division_uuid
        or customer_filter
        or supplier_filter
    ) and mappings_by_account:
        mapping = mappings_by_account.get(acct_num)
        if division_filter or division_uuid:
            if not mapping or not _mapping_csv_matches_entity(
                mapping.divisions, division_filter, division_uuid
            ):
                return 0.0
        if sub_division_filter or sub_division_uuid:
            if not mapping or not _mapping_csv_matches_entity(
                mapping.sub_divisions, sub_division_filter, sub_division_uuid
            ):
                return 0.0
        if mapping:
            if customer_filter and mapping.customer:
                if customer_filter not in mapping.customer.split(","):
                    return 0.0
            elif customer_filter and not mapping.customer:
                return 0.0
            if supplier_filter and mapping.supplier:
                if supplier_filter not in mapping.supplier.split(","):
                    return 0.0
            elif supplier_filter and not mapping.supplier:
                return 0.0

    monthly = amount_index.get(acct_num, {})
    mult = _dt_ct_multiplier_for_account(
        acct_num, mappings_by_account, dt_ct_by_link_code, "income-statement"
    )
    raw = monthly.get(fiscal_month, Decimal("0"))
    return float(raw * mult)


def _gl_account_sum_months_income_statement(
    acct_num: str,
    amount_index: dict[str, dict[int, Decimal]],
    fiscal_months: list[int],
    division_filter: str | None,
    sub_division_filter: str | None,
    division_uuid: uuid.UUID | None,
    sub_division_uuid: uuid.UUID | None,
    mappings_by_account: dict[str, AccountMapping] | None,
    customer_filter: str | None,
    supplier_filter: str | None,
    dt_ct_by_link_code: dict[str, str] | None,
) -> float:
    total = 0.0
    for fm in fiscal_months:
        total += _gl_account_single_month_income_statement(
            acct_num, amount_index, fm,
            division_filter, sub_division_filter, division_uuid, sub_division_uuid,
            mappings_by_account,
            customer_filter, supplier_filter, dt_ct_by_link_code,
        )
    return total


def _income_statement_gl_detail_rows_for_flat_link(
    link_code: str,
    mapping_index: dict[str, list[str]],
    current_amount_index: dict[str, dict[int, Decimal]],
    prior_amount_index: dict[str, dict[int, Decimal]],
    current_months: list[int],
    prior_months: list[int],
    division_filter: str | None,
    sub_division_filter: str | None,
    division_uuid: uuid.UUID | None,
    sub_division_uuid: uuid.UUID | None,
    mappings_by_account: dict[str, AccountMapping] | None,
    customer_filter: str | None,
    supplier_filter: str | None,
    groupe_index: dict[str, list[str]] | None,
    dt_ct_by_link_code: dict[str, str] | None,
) -> list[dict]:
    """Ventilation par compte GL pour une ligne feuille (liaison simple, sans children dans la structure)."""
    accounts = _account_numbers_for_single_link_sum(
        str(link_code).strip(), mapping_index, groupe_index, "income-statement",
    )
    rows: list[dict] = []
    for acct_num in accounts:
        cur = _gl_account_sum_months_income_statement(
            acct_num, current_amount_index, current_months,
            division_filter, sub_division_filter, division_uuid, sub_division_uuid,
            mappings_by_account,
            customer_filter, supplier_filter, dt_ct_by_link_code,
        )
        pri = _gl_account_sum_months_income_statement(
            acct_num, prior_amount_index, prior_months,
            division_filter, sub_division_filter, division_uuid, sub_division_uuid,
            mappings_by_account,
            customer_filter, supplier_filter, dt_ct_by_link_code,
        )
        if cur == 0 and pri == 0:
            continue
        var = _compute_variation(cur, pri)
        label = acct_num
        if mappings_by_account and acct_num in mappings_by_account:
            d = (mappings_by_account[acct_num].description or "").strip()
            if d:
                label = f"{acct_num} — {d}"
        rows.append({
            "id": acct_num,
            "label": label,
            "current": round(cur, 2),
            "prior": round(pri, 2),
            "variation": var,
            "variationAmount": round(cur - pri, 2),
            "isBold": False,
            "isSection": False,
            "isResult": False,
        })
    return rows


def _income_statement_series_gl_detail_rows_for_flat_link(
    link_code: str,
    mapping_index: dict[str, list[str]],
    amount_indices: dict[int, dict[str, dict[int, Decimal]]],
    periods: list[dict],
    division_filter: str | None,
    sub_division_filter: str | None,
    division_uuid: uuid.UUID | None,
    sub_division_uuid: uuid.UUID | None,
    mappings_by_account: dict[str, AccountMapping] | None,
    customer_filter: str | None,
    supplier_filter: str | None,
    groupe_index: dict[str, list[str]] | None,
    dt_ct_by_link_code: dict[str, str] | None,
) -> list[dict]:
    """Séries : ventilation par compte pour une ligne feuille sans children."""
    accounts = _account_numbers_for_single_link_sum(
        str(link_code).strip(), mapping_index, groupe_index, "income-statement",
    )
    rows: list[dict] = []
    for acct_num in accounts:
        amounts: dict[str, float] = {}
        for p in periods:
            fy = p["fiscalYear"]
            fm = p["fiscalMonth"]
            key = f"{fy}-{fm}"
            amt_index = amount_indices.get(fy, {})
            val = _gl_account_single_month_income_statement(
                acct_num, amt_index, fm,
                division_filter, sub_division_filter, division_uuid, sub_division_uuid,
                mappings_by_account,
                customer_filter, supplier_filter, dt_ct_by_link_code,
            )
            amounts[key] = round(val, 2)
        if not any(v != 0 for v in amounts.values()):
            continue
        label = acct_num
        if mappings_by_account and acct_num in mappings_by_account:
            d = (mappings_by_account[acct_num].description or "").strip()
            if d:
                label = f"{acct_num} — {d}"
        rows.append({"id": acct_num, "label": label, "amounts": amounts})
    return rows


def _gl_account_single_month_balance_sheet(
    acct_num: str,
    amount_index: dict[str, dict[int, Decimal]],
    fiscal_month: int,
    division_filter: str | None,
    sub_division_filter: str | None,
    division_uuid: uuid.UUID | None,
    sub_division_uuid: uuid.UUID | None,
    mappings_by_account: dict[str, AccountMapping] | None,
    customer_filter: str | None,
    supplier_filter: str | None,
    dt_ct_by_link_code: dict[str, str] | None,
) -> float:
    if (
        division_filter
        or division_uuid
        or sub_division_filter
        or sub_division_uuid
        or customer_filter
        or supplier_filter
    ) and mappings_by_account:
        mapping = mappings_by_account.get(acct_num)
        if division_filter or division_uuid:
            if not mapping or not _mapping_csv_matches_entity(
                mapping.divisions, division_filter, division_uuid
            ):
                return 0.0
        if sub_division_filter or sub_division_uuid:
            if not mapping or not _mapping_csv_matches_entity(
                mapping.sub_divisions, sub_division_filter, sub_division_uuid
            ):
                return 0.0
        if mapping:
            if customer_filter and mapping.customer:
                if customer_filter not in mapping.customer.split(","):
                    return 0.0
            elif customer_filter and not mapping.customer:
                return 0.0
            if supplier_filter and mapping.supplier:
                if supplier_filter not in mapping.supplier.split(","):
                    return 0.0
            elif supplier_filter and not mapping.supplier:
                return 0.0

    monthly = amount_index.get(acct_num, {})
    mult = _dt_ct_multiplier_for_account(
        acct_num, mappings_by_account, dt_ct_by_link_code, "balance-sheet"
    )
    raw = monthly.get(fiscal_month, Decimal("0"))
    return float(raw * mult)


def _gl_account_sum_months_balance_sheet(
    acct_num: str,
    amount_index: dict[str, dict[int, Decimal]],
    fiscal_months: list[int],
    division_filter: str | None,
    sub_division_filter: str | None,
    division_uuid: uuid.UUID | None,
    sub_division_uuid: uuid.UUID | None,
    mappings_by_account: dict[str, AccountMapping] | None,
    customer_filter: str | None,
    supplier_filter: str | None,
    dt_ct_by_link_code: dict[str, str] | None,
) -> float:
    total = 0.0
    for fm in fiscal_months:
        total += _gl_account_single_month_balance_sheet(
            acct_num, amount_index, fm,
            division_filter, sub_division_filter, division_uuid, sub_division_uuid,
            mappings_by_account,
            customer_filter, supplier_filter, dt_ct_by_link_code,
        )
    return total


def _balance_sheet_gl_detail_rows_for_flat_link(
    link_code: str,
    mapping_index: dict[str, list[str]],
    current_amount_index: dict[str, dict[int, Decimal]],
    prior_amount_index: dict[str, dict[int, Decimal]],
    current_months: list[int],
    prior_months: list[int],
    division_filter: str | None,
    sub_division_filter: str | None,
    division_uuid: uuid.UUID | None,
    sub_division_uuid: uuid.UUID | None,
    mappings_by_account: dict[str, AccountMapping] | None,
    customer_filter: str | None,
    supplier_filter: str | None,
    dt_ct_by_link_code: dict[str, str] | None,
) -> list[dict]:
    accounts = _account_numbers_for_single_link_sum(
        str(link_code).strip(), mapping_index, None, "balance-sheet",
    )
    rows: list[dict] = []
    for acct_num in accounts:
        cur = _gl_account_sum_months_balance_sheet(
            acct_num, current_amount_index, current_months,
            division_filter, sub_division_filter, division_uuid, sub_division_uuid,
            mappings_by_account,
            customer_filter, supplier_filter, dt_ct_by_link_code,
        )
        pri = _gl_account_sum_months_balance_sheet(
            acct_num, prior_amount_index, prior_months,
            division_filter, sub_division_filter, division_uuid, sub_division_uuid,
            mappings_by_account,
            customer_filter, supplier_filter, dt_ct_by_link_code,
        )
        if cur == 0 and pri == 0:
            continue
        var = _compute_variation(cur, pri)
        label = acct_num
        if mappings_by_account and acct_num in mappings_by_account:
            d = (mappings_by_account[acct_num].description or "").strip()
            if d:
                label = f"{acct_num} — {d}"
        rows.append({
            "id": acct_num,
            "label": label,
            "current": round(cur, 2),
            "prior": round(pri, 2),
            "variation": var,
            "variationAmount": round(cur - pri, 2),
            "isBold": False,
            "isSection": False,
            "isResult": False,
        })
    return rows


def _balance_sheet_series_gl_detail_rows_for_flat_link(
    link_code: str,
    mapping_index: dict[str, list[str]],
    amount_indices: dict[int, dict[str, dict[int, Decimal]]],
    periods: list[dict],
    division_filter: str | None,
    sub_division_filter: str | None,
    division_uuid: uuid.UUID | None,
    sub_division_uuid: uuid.UUID | None,
    mappings_by_account: dict[str, AccountMapping] | None,
    customer_filter: str | None,
    supplier_filter: str | None,
    dt_ct_by_link_code: dict[str, str] | None,
    *,
    balance_sheet_cumulative_tb: bool = False,
) -> list[dict]:
    accounts = _account_numbers_for_single_link_sum(
        str(link_code).strip(), mapping_index, None, "balance-sheet",
    )
    rows: list[dict] = []
    for acct_num in accounts:
        amounts: dict[str, float] = {}
        for p in periods:
            fy = p["fiscalYear"]
            fm = p["fiscalMonth"]
            key = f"{fy}-{fm}"
            amt_index = amount_indices.get(fy, {})
            fiscal_months = (
                list(range(1, fm + 1)) if balance_sheet_cumulative_tb else [fm]
            )
            val = _gl_account_sum_months_balance_sheet(
                acct_num, amt_index, fiscal_months,
                division_filter, sub_division_filter, division_uuid, sub_division_uuid,
                mappings_by_account,
                customer_filter, supplier_filter, dt_ct_by_link_code,
            )
            amounts[key] = round(val, 2)
        if not any(v != 0 for v in amounts.values()):
            continue
        label = acct_num
        if mappings_by_account and acct_num in mappings_by_account:
            d = (mappings_by_account[acct_num].description or "").strip()
            if d:
                label = f"{acct_num} — {d}"
        rows.append({"id": acct_num, "label": label, "amounts": amounts})
    return rows


def _structure_row_hidden(row: dict) -> bool:
    """When true, row is omitted from API output but still participates in totals / formulas."""
    return bool(row.get("hidden"))


def _child_row_id(child: dict) -> str:
    link = child.get("linkCode")
    return child.get("id", link or child.get("label", ""))


def _process_structure_rows(
    rows: list[dict],
    mapping_index: dict[str, list[str]],
    current_amount_index: dict[str, dict[int, Decimal]],
    prior_amount_index: dict[str, dict[int, Decimal]],
    current_months: list[int],
    prior_months: list[int],
    division_filter: str | None = None,
    sub_division_filter: str | None = None,
    division_uuid: uuid.UUID | None = None,
    sub_division_uuid: uuid.UUID | None = None,
    mappings_by_account: dict[str, AccountMapping] | None = None,
    budget_amount_index: dict[str, dict[int, Decimal]] | None = None,
    use_budget_as_prior: bool = False,
    computed_values: dict[str, tuple[float, float]] | None = None,
    customer_filter: str | None = None,
    supplier_filter: str | None = None,
    groupe_index: dict[str, list[str]] | None = None,
    statement_type: str = "balance-sheet",
    dt_ct_by_link_code: dict[str, str] | None = None,
) -> list[dict]:
    """Recursively process statement structure rows into computed output rows.

    Each row in the structure JSON can have:
      - label: display label
      - linkCode: single mapping code (mode single)
      - liaisonMode: na | single | sum | difference
      - liaisonSumCodes: list of codes to sum (mode sum)
      - liaisonNumeratorCodes / liaisonDenominatorCodes: lists for num - den (mode difference)
      - hidden: if true, row is excluded from output (still in totals when parent sums children)
      - isBold, isSection, isResult: display flags
      - children: nested rows (detail rows)
      - formula: list of "+id" / "-id" references to other rows for computed results
    """
    if computed_values is None:
        computed_values = {}

    result = []
    for row in rows:
        label = row.get("label", "")
        link_code = row.get("linkCode")
        is_bold = row.get("isBold", False)
        is_section = row.get("isSection", False)
        is_result = row.get("isResult", False)
        children = row.get("children", []) or row.get("detailRows", [])
        formula = row.get("formula")
        row_id = row.get("id", link_code or label)

        current = 0.0
        prior = 0.0

        mode = _normalize_liaison_mode(row)
        if mode == "single":
            lc = str(row.get("linkCode") or "").strip()
            if lc:
                current = _sum_for_link_code(
                    lc, mapping_index, current_amount_index,
                    current_months, division_filter, sub_division_filter,
                    division_uuid, sub_division_uuid,
                    mappings_by_account, customer_filter, supplier_filter,
                    groupe_index, statement_type, dt_ct_by_link_code,
                )
                if use_budget_as_prior and budget_amount_index is not None:
                    prior = _sum_budget_for_link_code(
                        lc, mapping_index, budget_amount_index, current_months,
                        groupe_index, statement_type,
                    )
                else:
                    prior = _sum_for_link_code(
                        lc, mapping_index, prior_amount_index,
                        prior_months, division_filter, sub_division_filter,
                        division_uuid, sub_division_uuid,
                        mappings_by_account, customer_filter, supplier_filter,
                        groupe_index, statement_type, dt_ct_by_link_code,
                    )
        elif mode == "sum":
            codes = _normalize_code_list(row.get("liaisonSumCodes"))
            if codes:
                current = _sum_for_link_codes_aggregate(
                    codes, mapping_index, current_amount_index,
                    current_months, division_filter, sub_division_filter,
                    division_uuid, sub_division_uuid,
                    mappings_by_account, customer_filter, supplier_filter,
                    groupe_index, statement_type, dt_ct_by_link_code,
                )
                if use_budget_as_prior and budget_amount_index is not None:
                    prior = _sum_budget_for_link_codes_aggregate(
                        codes, mapping_index, budget_amount_index, current_months,
                        groupe_index, statement_type,
                    )
                else:
                    prior = _sum_for_link_codes_aggregate(
                        codes, mapping_index, prior_amount_index,
                        prior_months, division_filter, sub_division_filter,
                        division_uuid, sub_division_uuid,
                        mappings_by_account, customer_filter, supplier_filter,
                        groupe_index, statement_type, dt_ct_by_link_code,
                    )
        elif mode == "difference":
            nums = _normalize_code_list(row.get("liaisonNumeratorCodes"))
            dens = _normalize_code_list(row.get("liaisonDenominatorCodes"))
            cur_n = (
                _sum_for_link_codes_aggregate(
                    nums, mapping_index, current_amount_index,
                    current_months, division_filter, sub_division_filter,
                    division_uuid, sub_division_uuid,
                    mappings_by_account, customer_filter, supplier_filter,
                    groupe_index, statement_type, dt_ct_by_link_code,
                )
                if nums
                else 0.0
            )
            cur_d = (
                _sum_for_link_codes_aggregate(
                    dens, mapping_index, current_amount_index,
                    current_months, division_filter, sub_division_filter,
                    division_uuid, sub_division_uuid,
                    mappings_by_account, customer_filter, supplier_filter,
                    groupe_index, statement_type, dt_ct_by_link_code,
                )
                if dens
                else 0.0
            )
            current = cur_n - cur_d
            if use_budget_as_prior and budget_amount_index is not None:
                pri_n = (
                    _sum_budget_for_link_codes_aggregate(
                        nums, mapping_index, budget_amount_index, current_months,
                        groupe_index, statement_type,
                    )
                    if nums
                    else 0.0
                )
                pri_d = (
                    _sum_budget_for_link_codes_aggregate(
                        dens, mapping_index, budget_amount_index, current_months,
                        groupe_index, statement_type,
                    )
                    if dens
                    else 0.0
                )
                prior = pri_n - pri_d
            else:
                pri_n = (
                    _sum_for_link_codes_aggregate(
                        nums, mapping_index, prior_amount_index,
                        prior_months, division_filter, sub_division_filter,
                        division_uuid, sub_division_uuid,
                        mappings_by_account, customer_filter, supplier_filter,
                        groupe_index, statement_type, dt_ct_by_link_code,
                    )
                    if nums
                    else 0.0
                )
                pri_d = (
                    _sum_for_link_codes_aggregate(
                        dens, mapping_index, prior_amount_index,
                        prior_months, division_filter, sub_division_filter,
                        division_uuid, sub_division_uuid,
                        mappings_by_account, customer_filter, supplier_filter,
                        groupe_index, statement_type, dt_ct_by_link_code,
                    )
                    if dens
                    else 0.0
                )
                prior = pri_n - pri_d

        detail_rows = []
        if children:
            detail_rows = _process_structure_rows(
                children, mapping_index,
                current_amount_index, prior_amount_index,
                current_months, prior_months,
                division_filter, sub_division_filter,
                division_uuid, sub_division_uuid,
                mappings_by_account,
                budget_amount_index, use_budget_as_prior,
                computed_values, customer_filter, supplier_filter,
                groupe_index, statement_type, dt_ct_by_link_code,
            )
            # If this is a section row without its own linkCode or formula,
            # sum up the children (include hidden children via computed_values)
            if not _row_suppresses_children_sum(row):
                current = sum(
                    computed_values.get(_child_row_id(c), (0.0, 0.0))[0] for c in children
                )
                prior = sum(
                    computed_values.get(_child_row_id(c), (0.0, 0.0))[1] for c in children
                )
            elif (
                statement_type == "income-statement"
                and mode == "single"
                and str(row.get("linkCode") or "").strip()
                and _is_group_only_link_code(str(row.get("linkCode") or "").strip())
            ):
                # Ligne sommaire « Groupe » (ex. 20) : aligner sur la somme des lignes enfants
                # (même logique que le sous-total Détail / annexe), pas sur l’agrégat plat groupe_index.
                current = sum(
                    computed_values.get(_child_row_id(c), (0.0, 0.0))[0] for c in children
                )
                prior = sum(
                    computed_values.get(_child_row_id(c), (0.0, 0.0))[1] for c in children
                )

        if (
            not detail_rows
            and statement_type == "income-statement"
            and mode == "single"
            and str(row.get("linkCode") or "").strip()
            and not formula
        ):
            detail_rows = _income_statement_gl_detail_rows_for_flat_link(
                str(row.get("linkCode")).strip(),
                mapping_index,
                current_amount_index,
                prior_amount_index,
                current_months,
                prior_months,
                division_filter,
                sub_division_filter,
                division_uuid,
                sub_division_uuid,
                mappings_by_account,
                customer_filter,
                supplier_filter,
                groupe_index,
                dt_ct_by_link_code,
            )
        elif (
            not detail_rows
            and statement_type == "balance-sheet"
            and mode == "single"
            and str(row.get("linkCode") or "").strip()
            and not formula
        ):
            detail_rows = _balance_sheet_gl_detail_rows_for_flat_link(
                str(row.get("linkCode")).strip(),
                mapping_index,
                current_amount_index,
                prior_amount_index,
                current_months,
                prior_months,
                division_filter,
                sub_division_filter,
                division_uuid,
                sub_division_uuid,
                mappings_by_account,
                customer_filter,
                supplier_filter,
                dt_ct_by_link_code,
            )

        # Resolve formula references: e.g. ["+revenue", "-cogs"]
        if formula and isinstance(formula, list):
            current = 0.0
            prior = 0.0
            for ref in formula:
                sign = 1.0 if ref.startswith("+") else -1.0
                ref_id = ref[1:]  # strip the +/- prefix
                ref_cur, ref_pri = computed_values.get(ref_id, (0.0, 0.0))
                current += sign * ref_cur
                prior += sign * ref_pri

        # Store computed values for formula references by later rows
        computed_values[row_id] = (current, prior)

        variation = _compute_variation(current, prior)

        output_row = {
            "id": row_id,
            "label": label,
            "current": round(current, 2),
            "prior": round(prior, 2),
            "variation": variation,
            "variationAmount": round(current - prior, 2),
            "isBold": is_bold,
            "isSection": is_section,
            "isResult": is_result,
            "hasLiaisonCode": _normalize_liaison_mode(row) != "na",
        }
        if "indent" in row:
            output_row["indent"] = bool(row.get("indent"))
        if bool(row.get("separatorAbove")):
            output_row["separatorAbove"] = True
        if bool(row.get("detailOnly")):
            output_row["detailOnly"] = True
        annex_letter = row.get("annexLetter")
        if annex_letter:
            output_row["annexLetter"] = annex_letter
        if detail_rows:
            output_row["detailRows"] = detail_rows

        if not _structure_row_hidden(row):
            result.append(output_row)

    return result


def compute_financial_statement(
    db: Session,
    company: Company,
    statement_type: str,
    fiscal_year: int,
    month: int = 12,
    period: str = "monthly",
    comparison_type: str = "prior_year",
    budget_id: uuid.UUID | None = None,
    division_id: uuid.UUID | None = None,
    sub_division_id: uuid.UUID | None = None,
    customer_filter: str | None = None,
    supplier_filter: str | None = None,
) -> dict:
    """Compute a financial statement.

    Args:
        db: Database session
        company: Company model instance
        statement_type: 'income-statement' or 'balance-sheet'
        fiscal_year: The fiscal year to compute
        month: Fiscal month (1-12)
        period: 'monthly', 'quarterly', 'annual', 'ytd'
        comparison_type: 'prior_year' or 'budget'
        budget_id: Budget to compare against (when comparison_type='budget')
        division_id: Optional division filter
        sub_division_id: Optional sub-division filter

    Returns:
        Dict with rows, metadata
    """
    fy_end_month, _ = _parse_fiscal_year_end(company.fiscal_year_end)

    # 1. Fetch statement structure
    structure = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company.id,
            CompanyStatementStructure.statement_type == statement_type,
        )
        .first()
    )
    if not structure:
        return {
            "companyId": str(company.id),
            "statementType": statement_type,
            "fiscalYear": fiscal_year,
            "month": month,
            "period": period,
            "rows": [],
        }

    # 2. Fetch account mappings
    mappings = (
        db.query(AccountMapping)
        .filter(AccountMapping.company_id == company.id)
        .all()
    )
    mapping_index = _build_mapping_index(mappings)
    mappings_by_account = {m.account_number: m for m in mappings}

    # 3. Resolve division/sub-division UUIDs to names for filtering
    #    AccountMapping.divisions peut contenir des noms ou des UUID (écran mapping standard).
    division_filter = None
    sub_division_filter = None
    division_uuid: uuid.UUID | None = None
    sub_division_uuid: uuid.UUID | None = None
    if division_id:
        division = db.query(Division).filter(Division.id == division_id).first()
        if division:
            division_filter = division.name
            division_uuid = division.id
    if sub_division_id:
        sub_division = db.query(SubDivision).filter(SubDivision.id == sub_division_id).first()
        if sub_division:
            sub_division_filter = sub_division.name
            sub_division_uuid = sub_division.id

    # 4. Determine fiscal months to aggregate
    if statement_type == "balance-sheet":
        current_months = _balance_sheet_months_to_aggregate(month, company.is_cumulative_tb)
    else:
        current_months = _get_months_for_period(period, month, fy_end_month)

    # 5. Build current year amount index (handles calendar boundary + de-cumulation)
    current_amount_index = _build_fiscal_year_data(
        db, company.id, fiscal_year, fy_end_month, company.is_cumulative_tb,
    )

    # 6. Fetch prior period data
    use_budget_as_prior = comparison_type == "budget" and budget_id is not None
    prior_amount_index: dict[str, dict[int, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
    budget_amount_index: dict[str, dict[int, Decimal]] | None = None
    prior_months = current_months  # Default: same month range

    if use_budget_as_prior:
        # Fetch budget entries and build index keyed by account_number
        budget_entries = (
            db.query(BudgetEntry)
            .options(joinedload(BudgetEntry.account))
            .filter(BudgetEntry.budget_id == budget_id)
            .all()
        )
        budget_amount_index = defaultdict(lambda: defaultdict(Decimal))
        for be in budget_entries:
            acct_number = be.account.account_number
            budget_amount_index[acct_number][be.month] += Decimal(str(be.amount))
    elif comparison_type == "lastMonth":
        # Compare to the previous period (month/quarter) — typically same FY
        if period == "monthly":
            if month > 1:
                prior_months = [month - 1]
                prior_amount_index = current_amount_index
            else:
                # FM 1 → compare to FM 12 of prior FY
                prior_months = [12]
                prior_amount_index = _build_fiscal_year_data(
                    db, company.id, fiscal_year - 1, fy_end_month, company.is_cumulative_tb,
                )
        elif period == "quarterly":
            quarter = (month - 1) // 3
            if quarter > 0:
                prior_quarter_end = (quarter - 1) * 3 + 3
                if statement_type == "balance-sheet":
                    prior_months = _balance_sheet_months_to_aggregate(
                        prior_quarter_end, company.is_cumulative_tb
                    )
                else:
                    start = (quarter - 1) * 3 + 1
                    prior_months = list(range(start, start + 3))
                prior_amount_index = current_amount_index
            else:
                # First quarter → compare to Q4 of prior FY (last month = FM 12)
                if statement_type == "balance-sheet":
                    prior_months = _balance_sheet_months_to_aggregate(
                        12, company.is_cumulative_tb
                    )
                else:
                    prior_months = [10, 11, 12]
                prior_amount_index = _build_fiscal_year_data(
                    db, company.id, fiscal_year - 1, fy_end_month, company.is_cumulative_tb,
                )
        else:
            # Annual or other → fall back to prior year
            prior_amount_index = _build_fiscal_year_data(
                db, company.id, fiscal_year - 1, fy_end_month, company.is_cumulative_tb,
            )
    else:
        # "pastMonth" / "prior_year" → same month range, prior fiscal year
        prior_amount_index = _build_fiscal_year_data(
            db, company.id, fiscal_year - 1, fy_end_month, company.is_cumulative_tb,
        )

    groupe_index = None
    dt_ct_by_link_code: dict[str, str] | None = None
    if statement_type == "income-statement":
        struct_list = structure.structure if isinstance(structure.structure, list) else []
        flat = _flatten_structure_preorder(struct_list)
        groupe_index = _build_groupe_index(mappings, flat)
        dt_ct_by_link_code = _map_link_codes_to_dt_ct(flat)

    # 7. Process the structure into computed rows
    rows = _process_structure_rows(
        structure.structure,
        mapping_index,
        current_amount_index,
        prior_amount_index,
        current_months,
        prior_months,
        division_filter,
        sub_division_filter,
        division_uuid,
        sub_division_uuid,
        mappings_by_account,
        budget_amount_index,
        use_budget_as_prior,
        customer_filter=customer_filter,
        supplier_filter=supplier_filter,
        groupe_index=groupe_index,
        statement_type=statement_type,
        dt_ct_by_link_code=dt_ct_by_link_code,
    )

    return {
        "companyId": str(company.id),
        "statementType": statement_type,
        "fiscalYear": fiscal_year,
        "month": month,
        "period": period,
        "comparisonType": comparison_type,
        "rows": rows,
    }


def compute_summary_metrics(
    db: Session,
    company: Company,
    fiscal_year: int,
    month: int = 12,
) -> dict:
    """Compute summary financial metrics for dashboard cards.

    Returns key metrics from income statement and balance sheet.
    """
    income = compute_financial_statement(
        db, company, "income-statement", fiscal_year, month, "ytd",
    )
    balance = compute_financial_statement(
        db, company, "balance-sheet", fiscal_year, month, "annual",
    )

    def _find_row(rows: list[dict], label_contains: str) -> dict | None:
        for row in rows:
            if label_contains.lower() in row.get("label", "").lower():
                return row
            if "detailRows" in row:
                found = _find_row(row["detailRows"], label_contains)
                if found:
                    return found
        return None

    # Extract key metrics
    revenue_row = _find_row(income.get("rows", []), "revenu")
    net_income_row = _find_row(income.get("rows", []), "bénéfice net")
    if not net_income_row:
        net_income_row = _find_row(income.get("rows", []), "résultat net")

    total_assets_row = _find_row(balance.get("rows", []), "total des actifs")
    if not total_assets_row:
        total_assets_row = _find_row(balance.get("rows", []), "total actif")
    if not total_assets_row:
        total_assets_row = _find_row(balance.get("rows", []), "actif total")

    return {
        "fiscalYear": fiscal_year,
        "month": month,
        "revenue": revenue_row["current"] if revenue_row else 0,
        "revenueVariation": revenue_row["variation"] if revenue_row else 0,
        "netIncome": net_income_row["current"] if net_income_row else 0,
        "netIncomeVariation": net_income_row["variation"] if net_income_row else 0,
        "totalAssets": total_assets_row["current"] if total_assets_row else 0,
        "totalAssetsVariation": total_assets_row["variation"] if total_assets_row else 0,
    }


FRENCH_MONTH_ABBREVS = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
    "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
]


def _build_periods(
    fiscal_year: int, months: int, fy_end_month: int,
) -> list[dict]:
    """Build the list of period descriptors for the series response.

    Each period has fiscalYear, fiscalMonth, and a French label like "Avr 2024".
    """
    periods = []
    # For months=12, we want fiscal months 1-12 of fiscal_year.
    # For months=24, we want fiscal months 1-12 of fiscal_year-1, then 1-12 of fiscal_year.
    full_years = months // 12
    remainder = months % 12

    # Build list of (fy, fm) tuples
    fy_fm_pairs = []
    if remainder > 0:
        start_fy = fiscal_year - full_years
        for fm in range(13 - remainder, 13):
            fy_fm_pairs.append((start_fy, fm))
        for y in range(start_fy + 1, fiscal_year + 1):
            for fm in range(1, 13):
                fy_fm_pairs.append((y, fm))
    else:
        for y in range(fiscal_year - full_years + 1, fiscal_year + 1):
            for fm in range(1, 13):
                fy_fm_pairs.append((y, fm))

    for fy, fm in fy_fm_pairs:
        cal_month, year_offset = _fiscal_month_to_calendar(fm, fy_end_month)
        cal_year = fy - 1 + year_offset if fy_end_month != 12 else fy
        label = f"{FRENCH_MONTH_ABBREVS[cal_month - 1]} {cal_year}"
        periods.append({
            "fiscalYear": fy,
            "fiscalMonth": fm,
            "label": label,
        })

    return periods


def _build_periods_from_reference(
    ref_fiscal_year: int,
    ref_fiscal_month: int,
    months: int,
    fy_end_month: int,
) -> list[dict]:
    """Build periods ending at the reference fiscal (year, month).

    Returns a list ordered from oldest -> newest, where the last period is the reference.
    """
    m = max(1, min(12, int(ref_fiscal_month)))
    n = max(1, int(months))
    pairs: list[tuple[int, int]] = []
    fy = int(ref_fiscal_year)
    fm = m
    for _ in range(n):
        pairs.append((fy, fm))
        fm -= 1
        if fm <= 0:
            fy -= 1
            fm = 12
    pairs.reverse()

    periods: list[dict] = []
    for fy, fm in pairs:
        cal_month, year_offset = _fiscal_month_to_calendar(fm, fy_end_month)
        cal_year = fy - 1 + year_offset if fy_end_month != 12 else fy
        label = f"{FRENCH_MONTH_ABBREVS[cal_month - 1]} {cal_year}"
        periods.append({"fiscalYear": fy, "fiscalMonth": fm, "label": label})
    return periods


def _process_structure_rows_series(
    rows: list[dict],
    mapping_index: dict[str, list[str]],
    amount_indices: dict[int, dict[str, dict[int, Decimal]]],
    periods: list[dict],
    statement_type: str,
    division_filter: str | None = None,
    sub_division_filter: str | None = None,
    division_uuid: uuid.UUID | None = None,
    sub_division_uuid: uuid.UUID | None = None,
    mappings_by_account: dict[str, AccountMapping] | None = None,
    computed_values: dict[str, dict[str, float]] | None = None,
    customer_filter: str | None = None,
    supplier_filter: str | None = None,
    groupe_index: dict[str, list[str]] | None = None,
    dt_ct_by_link_code: dict[str, str] | None = None,
    *,
    balance_sheet_cumulative_tb: bool = False,
) -> list[dict]:
    """Process statement structure rows for the series endpoint.

    Instead of computing current/prior, computes the amount for each period.
    For balance-sheet rows: if TB is cumulative, amounts are YTD through that fiscal month
    (sum of de-cumulated months 1..fm); if non-cumulative, each period is the closing balance
    for that fiscal month only.
    Rows with hidden=true are omitted from output but still in computed_values for formulas / parent sums.
    """
    if computed_values is None:
        computed_values = {}

    # Months that actually exist in the TB for each FY (prevents carry-forward on BS)
    available_months_by_fy: dict[int, set[int]] = {}
    if statement_type == "balance-sheet":
        for fy, idx in amount_indices.items():
            s: set[int] = set()
            for monthly in idx.values():
                for k in (monthly or {}).keys():
                    try:
                        s.add(int(k))
                    except (TypeError, ValueError):
                        continue
            available_months_by_fy[fy] = s

    result = []
    for row in rows:
        label = row.get("label", "")
        link_code = row.get("linkCode")
        is_bold = row.get("isBold", False)
        is_section = row.get("isSection", False)
        is_result = row.get("isResult", False)
        children = row.get("children", []) or row.get("detailRows", [])
        formula = row.get("formula")
        row_id = row.get("id", link_code or label)

        amounts: dict[str, float] = {}

        mode = _normalize_liaison_mode(row)
        if mode == "single" and str(row.get("linkCode") or "").strip():
            lc = str(row.get("linkCode") or "").strip()
            for p in periods:
                fy = p["fiscalYear"]
                fm = p["fiscalMonth"]
                key = f"{fy}-{fm}"
                amt_index = amount_indices.get(fy, {})
                if statement_type == "balance-sheet":
                    if fm not in available_months_by_fy.get(fy, set()):
                        amounts[key] = 0.0
                        continue
                    if balance_sheet_cumulative_tb:
                        total = 0.0
                        for m in range(1, fm + 1):
                            total += _sum_for_link_code_single_month(
                                lc, mapping_index, amt_index, m,
                                division_filter, sub_division_filter, division_uuid, sub_division_uuid, mappings_by_account,
                                customer_filter, supplier_filter,
                                groupe_index, statement_type, dt_ct_by_link_code,
                            )
                        amounts[key] = round(total, 2)
                    else:
                        amounts[key] = round(_sum_for_link_code_single_month(
                            lc, mapping_index, amt_index, fm,
                            division_filter, sub_division_filter, division_uuid, sub_division_uuid, mappings_by_account,
                            customer_filter, supplier_filter,
                            groupe_index, statement_type, dt_ct_by_link_code,
                        ), 2)
                else:
                    amounts[key] = round(_sum_for_link_code_single_month(
                        lc, mapping_index, amt_index, fm,
                        division_filter, sub_division_filter, division_uuid, sub_division_uuid, mappings_by_account,
                        customer_filter, supplier_filter,
                        groupe_index, statement_type, dt_ct_by_link_code,
                    ), 2)
        elif mode == "sum":
            codes = _normalize_code_list(row.get("liaisonSumCodes"))
            if codes:
                for p in periods:
                    fy = p["fiscalYear"]
                    fm = p["fiscalMonth"]
                    key = f"{fy}-{fm}"
                    amt_index = amount_indices.get(fy, {})
                    if statement_type == "balance-sheet":
                        if fm not in available_months_by_fy.get(fy, set()):
                            amounts[key] = 0.0
                            continue
                        if balance_sheet_cumulative_tb:
                            total = 0.0
                            for m in range(1, fm + 1):
                                total += _sum_for_link_codes_single_month_aggregate(
                                    codes, mapping_index, amt_index, m,
                                    division_filter, sub_division_filter, division_uuid, sub_division_uuid, mappings_by_account,
                                    customer_filter, supplier_filter,
                                    groupe_index, statement_type, dt_ct_by_link_code,
                                )
                            amounts[key] = round(total, 2)
                        else:
                            amounts[key] = round(_sum_for_link_codes_single_month_aggregate(
                                codes, mapping_index, amt_index, fm,
                                division_filter, sub_division_filter, division_uuid, sub_division_uuid, mappings_by_account,
                                customer_filter, supplier_filter,
                                groupe_index, statement_type, dt_ct_by_link_code,
                            ), 2)
                    else:
                        amounts[key] = round(_sum_for_link_codes_single_month_aggregate(
                            codes, mapping_index, amt_index, fm,
                            division_filter, sub_division_filter, division_uuid, sub_division_uuid, mappings_by_account,
                            customer_filter, supplier_filter,
                            groupe_index, statement_type, dt_ct_by_link_code,
                        ), 2)
        elif mode == "difference":
            nums = _normalize_code_list(row.get("liaisonNumeratorCodes"))
            dens = _normalize_code_list(row.get("liaisonDenominatorCodes"))
            for p in periods:
                fy = p["fiscalYear"]
                fm = p["fiscalMonth"]
                key = f"{fy}-{fm}"
                amt_index = amount_indices.get(fy, {})
                if statement_type == "balance-sheet":
                    if fm not in available_months_by_fy.get(fy, set()):
                        amounts[key] = 0.0
                        continue
                    if balance_sheet_cumulative_tb:
                        total_n = 0.0
                        total_d = 0.0
                        for m in range(1, fm + 1):
                            if nums:
                                total_n += _sum_for_link_codes_single_month_aggregate(
                                    nums, mapping_index, amt_index, m,
                                    division_filter, sub_division_filter, division_uuid, sub_division_uuid, mappings_by_account,
                                    customer_filter, supplier_filter,
                                    groupe_index, statement_type, dt_ct_by_link_code,
                                )
                            if dens:
                                total_d += _sum_for_link_codes_single_month_aggregate(
                                    dens, mapping_index, amt_index, m,
                                    division_filter, sub_division_filter, division_uuid, sub_division_uuid, mappings_by_account,
                                    customer_filter, supplier_filter,
                                    groupe_index, statement_type, dt_ct_by_link_code,
                                )
                        amounts[key] = round(total_n - total_d, 2)
                    else:
                        val_n = (
                            _sum_for_link_codes_single_month_aggregate(
                                nums, mapping_index, amt_index, fm,
                                division_filter, sub_division_filter, division_uuid, sub_division_uuid, mappings_by_account,
                                customer_filter, supplier_filter,
                                groupe_index, statement_type, dt_ct_by_link_code,
                            )
                            if nums
                            else 0.0
                        )
                        val_d = (
                            _sum_for_link_codes_single_month_aggregate(
                                dens, mapping_index, amt_index, fm,
                                division_filter, sub_division_filter, division_uuid, sub_division_uuid, mappings_by_account,
                                customer_filter, supplier_filter,
                                groupe_index, statement_type, dt_ct_by_link_code,
                            )
                            if dens
                            else 0.0
                        )
                        amounts[key] = round(val_n - val_d, 2)
                else:
                    val_n = (
                        _sum_for_link_codes_single_month_aggregate(
                            nums, mapping_index, amt_index, fm,
                            division_filter, sub_division_filter, division_uuid, sub_division_uuid, mappings_by_account,
                            customer_filter, supplier_filter,
                            groupe_index, statement_type, dt_ct_by_link_code,
                        )
                        if nums
                        else 0.0
                    )
                    val_d = (
                        _sum_for_link_codes_single_month_aggregate(
                            dens, mapping_index, amt_index, fm,
                            division_filter, sub_division_filter, division_uuid, sub_division_uuid, mappings_by_account,
                            customer_filter, supplier_filter,
                            groupe_index, statement_type, dt_ct_by_link_code,
                        )
                        if dens
                        else 0.0
                    )
                    amounts[key] = round(val_n - val_d, 2)

        detail_rows = []
        if children:
            detail_rows = _process_structure_rows_series(
                children, mapping_index, amount_indices, periods,
                statement_type, division_filter, sub_division_filter,
                division_uuid, sub_division_uuid,
                mappings_by_account, computed_values,
                customer_filter, supplier_filter, groupe_index,
                dt_ct_by_link_code,
                balance_sheet_cumulative_tb=balance_sheet_cumulative_tb,
            )
            if not _row_suppresses_children_sum(row):
                # Sum children for each period (include hidden children)
                for p in periods:
                    key = f"{p['fiscalYear']}-{p['fiscalMonth']}"
                    amounts[key] = round(sum(
                        computed_values.get(_child_row_id(c), {}).get(key, 0.0)
                        for c in children
                    ), 2)
            elif (
                statement_type == "income-statement"
                and mode == "single"
                and str(row.get("linkCode") or "").strip()
                and _is_group_only_link_code(str(row.get("linkCode") or "").strip())
            ):
                for p in periods:
                    key = f"{p['fiscalYear']}-{p['fiscalMonth']}"
                    amounts[key] = round(sum(
                        computed_values.get(_child_row_id(c), {}).get(key, 0.0)
                        for c in children
                    ), 2)

        if (
            not detail_rows
            and statement_type == "income-statement"
            and mode == "single"
            and str(row.get("linkCode") or "").strip()
            and not (formula and isinstance(formula, list))
        ):
            detail_rows = _income_statement_series_gl_detail_rows_for_flat_link(
                str(row.get("linkCode")).strip(),
                mapping_index,
                amount_indices,
                periods,
                division_filter,
                sub_division_filter,
                division_uuid,
                sub_division_uuid,
                mappings_by_account,
                customer_filter,
                supplier_filter,
                groupe_index,
                dt_ct_by_link_code,
            )
        elif (
            not detail_rows
            and statement_type == "balance-sheet"
            and mode == "single"
            and str(row.get("linkCode") or "").strip()
            and not (formula and isinstance(formula, list))
        ):
            detail_rows = _balance_sheet_series_gl_detail_rows_for_flat_link(
                str(row.get("linkCode")).strip(),
                mapping_index,
                amount_indices,
                periods,
                division_filter,
                sub_division_filter,
                division_uuid,
                sub_division_uuid,
                mappings_by_account,
                customer_filter,
                supplier_filter,
                dt_ct_by_link_code,
                balance_sheet_cumulative_tb=balance_sheet_cumulative_tb,
            )

        # Resolve formula references: e.g. ["+revenue", "-cogs"]
        if formula and isinstance(formula, list):
            amounts = {}
            for p in periods:
                key = f"{p['fiscalYear']}-{p['fiscalMonth']}"
                val = 0.0
                for ref in formula:
                    sign = 1.0 if ref.startswith("+") else -1.0
                    ref_id = ref[1:]
                    ref_amounts = computed_values.get(ref_id, {})
                    val += sign * ref_amounts.get(key, 0.0)
                amounts[key] = round(val, 2)

        # Store for formula references by later rows
        computed_values[row_id] = amounts

        output_row = {
            "id": row_id,
            "label": label,
            "isBold": is_bold,
            "isSection": is_section,
            "isResult": is_result,
            "amounts": amounts,
            "hasLiaisonCode": _normalize_liaison_mode(row) != "na",
        }
        if "indent" in row:
            output_row["indent"] = bool(row.get("indent"))
        if bool(row.get("separatorAbove")):
            output_row["separatorAbove"] = True
        if bool(row.get("detailOnly")):
            output_row["detailOnly"] = True
        annex_letter = row.get("annexLetter")
        if annex_letter:
            output_row["annexLetter"] = annex_letter
        if detail_rows:
            output_row["detailRows"] = [
                {"id": dr["id"], "label": dr["label"], "amounts": dr["amounts"]}
                for dr in detail_rows
            ]

        if not _structure_row_hidden(row):
            result.append(output_row)

    return result


def compute_financial_statement_series(
    db: Session,
    company: Company,
    statement_type: str,
    fiscal_year: int,
    month: int,
    months: int = 12,
    division_id: uuid.UUID | None = None,
    sub_division_id: uuid.UUID | None = None,
    customer_filter: str | None = None,
    supplier_filter: str | None = None,
) -> dict:
    """Compute monthly series data for a financial statement.

    Returns amounts for each row for each month in the range.
    """
    fy_end_month, _ = _parse_fiscal_year_end(company.fiscal_year_end)

    # 1. Fetch statement structure
    structure = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company.id,
            CompanyStatementStructure.statement_type == statement_type,
        )
        .first()
    )
    if not structure:
        return {
            "companyId": str(company.id),
            "statementType": statement_type,
            "fiscalYear": fiscal_year,
            "periods": [],
            "rows": [],
        }

    # 2. Fetch account mappings
    mappings = (
        db.query(AccountMapping)
        .filter(AccountMapping.company_id == company.id)
        .all()
    )
    mapping_index = _build_mapping_index(mappings)
    mappings_by_account = {m.account_number: m for m in mappings}

    # 3. Resolve division/sub-division filters
    division_filter = None
    sub_division_filter = None
    division_uuid: uuid.UUID | None = None
    sub_division_uuid: uuid.UUID | None = None
    if division_id:
        division = db.query(Division).filter(Division.id == division_id).first()
        if division:
            division_filter = division.name
            division_uuid = division.id
    if sub_division_id:
        sub_division = db.query(SubDivision).filter(SubDivision.id == sub_division_id).first()
        if sub_division:
            sub_division_filter = sub_division.name
            sub_division_uuid = sub_division.id

    # 4. Build periods (anchored on reference fiscal year/month)
    periods = _build_periods_from_reference(fiscal_year, month, months, fy_end_month)

    # 5. Determine which fiscal years we need data for
    needed_fiscal_years = set(p["fiscalYear"] for p in periods)

    # 6. Build fiscal-month-keyed amount indices (handles calendar boundary + de-cumulation)
    amount_indices: dict[int, dict[str, dict[int, Decimal]]] = {}
    for fy in needed_fiscal_years:
        amount_indices[fy] = _build_fiscal_year_data(
            db, company.id, fy, fy_end_month, company.is_cumulative_tb,
        )

    # Keep full periods for 12mo/5ans, but computation will output 0 for months with no TB.

    groupe_index = None
    dt_ct_by_link_code: dict[str, str] | None = None
    if statement_type == "income-statement":
        struct_list = structure.structure if isinstance(structure.structure, list) else []
        flat = _flatten_structure_preorder(struct_list)
        groupe_index = _build_groupe_index(mappings, flat)
        dt_ct_by_link_code = _map_link_codes_to_dt_ct(flat)

    # 7. Process structure rows for series
    rows = _process_structure_rows_series(
        structure.structure,
        mapping_index,
        amount_indices,
        periods,
        statement_type,
        division_filter,
        sub_division_filter,
        division_uuid,
        sub_division_uuid,
        mappings_by_account,
        customer_filter=customer_filter,
        supplier_filter=supplier_filter,
        groupe_index=groupe_index,
        dt_ct_by_link_code=dt_ct_by_link_code,
        balance_sheet_cumulative_tb=company.is_cumulative_tb,
    )

    return {
        "companyId": str(company.id),
        "statementType": statement_type,
        "fiscalYear": fiscal_year,
        "periods": periods,
        "rows": rows,
    }


def compute_summary_series(
    db: Session,
    company: Company,
    fiscal_year: int,
) -> dict:
    """Compute summary KPIs for each month of a fiscal year."""
    result_months = []
    for month in range(1, 13):
        metrics = compute_summary_metrics(db, company, fiscal_year, month)
        result_months.append({
            "month": month,
            "revenue": metrics["revenue"],
            "revenueVariation": metrics["revenueVariation"],
            "netIncome": metrics["netIncome"],
            "netIncomeVariation": metrics["netIncomeVariation"],
            "totalAssets": metrics["totalAssets"],
            "totalAssetsVariation": metrics["totalAssetsVariation"],
        })

    return {
        "fiscalYear": fiscal_year,
        "months": result_months,
    }
