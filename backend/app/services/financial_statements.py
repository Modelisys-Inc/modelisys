"""Financial statement computation service.

Takes trial balance entries, statement structure, and account mappings,
then computes the full financial statement (income statement or balance sheet)
with current period, prior period, and variation columns.
"""

import uuid
from collections import defaultdict
from decimal import Decimal

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


def _build_amount_index(
    entries: list[TrialBalanceEntry],
) -> dict[str, dict[int, Decimal]]:
    """Build a lookup: account_number -> {month: amount}.

    We key by account_number (via the entry's account relationship)
    so we can match against AccountMapping.account_number.
    """
    index: dict[str, dict[int, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
    for entry in entries:
        acct_number = entry.account.account_number
        index[acct_number][entry.month] += Decimal(str(entry.amount))
    return index


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


def _sum_for_link_code_single_month(
    link_code: str | None,
    mapping_index: dict[str, list[str]],
    amount_index: dict[str, dict[int, Decimal]],
    fiscal_month: int,
    division_filter: str | None = None,
    sub_division_filter: str | None = None,
    mappings_by_account: dict[str, AccountMapping] | None = None,
) -> float:
    """Sum trial balance amounts for all accounts matching a link_code for a single fiscal month."""
    if not link_code:
        return 0.0

    account_numbers = mapping_index.get(link_code, [])
    total = Decimal("0")
    for acct_num in account_numbers:
        if (division_filter or sub_division_filter) and mappings_by_account:
            mapping = mappings_by_account.get(acct_num)
            if mapping:
                if division_filter and mapping.divisions:
                    if division_filter not in mapping.divisions:
                        continue
                if sub_division_filter and mapping.sub_divisions:
                    if sub_division_filter not in mapping.sub_divisions:
                        continue

        monthly = amount_index.get(acct_num, {})
        total += monthly.get(fiscal_month, Decimal("0"))
    return float(total)


def _sum_for_link_code(
    link_code: str | None,
    mapping_index: dict[str, list[str]],
    amount_index: dict[str, dict[int, Decimal]],
    fiscal_months: list[int],
    division_filter: str | None = None,
    sub_division_filter: str | None = None,
    mappings_by_account: dict[str, AccountMapping] | None = None,
) -> float:
    """Sum trial balance amounts for all accounts matching a link_code across given fiscal months."""
    if not link_code:
        return 0.0

    account_numbers = mapping_index.get(link_code, [])
    total = Decimal("0")
    for acct_num in account_numbers:
        # Apply division/sub-division filter if provided
        if (division_filter or sub_division_filter) and mappings_by_account:
            mapping = mappings_by_account.get(acct_num)
            if mapping:
                if division_filter and mapping.divisions:
                    if division_filter not in mapping.divisions:
                        continue
                if sub_division_filter and mapping.sub_divisions:
                    if sub_division_filter not in mapping.sub_divisions:
                        continue

        monthly = amount_index.get(acct_num, {})
        for fm in fiscal_months:
            total += monthly.get(fm, Decimal("0"))
    return float(total)


def _sum_budget_for_link_code(
    link_code: str | None,
    mapping_index: dict[str, list[str]],
    budget_amount_index: dict[str, dict[int, Decimal]],
    fiscal_months: list[int],
) -> float:
    """Sum budget amounts for all accounts matching a link_code across given fiscal months."""
    if not link_code:
        return 0.0

    account_numbers = mapping_index.get(link_code, [])
    total = Decimal("0")
    for acct_num in account_numbers:
        monthly = budget_amount_index.get(acct_num, {})
        for fm in fiscal_months:
            total += monthly.get(fm, Decimal("0"))
    return float(total)


def _compute_variation(current: float, prior: float) -> float:
    """Compute percentage variation. Returns 0 if prior is 0."""
    if prior == 0:
        return 0.0
    return round(((current - prior) / abs(prior)) * 100, 2)


def _process_structure_rows(
    rows: list[dict],
    mapping_index: dict[str, list[str]],
    current_amount_index: dict[str, dict[int, Decimal]],
    prior_amount_index: dict[str, dict[int, Decimal]],
    current_months: list[int],
    prior_months: list[int],
    division_filter: str | None = None,
    sub_division_filter: str | None = None,
    mappings_by_account: dict[str, AccountMapping] | None = None,
    budget_amount_index: dict[str, dict[int, Decimal]] | None = None,
    use_budget_as_prior: bool = False,
    computed_values: dict[str, tuple[float, float]] | None = None,
) -> list[dict]:
    """Recursively process statement structure rows into computed output rows.

    Each row in the structure JSON can have:
      - label: display label
      - linkCode: code linking to account mappings
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
        children = row.get("children", [])
        formula = row.get("formula")
        row_id = row.get("id", link_code or label)

        current = 0.0
        prior = 0.0

        if link_code:
            current = _sum_for_link_code(
                link_code, mapping_index, current_amount_index,
                current_months, division_filter, sub_division_filter,
                mappings_by_account,
            )
            if use_budget_as_prior and budget_amount_index is not None:
                prior = _sum_budget_for_link_code(
                    link_code, mapping_index, budget_amount_index, current_months,
                )
            else:
                prior = _sum_for_link_code(
                    link_code, mapping_index, prior_amount_index,
                    prior_months, division_filter, sub_division_filter,
                    mappings_by_account,
                )

        detail_rows = []
        if children:
            detail_rows = _process_structure_rows(
                children, mapping_index,
                current_amount_index, prior_amount_index,
                current_months, prior_months,
                division_filter, sub_division_filter,
                mappings_by_account,
                budget_amount_index, use_budget_as_prior,
                computed_values,
            )
            # If this is a section row without its own linkCode or formula,
            # sum up the children
            if not link_code and not formula:
                current = sum(r["current"] for r in detail_rows)
                prior = sum(r["prior"] for r in detail_rows)

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
        }
        if detail_rows:
            output_row["detailRows"] = detail_rows

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
    #    AccountMapping.divisions stores comma-separated division names (not UUIDs)
    division_filter = None
    sub_division_filter = None
    if division_id:
        division = db.query(Division).filter(Division.id == division_id).first()
        if division:
            division_filter = division.name
    if sub_division_id:
        sub_division = db.query(SubDivision).filter(SubDivision.id == sub_division_id).first()
        if sub_division:
            sub_division_filter = sub_division.name

    # 4. Determine fiscal months to aggregate
    current_months = _get_months_for_period(period, month, fy_end_month)

    # For balance sheet, always use cumulative (YTD) through the requested month
    if statement_type == "balance-sheet":
        current_months = list(range(1, month + 1))

    # 5. Fetch current year trial balance entries (eager load accounts)
    current_entries = (
        db.query(TrialBalanceEntry)
        .options(joinedload(TrialBalanceEntry.account))
        .filter(
            TrialBalanceEntry.company_id == company.id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
        )
        .all()
    )
    current_amount_index = _build_amount_index(current_entries)

    # 6. Fetch prior period data
    use_budget_as_prior = comparison_type == "budget" and budget_id is not None
    prior_amount_index: dict[str, dict[int, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
    budget_amount_index: dict[str, dict[int, Decimal]] | None = None

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
    else:
        # Prior year
        prior_year = fiscal_year - 1
        prior_entries = (
            db.query(TrialBalanceEntry)
            .options(joinedload(TrialBalanceEntry.account))
            .filter(
                TrialBalanceEntry.company_id == company.id,
                TrialBalanceEntry.fiscal_year == prior_year,
            )
            .all()
        )
        prior_amount_index = _build_amount_index(prior_entries)

    prior_months = current_months  # Same month range, different year/budget

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
        mappings_by_account,
        budget_amount_index,
        use_budget_as_prior,
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


def _process_structure_rows_series(
    rows: list[dict],
    mapping_index: dict[str, list[str]],
    amount_indices: dict[int, dict[str, dict[int, Decimal]]],
    periods: list[dict],
    statement_type: str,
    division_filter: str | None = None,
    sub_division_filter: str | None = None,
    mappings_by_account: dict[str, AccountMapping] | None = None,
    computed_values: dict[str, dict[str, float]] | None = None,
) -> list[dict]:
    """Process statement structure rows for the series endpoint.

    Instead of computing current/prior, computes the amount for each period.
    For balance-sheet rows, amounts are cumulative (YTD through that fiscal month).
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
        children = row.get("children", [])
        formula = row.get("formula")
        row_id = row.get("id", link_code or label)

        amounts: dict[str, float] = {}

        if link_code:
            for p in periods:
                fy = p["fiscalYear"]
                fm = p["fiscalMonth"]
                key = f"{fy}-{fm}"
                amt_index = amount_indices.get(fy, {})
                if statement_type == "balance-sheet":
                    # Cumulative YTD for balance sheet
                    total = 0.0
                    for m in range(1, fm + 1):
                        total += _sum_for_link_code_single_month(
                            link_code, mapping_index, amt_index, m,
                            division_filter, sub_division_filter, mappings_by_account,
                        )
                    amounts[key] = round(total, 2)
                else:
                    amounts[key] = round(_sum_for_link_code_single_month(
                        link_code, mapping_index, amt_index, fm,
                        division_filter, sub_division_filter, mappings_by_account,
                    ), 2)

        detail_rows = []
        if children:
            detail_rows = _process_structure_rows_series(
                children, mapping_index, amount_indices, periods,
                statement_type, division_filter, sub_division_filter,
                mappings_by_account, computed_values,
            )
            if not link_code and not formula:
                # Sum children for each period
                for p in periods:
                    key = f"{p['fiscalYear']}-{p['fiscalMonth']}"
                    amounts[key] = round(sum(
                        dr["amounts"].get(key, 0.0) for dr in detail_rows
                    ), 2)

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
        }
        if detail_rows:
            output_row["detailRows"] = [
                {"id": dr["id"], "label": dr["label"], "amounts": dr["amounts"]}
                for dr in detail_rows
            ]

        result.append(output_row)

    return result


def compute_financial_statement_series(
    db: Session,
    company: Company,
    statement_type: str,
    fiscal_year: int,
    months: int = 12,
    division_id: uuid.UUID | None = None,
    sub_division_id: uuid.UUID | None = None,
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
    if division_id:
        division = db.query(Division).filter(Division.id == division_id).first()
        if division:
            division_filter = division.name
    if sub_division_id:
        sub_division = db.query(SubDivision).filter(SubDivision.id == sub_division_id).first()
        if sub_division:
            sub_division_filter = sub_division.name

    # 4. Build periods
    periods = _build_periods(fiscal_year, months, fy_end_month)

    # 5. Determine which fiscal years we need data for
    needed_fiscal_years = set(p["fiscalYear"] for p in periods)

    # 6. Fetch trial balance entries for all needed fiscal years, build per-year indices
    amount_indices: dict[int, dict[str, dict[int, Decimal]]] = {}
    for fy in needed_fiscal_years:
        entries = (
            db.query(TrialBalanceEntry)
            .options(joinedload(TrialBalanceEntry.account))
            .filter(
                TrialBalanceEntry.company_id == company.id,
                TrialBalanceEntry.fiscal_year == fy,
            )
            .all()
        )
        amount_indices[fy] = _build_amount_index(entries)

    # 7. Process structure rows for series
    rows = _process_structure_rows_series(
        structure.structure,
        mapping_index,
        amount_indices,
        periods,
        statement_type,
        division_filter,
        sub_division_filter,
        mappings_by_account,
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
