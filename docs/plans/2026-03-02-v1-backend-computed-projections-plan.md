# V1 Backend-Computed Projections — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the broken scenarios comparison page and isolate projection assumptions per scenario by adding backend-computed projection results.

**Architecture:** Add `projection_id` FK to `forecast_configs`, build a `ProjectionComputeService` that reads base IS + ForecastConfig assumptions and returns per-year summary metrics, expose via `GET /projections/{id}/compute`, fix `scenarios/page.tsx` to call it.

**Tech Stack:** FastAPI / SQLAlchemy 2.0 (sync) / Alembic / Pydantic v2 / Next.js App Router / TypeScript / Recharts

---

## Before You Start

### Project layout

```
backend/
  app/
    models/forecast_config.py      # ForecastConfig ORM model
    schemas/forecast_config.py     # Pydantic schemas
    schemas/projection.py          # Pydantic schemas for projections
    routers/forecast_configs.py    # REST endpoints
    routers/projections.py         # REST endpoints
    services/financial_statements.py  # compute_financial_statement()
    services/projection_compute.py    # NEW — computation service
  alembic/versions/                # migrations 001..005 exist; next is 006
  tests/
    test_forecast_configs.py
    test_projections.py
frontend/
  lib/api.ts                       # apiFetch + all typed API functions
  components/
    income-statement-detail.tsx
    capex-forecast-detail.tsx
    fdr-forecast-detail.tsx
    debt-forecast-detail.tsx
    base-seasonality-detail.tsx
  app/
    projections/pro-forma/page.tsx
    scenarios/page.tsx
```

### Running tests

```bash
# Backend (from repo root)
cd backend && python -m pytest -x -q

# Frontend e2e (app must be running on localhost:3000)
cd frontend && pnpm test:e2e
```

### Key facts

- `ForecastConfig.config_type = "income-statement-detail"` stores all projection assumptions in a single JSON blob (keys: `revenueValues`, `revenueAdjustments`, `expenseTypes`, `inflationRate`, `variableRates`, `specificInflationRates`, `expenseAdjustments`)
- `revenueValues` key format: `"rowId-yearIdx"` where yearIdx is 0-based (year 1 = index 0)
- `revenueAdjustments` key format: same `"rowId-yearIdx"`, value is an array of `{type: "growthPercent", value: number}`
- `expenseAdjustments` key format: `"rowId-yearIdx"`, value is array of `{type: "amount"|"percentage", amount?, percentage?, isRecurring}`
- `compute_financial_statement(db, company, "income-statement", fiscal_year, month=12, period="annual")` returns `{rows: [{id, label, current, prior, isSection, isResult, detailRows?}]}`
- Row `id` in the IS response matches the `rowId` keys in ForecastConfig data
- Backend uses **sync** SQLAlchemy sessions (not async) — never use `await` in service code
- Migration numbering: `006_...py`

---

## Task 1: DB Migration — add `projection_id` to `forecast_configs`

**Files:**
- Create: `backend/alembic/versions/006_add_projection_id_to_forecast_configs.py`

**Step 1: Write the migration file**

```python
"""Add projection_id to forecast_configs

Revision ID: 006
Revises: 005
Create Date: 2026-03-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "forecast_configs",
        sa.Column(
            "projection_id",
            UUID(as_uuid=True),
            sa.ForeignKey("projections.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_forecast_configs_projection_id",
        "forecast_configs",
        ["projection_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_forecast_configs_projection_id", table_name="forecast_configs")
    op.drop_column("forecast_configs", "projection_id")
```

**Step 2: Verify the migration runs against the running Postgres container**

```bash
cd backend
alembic upgrade head
```

Expected: `Running upgrade 005 -> 006, Add projection_id to forecast_configs`

**Step 3: Commit**

```bash
git add backend/alembic/versions/006_add_projection_id_to_forecast_configs.py
git commit -m "feat: migration 006 — add projection_id to forecast_configs"
```

---

## Task 2: Update `ForecastConfig` ORM model

**Files:**
- Modify: `backend/app/models/forecast_config.py`

**Step 1: Add the field**

In `class ForecastConfig`, add after `sub_division_id`:

```python
projection_id: Mapped[uuid.UUID | None] = mapped_column(
    UUID(as_uuid=True),
    ForeignKey("projections.id", ondelete="CASCADE"),
    nullable=True,
    index=True,
)
```

