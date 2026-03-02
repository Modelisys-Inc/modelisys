# V1: Backend-Computed Projections & Full Backend Connectivity

**Date:** 2026-03-02
**Status:** Approved
**Scope:** V1 release readiness — every frontend feature connected to real backend data

---

## Context

A full audit of the frontend and backend revealed:

- **No Math.random() or mock data** anywhere in the financial SaaS app (Math.random was already removed; seeded-random.ts is used only for generating stable client-side IDs)
- **All pages and components** make real API calls for financial data
- **One broken feature:** the Scenarios comparison page (`/scenarios`) reads `projection.data.year_N.revenue` — a field that does not exist in the `Projection` model — so the comparison chart and table are always empty
- **Root cause:** `ForecastConfig` is company-scoped, not projection-scoped. All projections share the same assumptions blob. The `ProjectionAdjustment` table exists in the DB and has API endpoints but is never used by any frontend component.
- **Secondary gaps:** SMTP not configured (password reset silently fails), no default statement structures for new companies

---

## Decision: Approach B — Full Backend Computation

The backend will compute projected financials on-demand from stored assumptions + loans. This is the authoritative source of truth for projection results, enabling the scenarios comparison and eliminating the client-side-only computation gap.

---

## Architecture

### Data Flow

```
ForecastConfig (projection_id scoped)
  + Loan records (projection-specific)
  + base IS from compute_financial_statement()
        ↓
  ProjectionComputeService.compute()
        ↓
  GET /projections/{id}/compute
        ↓
  Scenarios comparison + pro-forma display
```

### Key Schema Change

Add `projection_id` (nullable UUID FK → projections.id, CASCADE) to `forecast_configs` table.

- Existing rows: `projection_id = NULL` (company-scoped, unchanged behavior)
- New projection-specific configs: `projection_id = <uuid>` (isolated per scenario)

This allows each projection scenario to have its own independent assumptions.

---

## What Gets Built

### 1. DB Migration
- Add `projection_id` nullable FK to `forecast_configs`
- Add index on `projection_id`

### 2. Backend Model (`app/models/forecast_config.py`)
```python
projection_id: Mapped[uuid.UUID | None] = mapped_column(
    UUID(as_uuid=True), ForeignKey("projections.id", ondelete="CASCADE"), nullable=True, index=True
)
```

### 3. Backend Schema (`app/schemas/forecast_config.py`)
- Add `projection_id: UUID | None` to `ForecastConfigCreate` and `ForecastConfigResponse`
- Add `projection_id` filter to list/get endpoints

### 4. Backend Service (`app/services/projection_compute.py`)

`ProjectionComputeService.compute(db, company, projection, base_fiscal_year) → ProjectionComputeResult`

**Algorithm:**
1. Call `compute_financial_statement()` for `base_fiscal_year` annual IS → get revenue rows and expense rows with actual amounts
2. Load `ForecastConfig` with `config_type="income-statement-detail"` and `projection_id=projection.id`
3. Parse config JSON:
   - `revenueValues`: `{rowId: base_amount_override}` — per-row revenue base
   - `revenueAdjustments`: `{rowId-yearIdx: [{type, value, note}]}` — per-row-per-year growth overrides
   - `expenseTypes`: `{rowId: "variable"|"fixe"}`
   - `inflationRate`: global fixed-cost inflation (%)
   - `variableRates`: `{rowId: pct_of_revenue}`
   - `specificInflationRates`: `{rowId: override_rate}`
   - `expenseAdjustments`: `{rowId-yearIdx: [{type, amount, percentage, isRecurring, note}]}`
4. Load `ForecastConfig` with `config_type="capex-forecast"` and `projection_id=projection.id` → depreciation schedules
5. Load `Loan` records for this projection → annual debt service per year
6. For year y = 1 … projection_years:
   - **Revenue:** for each revenue row → apply `revenueValues` override or use `base_amount`, then apply `revenueAdjustments` for year y
   - **Expenses:** for each expense row → if variable: `amount = variableRate × total_revenue`; if fixed: `amount = base × (1 + inflationRate)^y`; then apply `expenseAdjustments` for year y
   - **EBITDA** = total_revenue − total_expenses (excluding D&A)
   - **Depreciation** = from capex-forecast config schedules
   - **EBIT** = EBITDA − depreciation
   - **Net income** = EBIT × (1 − tax_rate) where tax_rate defaults to 0.27 (Canadian combined rate)
   - **CapEx** = sum of capex additions in year y (from capex-forecast config)
   - **Debt service** = sum of annual loan payments for year y (from Loan amortization)
   - **Free cash flow** = EBITDA − tax_on_EBIT − CapEx − working_capital_change

### 5. Backend Endpoint (`app/routers/projections.py`)

```
GET /api/companies/{company_id}/projections/{projection_id}/compute
Query params: base_fiscal_year (int, optional — defaults to last complete FY)
Response: ProjectionComputeResult
```

