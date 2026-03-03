"""Compute projected financial summary metrics from stored assumptions."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.forecast_config import ForecastConfig
from app.models.projection import Loan, Projection
from app.services.financial_statements import compute_financial_statement


def _flatten_rows(rows: list[dict]) -> list[dict]:
    """Recursively flatten IS rows including detailRows."""
    result: list[dict] = []
    for row in rows:
        result.append(row)
        if "detailRows" in row:
            result.extend(_flatten_rows(row["detailRows"]))
    return result


def _load_forecast_config(
    db: Session,
    organization_id: uuid.UUID,
    company_id: uuid.UUID,
    projection_id: uuid.UUID,
    config_type: str,
) -> dict:
    """Load ForecastConfig data for a given projection and config_type. Returns {} if not found."""
    cfg = (
        db.query(ForecastConfig)
        .filter(
            ForecastConfig.organization_id == organization_id,
            ForecastConfig.company_id == company_id,
            ForecastConfig.projection_id == projection_id,
            ForecastConfig.config_type == config_type,
        )
        .first()
    )
    return cfg.data if cfg else {}


def _annual_loan_payment(loan: Loan) -> float:
    """Compute annual debt service for a loan."""
    if loan.payment_amount:
        return float(loan.payment_amount) * 12

    principal = float(loan.principal)
    annual_rate = float(loan.interest_rate) / 100
    n_months = int(loan.remaining_payments)

    if n_months == 0:
        return 0.0
    if annual_rate == 0:
        return (principal / n_months) * 12
    r = annual_rate / 12
    monthly_pmt = principal * r * (1 + r) ** n_months / ((1 + r) ** n_months - 1)
    return monthly_pmt * 12


def _depreciation_for_year(additions: list[dict], year_index: int) -> float:
    """Compute straight-line depreciation for year_index (1-based) from capex additions."""
    total = 0.0
    for item in additions:
        addition_year = int(item.get("yearIndex", 0)) + 1  # 0-based -> 1-based
        amount = float(item.get("amount", 0))
        useful_life = int(item.get("usefulLife", 1)) or 1
        if addition_year <= year_index <= addition_year + useful_life - 1:
            total += amount / useful_life
    return total


def _apply_revenue_adjustments(base: float, adjustments: list[dict]) -> float:
    """Apply revenue adjustments to a base amount. Supports growthPercent and absolute amount types."""
    result = base
    for adj in adjustments:
        adj_type = adj.get("type", "")
        if adj_type == "growthPercent":
            result = result * (1 + float(adj.get("value", 0)) / 100)
        elif adj_type == "amount":
            result += float(adj.get("value", 0))
    return result


def _apply_expense_adjustments(inflated_amount: float, adjustments: list[dict]) -> float:
    """Apply expense adjustments to an already-inflated amount.

    Percentage adjustments are computed against the original inflated_amount
    (not the running total), so multiple percentage adjustments are additive
    relative to the same base.
    """
    result = inflated_amount
    for adj in adjustments:
        adj_type = adj.get("type", "")
        if adj_type == "amount":
            result += float(adj.get("amount", 0))
        elif adj_type == "percentage":
            result += inflated_amount * float(adj.get("percentage", 0)) / 100
    return result


class ProjectionComputeService:
    """Compute projected financial summary metrics for all years of a projection.

    Simplifications (V1):
    - Revenue per year is read directly from revenueValues overrides or the base IS amount,
      with per-year adjustments applied independently (not compounded from prior year).
    - Tax is applied to EBIT (not EBT); interest expense is not deducted before tax.
    - Debt service is pro-rated by months active in each year.
    - Working capital change is not included in free cash flow.
    - Rows with zero base IS value and no revenueValues override are excluded;
      for companies with no historical data, all metrics will be zero.
    """
    TAX_RATE = 0.27  # Canadian combined federal + provincial

    @classmethod
    def compute(
        cls,
        db: Session,
        company: Company,
        projection: Projection,
        base_fiscal_year: int,
    ) -> dict:
        """Compute projected summary metrics for all years.

        Returns a dict matching ProjectionComputeResult schema.
        """
        org_id = company.organization_id
        proj_id = projection.id
        projection_years = projection.projection_years

        # 1. Base IS (annual, full year)
        base_is = compute_financial_statement(
            db, company, "income-statement", base_fiscal_year,
            month=12, period="annual",
        )
        all_rows = _flatten_rows(base_is.get("rows", []))

        # 2. Load ForecastConfig blobs
        is_config = _load_forecast_config(db, org_id, company.id, proj_id, "income-statement-detail")
        capex_config = _load_forecast_config(db, org_id, company.id, proj_id, "capex-forecast")

        revenue_values: dict = is_config.get("revenueValues", {})
        revenue_adjustments: dict = is_config.get("revenueAdjustments", {})
        expense_types: dict = is_config.get("expenseTypes", {})
        global_inflation: float = float(is_config.get("inflationRate", 0))
        variable_rates: dict = is_config.get("variableRates", {})
        specific_inflation_rates: dict = is_config.get("specificInflationRates", {})
        expense_adjustments: dict = is_config.get("expenseAdjustments", {})
        capex_additions: list = capex_config.get("additions", [])

        # 3. Load loans
        loans = db.query(Loan).filter(Loan.projection_id == proj_id).all()

        # 4. Classify IS rows: revenue (positive current) vs expense (negative current).
        # isSection rows are section headers (sum of children, already counted in children).
        # isResult rows are formula-computed totals (e.g. net income). Both are excluded
        # to prevent double-counting. Rows with current == 0 are also excluded; for
        # companies with no historical trial balance, all metrics will be zero.
        revenue_rows = [
            r for r in all_rows
            if not r.get("isSection") and not r.get("isResult")
            and float(r.get("current", 0)) > 0
        ]
        expense_rows = [
            r for r in all_rows
            if not r.get("isSection") and not r.get("isResult")
            and float(r.get("current", 0)) < 0
        ]

        # 5. Compute per-year results
        years = []
        for y in range(1, projection_years + 1):
            year_idx = y - 1  # 0-based index used in ForecastConfig keys

            # Revenue
            total_revenue = 0.0
            for row in revenue_rows:
                row_id = row["id"]
                key = f"{row_id}-{year_idx}"
                base = float(revenue_values[key]) if key in revenue_values else float(row.get("current", 0))
                adjs = revenue_adjustments.get(key, [])
                base = _apply_revenue_adjustments(base, adjs)
                total_revenue += base

            # Expenses (stored as negative in IS, work with positive amounts)
            total_expenses = 0.0
            for row in expense_rows:
                row_id = row["id"]
                key = f"{row_id}-{year_idx}"
                base_amount = abs(float(row.get("current", 0)))
                exp_type = expense_types.get(row_id, "fixe")

                if exp_type == "variable":
                    rate = float(variable_rates.get(row_id, 0)) / 100
                    amount = rate * total_revenue
                else:
                    row_inflation = float(specific_inflation_rates.get(row_id, global_inflation)) / 100
                    amount = base_amount * (1 + row_inflation) ** y

                adjs = expense_adjustments.get(key, [])
                amount = _apply_expense_adjustments(amount, adjs)
                total_expenses += amount

            # EBITDA
            ebitda = total_revenue - total_expenses

            # CapEx + Depreciation
            capex = sum(
                float(a.get("amount", 0))
                for a in capex_additions
                if int(a.get("yearIndex", 0)) + 1 == y
            )
            depreciation = _depreciation_for_year(capex_additions, y)

            # EBIT
            ebit = ebitda - depreciation

            # Net income
            tax = ebit * cls.TAX_RATE if ebit > 0 else 0.0
            net_income = ebit - tax

            # Debt service (pro-rated by actual months active in this year)
            debt_service = 0.0
            for loan in loans:
                start_month = int(loan.start_month or 0)
                loan_total_months = int(loan.remaining_payments or 0)
                loan_end_month = start_month + loan_total_months - 1
                year_start_month = (y - 1) * 12
                year_end_month = y * 12 - 1
                # Find overlap between loan active period and this projection year
                active_start = max(start_month, year_start_month)
                active_end = min(loan_end_month, year_end_month)
                if active_end >= active_start:
                    active_months = active_end - active_start + 1
                    monthly_pmt = _annual_loan_payment(loan) / 12
                    debt_service += monthly_pmt * active_months

            # Free cash flow
            tax_on_ebit = ebit * cls.TAX_RATE if ebit > 0 else 0.0
            free_cash_flow = ebitda - tax_on_ebit - capex

            ebitda_margin = (ebitda / total_revenue * 100) if total_revenue != 0 else 0.0
            years.append({
                "year_index": y,
                "fiscal_year": base_fiscal_year + y,
                "total_revenue": round(total_revenue, 2),
                "total_expenses": round(total_expenses, 2),
                "ebitda": round(ebitda, 2),
                "ebitda_margin": round(ebitda_margin, 2),
                "depreciation": round(depreciation, 2),
                "ebit": round(ebit, 2),
                "net_income": round(net_income, 2),
                "capex": round(capex, 2),
                "debt_service": round(debt_service, 2),
                "free_cash_flow": round(free_cash_flow, 2),
            })

        return {
            "projection_id": str(proj_id),
            "projection_name": projection.name,
            "base_fiscal_year": base_fiscal_year,
            "projection_years": projection_years,
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "years": years,
        }