Also update `__table_args__` to keep the existing index (don't remove it):

```python
__table_args__ = (
    Index(
        "ix_forecast_configs_org_company_type",
        "organization_id", "company_id", "config_type",
    ),
)
```

The `index=True` on the column creates `ix_forecast_configs_projection_id` automatically via SQLAlchemy (matches the Alembic migration name).

**Step 2: Run backend tests to confirm no breakage**

```bash
cd backend && python -m pytest tests/test_forecast_configs.py -x -q
```

Expected: all tests pass.

**Step 3: Commit**

```bash
git add backend/app/models/forecast_config.py
git commit -m "feat: add projection_id field to ForecastConfig model"
```

---

## Task 3: Update ForecastConfig schema + router

**Files:**
- Modify: `backend/app/schemas/forecast_config.py`
- Modify: `backend/app/routers/forecast_configs.py`

### Schema changes

Add `projection_id: uuid.UUID | None = None` to **both** `ForecastConfigUpsert` and `ForecastConfigResponse`:

```python
class ForecastConfigUpsert(BaseModel):
    config_type: str
    data: dict
    company_id: uuid.UUID | None = None
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None
    projection_id: uuid.UUID | None = None   # ← new


class ForecastConfigResponse(BaseModel):
    id: uuid.UUID
    config_type: str
    data: dict
    company_id: uuid.UUID | None = None
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None
    projection_id: uuid.UUID | None = None   # ← new
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

### Router changes (`routers/forecast_configs.py`)

**`list_forecast_configs`** — add `projection_id` query param and filter:

```python
@router.get("/forecast-configs", response_model=ForecastConfigListResponse)
def list_forecast_configs(
    company_id: uuid.UUID,
    config_type: str | None = Query(default=None),
    division_id: uuid.UUID | None = Query(default=None),
    sub_division_id: uuid.UUID | None = Query(default=None),
    projection_id: uuid.UUID | None = Query(default=None),   # ← new
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    query = db.query(ForecastConfig).filter(
        ForecastConfig.organization_id == company.organization_id,
        ForecastConfig.company_id == company_id,
    )
    if config_type:
        query = query.filter(ForecastConfig.config_type == config_type)
    if division_id:
        query = query.filter(ForecastConfig.division_id == division_id)
    if sub_division_id:
        query = query.filter(ForecastConfig.sub_division_id == sub_division_id)
    if projection_id:                                          # ← new
        query = query.filter(ForecastConfig.projection_id == projection_id)
    configs = query.order_by(ForecastConfig.config_type).all()
    return ForecastConfigListResponse(configs=configs)
```

**`upsert_forecast_config`** — add `projection_id` to match key and insert:

```python
@router.put("/forecast-configs", response_model=ForecastConfigResponse)
def upsert_forecast_config(
    company_id: uuid.UUID,
    request: ForecastConfigUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)

    existing = (
        db.query(ForecastConfig)
        .filter(
            ForecastConfig.organization_id == company.organization_id,
            ForecastConfig.company_id == company_id,
            ForecastConfig.config_type == request.config_type,
            ForecastConfig.division_id == request.division_id,
            ForecastConfig.sub_division_id == request.sub_division_id,
            ForecastConfig.projection_id == request.projection_id,   # ← new
        )
        .first()
    )

    if existing:
        existing.data = request.data
        db.commit()
        db.refresh(existing)
        return existing
    else:
        config = ForecastConfig(
            organization_id=company.organization_id,
            company_id=company_id,
            division_id=request.division_id,
            sub_division_id=request.sub_division_id,
            config_type=request.config_type,
            data=request.data,
            projection_id=request.projection_id,   # ← new
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        return config
```

**Step 1: Write the failing tests**

Add to `backend/tests/test_forecast_configs.py`:

```python
def test_upsert_forecast_config_with_projection_id(client, auth_headers):
    """projection_id scopes configs independently."""
    company_id = _create_company(client, auth_headers)

    # Create a projection first
    proj_resp = client.post(
        f"/api/companies/{company_id}/projections",
        json={"name": "Test Proj", "projection_years": 5, "projection_mode": "gl"},
        headers=auth_headers,
    )
    assert proj_resp.status_code == 201
    proj_id = proj_resp.json()["id"]

    # Upsert company-scoped config (no projection_id)
    r1 = client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "income-statement-detail", "data": {"inflationRate": 2.0}},
        headers=auth_headers,
    )
    assert r1.status_code == 200

    # Upsert projection-scoped config (same config_type, different projection_id)
    r2 = client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={
            "config_type": "income-statement-detail",
            "data": {"inflationRate": 5.0},
            "projection_id": proj_id,
        },
        headers=auth_headers,
    )
    assert r2.status_code == 200
    assert r2.json()["projection_id"] == proj_id

    # Both should exist as separate records
    list_resp = client.get(
        f"/api/companies/{company_id}/forecast-configs"
        f"?config_type=income-statement-detail",
        headers=auth_headers,
    )
    assert list_resp.status_code == 200
    configs = list_resp.json()["configs"]
    assert len(configs) == 2

    # Filter by projection_id returns only the projection-scoped one
    filtered = client.get(
        f"/api/companies/{company_id}/forecast-configs"
        f"?config_type=income-statement-detail&projection_id={proj_id}",
        headers=auth_headers,
    )
    assert filtered.status_code == 200
    assert len(filtered.json()["configs"]) == 1
    assert filtered.json()["configs"][0]["data"]["inflationRate"] == 5.0


def test_upsert_forecast_config_projection_id_updates_existing(client, auth_headers):
    """Second upsert with same projection_id updates in-place, no duplicate."""
    company_id = _create_company(client, auth_headers)
    proj_resp = client.post(
        f"/api/companies/{company_id}/projections",
        json={"name": "P", "projection_years": 3, "projection_mode": "gl"},
        headers=auth_headers,
    )
    proj_id = proj_resp.json()["id"]

    client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "capex-forecast", "data": {"additions": []}, "projection_id": proj_id},
        headers=auth_headers,
    )
    r = client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "capex-forecast", "data": {"additions": [{"id": "x"}]}, "projection_id": proj_id},
        headers=auth_headers,
    )
    assert r.status_code == 200

    list_resp = client.get(
        f"/api/companies/{company_id}/forecast-configs?projection_id={proj_id}",
        headers=auth_headers,
    )
    assert len(list_resp.json()["configs"]) == 1
    assert list_resp.json()["configs"][0]["data"]["additions"] == [{"id": "x"}]