**Response schema:**
```python
class ProjectionYearResult(BaseModel):
    year_index: int           # 1..5
    fiscal_year: int
    total_revenue: float
    total_expenses: float
    ebitda: float
    ebitda_margin: float      # %
    depreciation: float
    ebit: float
    net_income: float
    capex: float
    debt_service: float
    free_cash_flow: float

class ProjectionComputeResult(BaseModel):
    projection_id: UUID
    projection_name: str
    base_fiscal_year: int
    projection_years: int
    computed_at: datetime
    years: list[ProjectionYearResult]
```

### 6. Frontend: `lib/api.ts`
- Add `computeProjection(companyId, projectionId, baseFiscalYear?)` → `ProjectionComputeResult`
- Update `upsertForecastConfig()`: accept optional `projection_id` parameter
- Update `listForecastConfigs()`: accept optional `projection_id` filter

### 7. Frontend: Forecast-detail components

All 5 components receive a new optional `projectionId?: string | null` prop:
- `income-statement-detail.tsx`
- `capex-forecast-detail.tsx`
- `fdr-forecast-detail.tsx`
- `debt-forecast-detail.tsx`
- `base-seasonality-detail.tsx`

When `projectionId` is provided, all `upsertForecastConfig` and `listForecastConfigs` calls include it. This scopes the config to the specific projection.

### 8. Frontend: Pro-forma page (`app/projections/pro-forma/page.tsx`)
- Thread `selectedProjectionId` as `projectionId` prop into all embedded detail components
- When user switches projection, components reload their projection-scoped configs

### 9. Frontend: Scenarios comparison (`app/scenarios/page.tsx`)
- Replace the broken `proj.data.year_N.*` read logic
- When ≥2 projections selected: call `computeProjection()` for each → show side-by-side bar chart (revenue, EBITDA, net income, FCF per year)
- Handle loading states and empty states properly

### 10. Default Statement Structures (onboarding fix)
- When `POST /api/companies` creates a new company, seed a default IS + BS + CF statement structure
- Default structure JSON defined as a constant in the service layer
- Eliminates the "new user sees empty financial statements" problem

### 11. SMTP Documentation
- Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `FROM_EMAIL` to `.env.example`
- Note: actual email delivery not required for V1 — the reset flow works end-to-end once SMTP is configured

---

## ForecastConfig JSON Structure (canonical reference)

### `income-statement-detail`
```json
{
  "revenueValues": { "<rowId>-<yearIdx>": 1000000 },
  "revenueAdjustments": {
    "<rowId>-<yearIdx>": [
      { "id": "...", "rowId": "...", "yearIndex": 0, "type": "growthPercent", "value": 10.0, "note": "" }
    ]
  },
  "expenseTypes": { "<rowId>": "variable" },
  "inflationRate": 2.0,
  "variableRates": { "<rowId>": 35.5 },
  "specificInflationRates": { "<rowId>": 3.0 },
  "expenseAdjustments": {
    "<rowId>-<yearIdx>": [
      { "id": "...", "rowId": "...", "yearIndex": 0, "type": "amount", "amount": 5000, "isRecurring": false, "note": "" }
    ]
  }
}
```

### `capex-forecast`
```json
{
  "additions": [
    { "id": "...", "label": "Équipement", "yearIndex": 0, "amount": 50000, "usefulLife": 5, "note": "" }
  ]
}
```

### `fdr-forecast`
```json
{
  "dso": 45,
  "dpo": 30,
  "inventoryDays": 20
}
```

---

## Files Changed

**Backend:**
- `backend/alembic/versions/006_add_projection_id_to_forecast_configs.py` (new migration)
- `backend/app/models/forecast_config.py` (add projection_id field)
- `backend/app/schemas/forecast_config.py` (add projection_id to schema + filter)
- `backend/app/routers/forecast_configs.py` (update list/upsert to support projection_id)
- `backend/app/services/projection_compute.py` (new — core computation)
- `backend/app/schemas/projection.py` (add ProjectionYearResult, ProjectionComputeResult)
- `backend/app/routers/projections.py` (add compute endpoint)

**Frontend:**
- `frontend/lib/api.ts` (add computeProjection, update forecast config functions)
- `frontend/components/income-statement-detail.tsx` (add projectionId prop)
- `frontend/components/capex-forecast-detail.tsx` (add projectionId prop)
- `frontend/components/fdr-forecast-detail.tsx` (add projectionId prop)
- `frontend/components/debt-forecast-detail.tsx` (add projectionId prop)
- `frontend/components/base-seasonality-detail.tsx` (add projectionId prop)
- `frontend/app/projections/pro-forma/page.tsx` (thread projectionId to components)
- `frontend/app/scenarios/page.tsx` (replace broken comparison with computeProjection)

**Config/Docs:**
- `.env.example` (add SMTP vars)
- `backend/app/routers/companies.py` (seed default statement structures on company creation)

---

## Out of Scope for V1

- Full line-by-line projected IS/BS/CF in scenarios comparison (summary metrics only)
- Actual SMTP delivery (just document the env vars)
- Audit trail / change log
- Report export (PDF/Excel)
- Intercompany eliminations