```

**Step 2: Run tests — expect FAIL**

```bash
cd backend && python -m pytest tests/test_forecast_configs.py::test_upsert_forecast_config_with_projection_id tests/test_forecast_configs.py::test_upsert_forecast_config_projection_id_updates_existing -x -q
```

Expected: FAIL (column `projection_id` doesn't exist in schema yet)

**Step 3: Apply the schema + router changes described above**

**Step 4: Run tests — expect PASS**

```bash
cd backend && python -m pytest tests/test_forecast_configs.py -x -q
```

Expected: all pass

**Step 5: Commit**

```bash
git add backend/app/schemas/forecast_config.py backend/app/routers/forecast_configs.py backend/tests/test_forecast_configs.py
git commit -m "feat: support projection_id on forecast configs (schema, router, tests)"
```

---

## Task 4: Create `ProjectionComputeService`

**Files:**
- Create: `backend/app/services/projection_compute.py`

### Understanding the algorithm

The service reads:
1. Base IS from `compute_financial_statement()` — gets `current` (annual amount) per row
2. `ForecastConfig` with `config_type="income-statement-detail"` and `projection_id=projection.id`
3. `ForecastConfig` with `config_type="capex-forecast"` and `projection_id=projection.id`
4. `Loan` records for this projection

Then for each year y (1..projection_years):
- Revenue = base amount × growth adjustments
- Expenses = variable (rate × revenue) or fixed (base × inflation^y) + adjustments
- EBITDA = revenue − expenses
- Depreciation = from capex additions with straight-line schedule
- EBIT = EBITDA − depreciation
- Net income = EBIT × (1 − 0.27) if EBIT > 0, else EBIT × (1 − 0) (no negative tax benefit for simplicity)
- CapEx = sum of capex additions in year y
- Debt service = sum of annual payments across all loans active in year y
- FCF = EBITDA − net_tax_on_ebit − capex − 0 (working capital change simplified to 0 for now)

### ForecastConfig JSON structure (canonical)

```
income-statement-detail:
  revenueValues:         { "<rowId>-<yearIdx>": float }  # direct base override per row per year (0-based yearIdx)
  revenueAdjustments:    { "<rowId>-<yearIdx>": [{type: "growthPercent", value: float}] }
  expenseTypes:          { "<rowId>": "variable" | "fixe" }
  inflationRate:         float  # % global inflation for fixed costs
  variableRates:         { "<rowId>": float }  # % of total revenue
  specificInflationRates: { "<rowId>": float }  # override inflation rate per row
  expenseAdjustments:    { "<rowId>-<yearIdx>": [{type: "amount"|"percentage", amount?: float, percentage?: float, isRecurring: bool}] }

capex-forecast:
  additions: [{id, label, yearIndex, amount, usefulLife}]  # yearIndex is 0-based
```

### Loan amortization

`Loan` has: `principal`, `interest_rate` (%), `remaining_payments` (months), `payment_amount` (optional), `start_month` (offset in months from projection start).

Annual payment = `payment_amount * 12` if set, else compute from principal/rate/term.

For year y (1-based), the loan is active if `start_month <= (y-1)*12 + 11` (i.e., starts before the end of year y) and the loan hasn't been paid off yet.

### Helper: flatten IS rows

`compute_financial_statement()` returns nested rows. Need to flatten to get all leaf/link-code rows:

```python
def _flatten_rows(rows: list[dict]) -> list[dict]:
    result = []
    for row in rows:
        result.append(row)
        if "detailRows" in row:
            result.extend(_flatten_rows(row["detailRows"]))
    return result
```

### Step 1: Write the failing test

Add to `backend/tests/test_projections.py`:

```python
def test_compute_projection_returns_summary(client, auth_headers):
    """Compute endpoint returns per-year summary even when no ForecastConfig exists."""
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id, projection_years=3)
    proj_id = proj["id"]

    response = client.get(
        f"/api/companies/{company_id}/projections/{proj_id}/compute",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["projection_id"] == proj_id
    assert data["projection_name"] == "5-Year Projection"
    assert data["projection_years"] == 3
    assert len(data["years"]) == 3
    for yr in data["years"]:
        assert "year_index" in yr
        assert "fiscal_year" in yr
        assert "total_revenue" in yr
        assert "total_expenses" in yr
        assert "ebitda" in yr
        assert "ebitda_margin" in yr
        assert "depreciation" in yr
        assert "ebit" in yr
        assert "net_income" in yr
        assert "capex" in yr
        assert "debt_service" in yr
        assert "free_cash_flow" in yr


def test_compute_projection_applies_forecast_config(client, auth_headers):
    """Compute endpoint uses projection-scoped ForecastConfig when present."""
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id, projection_years=2)
    proj_id = proj["id"]

    # Save a capex config for this projection
    client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={
            "config_type": "capex-forecast",
            "data": {"additions": [{"id": "eq1", "label": "Equip", "yearIndex": 0, "amount": 100000, "usefulLife": 5}]},
            "projection_id": proj_id,
        },
        headers=auth_headers,
    )

    response = client.get(
        f"/api/companies/{company_id}/projections/{proj_id}/compute",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    # Year 1 should include the capex addition
    year1 = next(y for y in data["years"] if y["year_index"] == 1)
    assert year1["capex"] == 100000.0
    # Depreciation for year 1 = 100000 / 5 = 20000
    assert year1["depreciation"] == 20000.0
```

**Step 2: Run tests — expect FAIL (endpoint doesn't exist)**

```bash
cd backend && python -m pytest tests/test_projections.py::test_compute_projection_returns_summary tests/test_projections.py::test_compute_projection_applies_forecast_config -x -q
```

Expected: FAIL with 404 or AttributeError

**Step 3: Write the service**

Create `backend/app/services/projection_compute.py`:

```python
"""Compute projected financial summary metrics from stored assumptions."""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.forecast_config import ForecastConfig
from app.models.projection import Loan, Projection
from app.services.financial_statements import compute_financial_statement


# ---------------------------------------------------------------------------
# Result dataclasses (plain dicts — schemas defined in schemas/projection.py)
# ---------------------------------------------------------------------------

def _make_year_result(
    year_index: int,
    fiscal_year: int,
    total_revenue: float,
    total_expenses: float,
    ebitda: float,
    depreciation: float,
    ebit: float,
    net_income: float,
    capex: float,
    debt_service: float,
    free_cash_flow: float,
) -> dict:
    ebitda_margin = (ebitda / total_revenue * 100) if total_revenue != 0 else 0.0
    return {
        "year_index": year_index,
        "fiscal_year": fiscal_year,
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
    }


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

    # Compute from amortization formula
    principal = float(loan.principal)
    annual_rate = float(loan.interest_rate) / 100
    n_months = int(loan.remaining_payments)

    if n_months == 0:
        return 0.0
    if annual_rate == 0:
        monthly_pmt = principal / n_months
    else:
        r = annual_rate / 12
        monthly_pmt = principal * r * (1 + r) ** n_months / ((1 + r) ** n_months - 1)

    return monthly_pmt * 12


def _depreciation_for_year(additions: list[dict], year_index: int) -> float:
    """Compute straight-line depreciation for year_index (1-based) from capex additions."""
    total = 0.0
    for item in additions:
        addition_year = int(item.get("yearIndex", 0)) + 1  # convert 0-based to 1-based
        amount = float(item.get("amount", 0))
        useful_life = int(item.get("usefulLife", 1)) or 1
        # Asset is active from addition_year through (addition_year + usefulLife - 1)
        if addition_year <= year_index <= addition_year + useful_life - 1:
            total += amount / useful_life
    return total


def _apply_adjustments_to_revenue(
    base: float,
    adjustments: list[dict],
) -> float:
    """Apply a list of revenue adjustments to a base amount."""
    result = base
    for adj in adjustments:
        adj_type = adj.get("type", "")
        if adj_type == "growthPercent":
            result = result * (1 + float(adj.get("value", 0)) / 100)
        elif adj_type == "amount":
            result += float(adj.get("value", 0))
    return result


def _apply_adjustments_to_expense(
    base: float,
    adjustments: list[dict],
) -> float:
    """Apply a list of expense adjustments to a base amount."""
    result = base
    for adj in adjustments:
        adj_type = adj.get("type", "")
        if adj_type == "amount":
            result += float(adj.get("amount", 0))
        elif adj_type == "percentage":
            result += base * float(adj.get("percentage", 0)) / 100
    return result


class ProjectionComputeService:
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

        # --- 1. Base IS (annual, full year) ---
        base_is = compute_financial_statement(
            db, company, "income-statement", base_fiscal_year,
            month=12, period="annual",
        )
        all_rows = _flatten_rows(base_is.get("rows", []))

        # Index rows by id: {row_id: row_dict}
        row_index: dict[str, dict] = {r["id"]: r for r in all_rows if r.get("id")}

        # --- 2. Load ForecastConfig blobs ---
        is_config = _load_forecast_config(db, org_id, company.id, proj_id, "income-statement-detail")
        capex_config = _load_forecast_config(db, org_id, company.id, proj_id, "capex-forecast")

        revenue_values: dict[str, float] = is_config.get("revenueValues", {})
        revenue_adjustments: dict[str, list] = is_config.get("revenueAdjustments", {})
        expense_types: dict[str, str] = is_config.get("expenseTypes", {})
        global_inflation: float = float(is_config.get("inflationRate", 0))
        variable_rates: dict[str, float] = is_config.get("variableRates", {})
        specific_inflation_rates: dict[str, float] = is_config.get("specificInflationRates", {})
        expense_adjustments: dict[str, list] = is_config.get("expenseAdjustments", {})

        capex_additions: list[dict] = capex_config.get("additions", [])

        # --- 3. Load loans ---
        loans = db.query(Loan).filter(Loan.projection_id == proj_id).all()

        # --- 4. Classify IS rows into revenue rows vs expense rows ---
        # Revenue rows: `current` > 0 and not isSection and not isResult
        # Expense rows: `current` < 0 (expenses are stored as negative in IS)
        # OR: rows that are not subtotals/section headers — use isSection/isResult flags
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

        # --- 5. Compute per-year results ---
        years = []
        # Track rolling revenue per year for variable expense calculation
        for y in range(1, projection_years + 1):
            year_idx = y - 1  # 0-based index used in ForecastConfig keys

            # --- Revenue ---
            total_revenue = 0.0
            for row in revenue_rows:
                row_id = row["id"]
                key = f"{row_id}-{year_idx}"
                # Direct override from frontend (revenueValues stores edited amounts)
                if key in revenue_values:
                    base = float(revenue_values[key])
                else:
                    base = float(row.get("current", 0))

                # Apply any growth adjustments for this year
                adjs = revenue_adjustments.get(key, [])
                base = _apply_adjustments_to_revenue(base, adjs)
                total_revenue += base

            # --- Expenses ---
            total_expenses = 0.0  # stored as positive for summation (flip sign)
            for row in expense_rows:
                row_id = row["id"]
                key = f"{row_id}-{year_idx}"
                base_amount = abs(float(row.get("current", 0)))  # make positive

                exp_type = expense_types.get(row_id, "fixe")

                if exp_type == "variable":
                    rate = float(variable_rates.get(row_id, 0)) / 100
                    amount = rate * total_revenue
                else:
                    # Fixed: apply inflation compounding
                    row_inflation = float(
                        specific_inflation_rates.get(row_id, global_inflation)
                    ) / 100
                    amount = base_amount * (1 + row_inflation) ** y

                # Apply expense adjustments
                adjs = expense_adjustments.get(key, [])
                amount = _apply_adjustments_to_expense(amount, adjs)
                total_expenses += amount

            # --- EBITDA ---
            ebitda = total_revenue - total_expenses

            # --- CapEx + Depreciation ---
            capex = sum(
                float(a.get("amount", 0))
                for a in capex_additions
                if int(a.get("yearIndex", 0)) + 1 == y  # convert 0-based to 1-based
            )
            depreciation = _depreciation_for_year(capex_additions, y)

            # --- EBIT ---
            ebit = ebitda - depreciation

            # --- Net income (simplified: no interest deduction from P&L) ---
            tax = ebit * cls.TAX_RATE if ebit > 0 else 0.0
            net_income = ebit - tax

            # --- Debt service ---
            debt_service = 0.0
            for loan in loans:
                start_month = int(loan.start_month or 0)
                # Loan first payment month (0-based absolute month from projection start)
                # Year y covers months (y-1)*12 .. y*12-1
                year_end_month = y * 12 - 1
                loan_total_months = int(loan.remaining_payments or 0)
                loan_end_month = start_month + loan_total_months - 1
                # Loan is active in year y if it starts before year ends and hasn't expired
                if start_month <= year_end_month and loan_end_month >= (y - 1) * 12:
                    debt_service += _annual_loan_payment(loan)

            # --- Free cash flow ---
            tax_on_ebit = ebit * cls.TAX_RATE if ebit > 0 else 0.0
            free_cash_flow = ebitda - tax_on_ebit - capex

            years.append(_make_year_result(
                year_index=y,
                fiscal_year=base_fiscal_year + y,
                total_revenue=total_revenue,
                total_expenses=total_expenses,
                ebitda=ebitda,
                depreciation=depreciation,
                ebit=ebit,
                net_income=net_income,
                capex=capex,
                debt_service=debt_service,
                free_cash_flow=free_cash_flow,
            ))

        return {
            "projection_id": str(proj_id),
            "projection_name": projection.name,
            "base_fiscal_year": base_fiscal_year,
            "projection_years": projection_years,
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "years": years,
        }
```

**Step 4: Run the tests — expect PASS (after endpoint is added in Task 5)**

Wait until Task 5 is done, then run:

```bash
cd backend && python -m pytest tests/test_projections.py -x -q
```

**Step 5: Commit (after Task 5 passes)**

See commit at end of Task 5.

---

## Task 5: Add compute schemas + endpoint

**Files:**
- Modify: `backend/app/schemas/projection.py`
- Modify: `backend/app/routers/projections.py`

### Schemas (`schemas/projection.py`)

Append to the end of the file:

```python
# --- Projection Compute ---

class ProjectionYearResult(BaseModel):
    year_index: int
    fiscal_year: int
    total_revenue: float
    total_expenses: float
    ebitda: float
    ebitda_margin: float
    depreciation: float
    ebit: float
    net_income: float
    capex: float
    debt_service: float
    free_cash_flow: float


class ProjectionComputeResult(BaseModel):
    projection_id: str
    projection_name: str
    base_fiscal_year: int
    projection_years: int
    computed_at: str
    years: list[ProjectionYearResult]
```

### Endpoint (`routers/projections.py`)

Add to imports:

```python
from app.schemas.projection import (
    ...
    ProjectionComputeResult,   # add this
)
from app.services.projection_compute import ProjectionComputeService  # add this
```

Add the new endpoint (after the `delete_projection` handler):

```python
@router.get("/{projection_id}/compute", response_model=ProjectionComputeResult)
def compute_projection(
    company_id: uuid.UUID,
    projection_id: uuid.UUID,
    base_fiscal_year: int = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Compute projected summary metrics for all years of a projection."""
    company = _verify_company_access(db, current_user, company_id)
    projection = _get_projection_or_404(db, company, projection_id)

    # Default base year: current calendar year - 1 (last complete fiscal year)
    if base_fiscal_year is None:
        from datetime import date
        base_fiscal_year = date.today().year - 1

    result = ProjectionComputeService.compute(db, company, projection, base_fiscal_year)
    return result
```

**Step 1: Apply schema + router changes above**

**Step 2: Run tests — expect PASS**

```bash
cd backend && python -m pytest tests/test_projections.py -x -q
```

Expected: all projection tests pass including the two new compute tests.

**Step 3: Run the full test suite**

```bash
cd backend && python -m pytest -x -q
```

Expected: all tests pass.

**Step 4: Commit**

```bash
git add backend/app/schemas/projection.py backend/app/routers/projections.py \
        backend/app/services/projection_compute.py backend/tests/test_projections.py
git commit -m "feat: add ProjectionComputeService and GET /projections/{id}/compute endpoint"
```

---

## Task 6: Update `frontend/lib/api.ts`

**Files:**
- Modify: `frontend/lib/api.ts`

### Changes

**1. Add `projection_id` to TypeScript interfaces and functions**

In `ForecastConfigData` (around line 1071), add:

```typescript
export interface ForecastConfigData {
  id: string
  config_type: string
  data: Record<string, unknown>
  company_id: string | null
  division_id: string | null
  sub_division_id: string | null
  projection_id: string | null   // ← add
  created_at: string
  updated_at: string
}

export interface ForecastConfigUpsert {
  config_type: string
  data: Record<string, unknown>
  company_id?: string | null
  division_id?: string | null
  sub_division_id?: string | null
  projection_id?: string | null  // ← add
}
```

**2. Update `listForecastConfigs` to accept `projection_id` filter**

```typescript
export async function listForecastConfigs(
  companyId: string,
  filters: {
    config_type?: string
    division_id?: string
    sub_division_id?: string
    projection_id?: string        // ← add
  } = {}
): Promise<ForecastConfigData[]> {
  const query = new URLSearchParams()
  if (filters.config_type) query.set("config_type", filters.config_type)
  if (filters.division_id) query.set("division_id", filters.division_id)
  if (filters.sub_division_id) query.set("sub_division_id", filters.sub_division_id)
  if (filters.projection_id) query.set("projection_id", filters.projection_id)  // ← add
  const qs = query.toString() ? `?${query.toString()}` : ""
  const data = await apiFetch<{ configs: ForecastConfigData[] }>(
    `/api/companies/${companyId}/forecast-configs${qs}`
  )
  return data.configs
}
```

**3. Add `ProjectionComputeResult` types + `computeProjection` function**

Add after the `deleteForecastConfig` function:

```typescript
// --- Projection Compute ---

export interface ProjectionYearResult {
  year_index: number
  fiscal_year: number
  total_revenue: number
  total_expenses: number
  ebitda: number
  ebitda_margin: number
  depreciation: number
  ebit: number
  net_income: number
  capex: number
  debt_service: number
  free_cash_flow: number
}

export interface ProjectionComputeResult {
  projection_id: string
  projection_name: string
  base_fiscal_year: number
  projection_years: number
  computed_at: string
  years: ProjectionYearResult[]
}

export async function computeProjection(
  companyId: string,
  projectionId: string,
  baseFiscalYear?: number,
): Promise<ProjectionComputeResult> {
  const qs = baseFiscalYear ? `?base_fiscal_year=${baseFiscalYear}` : ""
  return apiFetch<ProjectionComputeResult>(
    `/api/companies/${companyId}/projections/${projectionId}/compute${qs}`
  )
}
```

**Step 1: Apply the changes above**

**Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

**Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add computeProjection and projection_id support to api.ts"
```

---

## Task 7: Add `projectionId` prop to forecast-detail components

**Files:**
- Modify: `frontend/components/income-statement-detail.tsx`
- Modify: `frontend/components/capex-forecast-detail.tsx`
- Modify: `frontend/components/fdr-forecast-detail.tsx`
- Modify: `frontend/components/debt-forecast-detail.tsx`
- Modify: `frontend/components/base-seasonality-detail.tsx`

### Pattern for each component

Each component follows this pattern:

1. Add `projectionId?: string | null` to the component's props interface
2. Pass `projectionId` to all `upsertForecastConfig()` calls (add `projection_id: projectionId ?? undefined` to the config object)
3. Pass `{ ..., projection_id: projectionId }` filter to all `listForecastConfigs()` calls

#### `income-statement-detail.tsx`

Locate the props interface (search for `interface IncomeStatementDetailProps` or similar). Add:

```typescript
projectionId?: string | null
```

Locate each call to `upsertForecastConfig(companyId, { ... })` and add `projection_id: projectionId ?? undefined` to the config object.

Locate each call to `listForecastConfigs(companyId, { ... })` and add `projection_id: projectionId ?? undefined` to the filters.

#### `capex-forecast-detail.tsx`

Same pattern. Find `CapexForecastDetailProps`, add `projectionId?: string | null`.
Update all `upsertForecastConfig` and `listForecastConfigs` calls.

#### `fdr-forecast-detail.tsx`

Find `FDRForecastDetailProps`, add `projectionId?: string | null`.
Update all `upsertForecastConfig` and `listForecastConfigs` calls.

#### `debt-forecast-detail.tsx`

Find `DebtForecastDetailProps`, add `projectionId?: string | null`.
Note: this component uses Loan API calls (`createLoan`, `deleteLoan`, `listProjectionLoans`), not `upsertForecastConfig`. Only update forecast config calls if any exist. If none, just add the prop for API completeness.

#### `base-seasonality-detail.tsx`

Find `BaseSeasonalityDetailProps`, add `projectionId?: string | null`.
Update all `upsertForecastConfig` and `listForecastConfigs` calls.

**Step 1: Apply changes to all 5 components**

**Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

**Step 3: Commit**

```bash
git add \
  frontend/components/income-statement-detail.tsx \
  frontend/components/capex-forecast-detail.tsx \
  frontend/components/fdr-forecast-detail.tsx \
  frontend/components/debt-forecast-detail.tsx \
  frontend/components/base-seasonality-detail.tsx
git commit -m "feat: add projectionId prop to all forecast-detail components"
```

---

## Task 8: Update pro-forma page to thread `projectionId`

**Files:**
- Modify: `frontend/app/projections/pro-forma/page.tsx`

The page already has `currentProjectionId` state (line ~134). Thread it into all embedded detail components.

**Step 1: Read the current component mounts in the render output**

In the return JSX, look for:
- `<IncomeStatementDetail` — add `projectionId={currentProjectionId}`
- `<CapexForecastDetail` — add `projectionId={currentProjectionId}`
- `<FDRForecastDetail` — add `projectionId={currentProjectionId}`
- `<DebtForecastDetail` — add `projectionId={currentProjectionId}`
- `<BaseSeasonalityDetail` — add `projectionId={currentProjectionId}`

**Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

**Step 3: Commit**

```bash
git add frontend/app/projections/pro-forma/page.tsx
git commit -m "feat: thread projectionId into all pro-forma detail components"
```

---

## Task 9: Fix the scenarios comparison page

**Files:**
- Modify: `frontend/app/scenarios/page.tsx`

### What's broken

Lines ~96–169 try to read `projection.data.year_N.revenue` but the `Projection` model has no `data` field. The chart and table are always empty.

### Fix

Replace the broken `comparisonData` and `chartData` useMemo blocks with a real API call using `computeProjection`.

**Step 1: Read the current file fully** (run `Read` on `frontend/app/scenarios/page.tsx`)

**Step 2: Apply changes**

Add imports:

```typescript
import { computeProjection, type ProjectionComputeResult } from "@/lib/api"
```

Add state for computed results:

```typescript
const [computedResults, setComputedResults] = useState<Record<string, ProjectionComputeResult>>({})
const [computing, setComputing] = useState(false)
```

Add effect to fetch computed results when selectedIds change:

```typescript
useEffect(() => {
  if (selectedIds.length < 1 || !selectedCompanyId) return

  setComputing(true)
  Promise.all(
    selectedIds.map((id) =>
      computeProjection(selectedCompanyId, id).then((result) => ({ id, result }))
    )
  )
    .then((results) => {
      const map: Record<string, ProjectionComputeResult> = {}
      for (const { id, result } of results) {
        map[id] = result
      }
      setComputedResults(map)
    })
    .catch(console.error)
    .finally(() => setComputing(false))
}, [selectedIds, selectedCompanyId])
```

Replace `comparisonData` useMemo with one that reads from `computedResults`:

```typescript
const chartData = useMemo(() => {
  if (selectedProjections.length < 2) return []

  const maxYears = Math.max(...selectedProjections.map((p) => p.projection_years || 5))
  const currentYear = new Date().getFullYear()

  return Array.from({ length: maxYears }, (_, i) => {
    const entry: Record<string, string | number> = {
      name: `${currentYear + i + 1}`,
    }
    for (const proj of selectedProjections) {
      const result = computedResults[proj.id]
      if (result) {
        const yr = result.years.find((y) => y.year_index === i + 1)
        if (yr) {
          entry[proj.name] = yr.total_revenue
        }
      }
    }
    return entry
  }).filter((entry) => Object.keys(entry).length > 1)
}, [selectedProjections, computedResults])
```

Replace `comparisonData` table useMemo:

```typescript
const comparisonData = useMemo(() => {
  if (selectedProjections.length < 2) return null

  const maxYears = Math.max(...selectedProjections.map((p) => p.projection_years || 5))
  const currentYear = new Date().getFullYear()

  const metrics = [
    { key: "total_revenue" as const, label: "Revenus" },
    { key: "total_expenses" as const, label: "Dépenses" },
    { key: "ebitda" as const, label: "BAIIA" },
    { key: "net_income" as const, label: "Résultat net" },
    { key: "free_cash_flow" as const, label: "Flux de trésorerie libre" },
  ]

  const yearRows: Array<Record<string, string | number>> = []
  for (let y = 0; y < maxYears; y++) {
    const row: Record<string, string | number> = {
      year: `Année ${y + 1} (${currentYear + y + 1})`,
    }
    for (const proj of selectedProjections) {
      const result = computedResults[proj.id]
      if (result) {
        const yr = result.years.find((yr) => yr.year_index === y + 1)
        if (yr) {
          for (const metric of metrics) {
            row[`${proj.name}_${metric.key}`] = yr[metric.key]
          }
        }
      }
    }
    yearRows.push(row)
  }

  return { metrics, yearRows, maxYears }
}, [selectedProjections, computedResults])
```

In the render section, show a loading state when `computing === true`:

```tsx
{computing && (
  <div className="flex items-center gap-2 text-slate-400 text-sm">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>Calcul en cours...</span>
  </div>
)}
```

Also remove the existing broken JSX section that renders empty content (the `selectedProjections.length < 2` guard should still show the "select 2+ scenarios" message).

**Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

**Step 4: Commit**

```bash
git add frontend/app/scenarios/page.tsx
git commit -m "fix: scenarios comparison — replace broken projection.data reads with computeProjection API"
```

---

## Task 10: Seed default statement structures on company creation

**Files:**
- Modify: `backend/app/routers/companies.py`

### Context

When a new company is created, there are no statement structures seeded. The financial statements pages show "no data" until the user manually configures them. Fix: seed minimal IS + BS + CF structures automatically.

### Default structures

A minimal IS structure has two sections: Revenues and Expenses. A minimal BS has: Assets and Liabilities & Equity. A minimal CF is empty (the frontend renders it as a derived statement).

The `CompanyStatementStructure` model needs: `company_id`, `statement_type`, `structure` (JSON).

Look at `backend/app/models/financial_statement_mapping.py` to confirm the model fields before writing.

**Step 1: Read the model**

```bash
# Read backend/app/models/financial_statement_mapping.py to find CompanyStatementStructure fields
```

**Step 2: Write a failing test** (add to `backend/tests/test_companies.py`)

```python
def test_create_company_seeds_default_statement_structures(client, auth_headers):
    """New company gets IS, BS, and CF statement structures seeded."""
    from app.models.financial_statement_mapping import CompanyStatementStructure

    response = client.post(
        "/api/companies",
        json={"name": "Seeded Co", "fiscal_year_end": "12-31"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    company_id = response.json()["id"]

    # Check IS
    is_resp = client.get(
        f"/api/companies/{company_id}/statement-structures?statement_type=income-statement",
        headers=auth_headers,
    )
    assert is_resp.status_code == 200
    structures = is_resp.json()
    assert len(structures) >= 1

    # Check BS
    bs_resp = client.get(
        f"/api/companies/{company_id}/statement-structures?statement_type=balance-sheet",
        headers=auth_headers,
    )
    assert bs_resp.status_code == 200
    assert len(bs_resp.json()) >= 1
```

Run it to confirm FAIL, then implement.

**Step 3: Add seeding to `create_company` in `routers/companies.py`**

After `db.flush()` (after division/subdivision creation), before `db.commit()`, add:

```python
from app.models.financial_statement_mapping import CompanyStatementStructure

DEFAULT_IS_STRUCTURE = [
    {
        "id": "revenues",
        "label": "Revenus",
        "isSection": True,
        "isBold": True,
        "children": [],
    },
    {
        "id": "expenses",
        "label": "Dépenses",
        "isSection": True,
        "isBold": True,
        "children": [],
    },
    {
        "id": "net-income",
        "label": "Résultat net",
        "isResult": True,
        "isBold": True,
        "formula": ["+revenues", "-expenses"],
    },
]

DEFAULT_BS_STRUCTURE = [
    {
        "id": "assets",
        "label": "Actif",
        "isSection": True,
        "isBold": True,
        "children": [],
    },
    {
        "id": "liabilities-equity",
        "label": "Passif et capitaux propres",
        "isSection": True,
        "isBold": True,
        "children": [],
    },
]

DEFAULT_CF_STRUCTURE: list = []

for stmt_type, structure in [
    ("income-statement", DEFAULT_IS_STRUCTURE),
    ("balance-sheet", DEFAULT_BS_STRUCTURE),
    ("cash-flow", DEFAULT_CF_STRUCTURE),
]:
    db.add(CompanyStatementStructure(
        company_id=company.id,
        statement_type=stmt_type,
        structure=structure,
    ))
```

**Step 4: Run the test — expect PASS**

```bash
cd backend && python -m pytest tests/test_companies.py -x -q
```

Expected: all pass

**Step 5: Run the full test suite**

```bash
cd backend && python -m pytest -x -q
```

Expected: all pass

**Step 6: Commit**

```bash
git add backend/app/routers/companies.py backend/tests/test_companies.py
git commit -m "feat: seed default IS/BS/CF statement structures on company creation"
```

---

## Task 11: Add SMTP env vars to `.env.example`

**Files:**
- Modify: `.env.example` (at repo root — create it if it doesn't exist)

**Step 1: Check if `.env.example` exists**

```bash
ls .env.example 2>/dev/null || echo "not found"
```

**Step 2: Add SMTP vars**

Append (or create the file with):

```env
# SMTP — required for password reset emails
# Leave blank to disable email delivery (resets still generate tokens)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=noreply@modelisys.com
```

**Step 3: Commit**

```bash
git add .env.example
git commit -m "docs: add SMTP env vars to .env.example"
```

---

## Task 12: E2E test — scenarios comparison

**Files:**
- Create: `frontend/e2e/scenarios.spec.ts`

**Step 1: Write the test**

```typescript
import { test, expect } from "@playwright/test"

const BASE = "http://localhost:3000"
const EMAIL = "playwright@modelisys.com"
const PASSWORD = "PlaywrightTest123"

async function login(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel(/email/i).fill(EMAIL)
  await page.getByLabel(/mot de passe|password/i).fill(PASSWORD)
  await page.getByRole("button", { name: /connexion|login|se connecter/i }).click()
  await page.waitForURL(/dashboard|projections/, { timeout: 10000 })
}

test.describe("Scenarios Page", () => {
  test("scenarios page loads and shows projection list", async ({ page }) => {
    await login(page)
    await page.goto(`${BASE}/scenarios`)
    await expect(page.getByText(/comparaison de scenarios/i)).toBeVisible()
    // Projection list or empty state
    const hasProjections = await page.getByRole("checkbox").count()
    const hasEmptyState = await page.getByText(/aucune projection|no projection/i).isVisible()
    expect(hasProjections > 0 || hasEmptyState).toBe(true)
  })

  test("scenarios page shows select-2 message when fewer than 2 selected", async ({ page }) => {
    await login(page)
    await page.goto(`${BASE}/scenarios`)
    // Don't select anything; the comparison area should not show a chart
    const chartVisible = await page.locator(".recharts-responsive-container").isVisible()
    // If no projections exist, chart won't be there. If projections exist but
    // none are checked, chart also won't be there.
    expect(chartVisible).toBe(false)
  })
})
```

**Step 2: Run the test**

```bash
cd frontend && pnpm test:e2e e2e/scenarios.spec.ts
```

Expected: both tests pass (or fail with actionable errors if the app isn't running)

**Step 3: Commit**

```bash
git add frontend/e2e/scenarios.spec.ts
git commit -m "test: add Playwright e2e tests for scenarios comparison page"
```

---

## Task 13: Smoke test the full flow in the browser

This is a manual verification step.

1. Start the app: `docker-compose up`
2. Log in as `playwright@modelisys.com`
3. Navigate to `/projections/pro-forma`
4. Create a new projection
5. Switch to the "Revenus" tab — enter some revenue assumptions — they should be saved per-projection
6. Navigate to `/scenarios`
7. Select 2 projections (if only 1 exists, create another in pro-forma)
8. Verify: the bar chart appears and shows revenue data (not empty)
9. Verify: the comparison table shows per-year metrics
10. Navigate to `/settings/companies/{id}` → create a new company → go to financial statements → verify IS/BS tabs load with empty structure (not "no data" error)

If anything fails, debug using browser DevTools → Network tab to see the API response.

---

## Completion Checklist

- [ ] Migration 006 applied (`alembic upgrade head`)
- [ ] `forecast_configs.projection_id` column exists in DB
- [ ] `ForecastConfig` ORM model has `projection_id` field
- [ ] ForecastConfig schema + router support `projection_id` filter and upsert
- [ ] Backend tests for `projection_id` on forecast configs pass
- [ ] `ProjectionComputeService` computes per-year metrics
- [ ] `GET /projections/{id}/compute` endpoint returns `ProjectionComputeResult`
- [ ] Backend tests for compute endpoint pass
- [ ] `computeProjection()` added to `frontend/lib/api.ts`
- [ ] `listForecastConfigs()` accepts `projection_id` filter
- [ ] All 5 forecast-detail components accept `projectionId` prop
- [ ] Pro-forma page threads `currentProjectionId` to all detail components
- [ ] Scenarios page uses `computeProjection()` — chart and table show real data
- [ ] Default IS/BS/CF structures seeded on company creation
- [ ] SMTP vars in `.env.example`
- [ ] E2E scenarios test passes
- [ ] Full backend test suite passes (`python -m pytest -x -q`)
- [ ] TypeScript compiles clean (`npx tsc --noEmit`)
