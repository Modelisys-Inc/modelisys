# Backend-Frontend Integration Design

**Date:** 2026-02-06
**Status:** Approved

## Key Decisions

- **Priority:** Financial core first (Income Statement, Balance Sheet, Cash Flow), configs second
- **Computation:** Backend-computed financial statements
- **Fiscal Year:** Full fiscal year awareness from the start
- **Frontend Transition:** Clean swap - replace localStorage/hardcoded data with API hooks

## Existing Assets

- **Models already defined** for all entities (exchange rates, budgets, notes, projections, loans, business risks, forecast configs, EBITDA notes) - just lack routers/schemas
- **Patterns established** by existing companies, trial-balance, account-mappings routers
- **Auth + org scoping** works via `get_current_user()` dependency
- **No new migrations needed** - all tables exist from initial migration (001)

## Architecture

### Financial Statement Computation Service

`backend/app/services/financial_statements.py`

**Input:** company_id, fiscal_year, period (monthly/quarterly/annual), month, comparison_type (prior_year/budget), optional division/subdivision filters.

**Flow:**
1. Fetch trial balance entries for requested fiscal year (+ prior year for comparisons)
2. Fetch company's statement structure (income-statement or balance-sheet rows)
3. Fetch account mappings that link GL accounts to statement rows via `link_codes`
4. Match: sum all trial balance entries for GL accounts whose mapping link code matches the statement row's link code
5. Apply fiscal year offset from company's `fiscal_year_end` field
6. Aggregate by period type

**Period aggregation:**
- Monthly: single month's amounts
- Quarterly: sum of 3 months in fiscal quarter
- Annual: sum of all 12 months
- YTD: sum from fiscal month 1 to requested month
- Prior period: same computation against previous fiscal year

**Cash flow:** Derived from income statement + balance sheet deltas.

**Response shape:** Array of rows with `label`, `current`, `prior`, `variation`, `isBold`, `isSection`, `isResult`, plus nested `detailRows`.

## New Backend Endpoints

### Financial Statements Router (`routers/financial_statements.py`)
- `GET /api/companies/{id}/financial-statements/income-statement` - query params: fiscal_year, month, period, view, comparison_type, budget_id, division_id, sub_division_id
- `GET /api/companies/{id}/financial-statements/balance-sheet` - same pattern
- `GET /api/companies/{id}/financial-statements/cash-flow` - derived
- `GET /api/companies/{id}/financial-statements/summary` - metrics cards

### Exchange Rates Router (`routers/exchange_rates.py`)
- `GET /api/companies/{id}/exchange-rates` - list by fiscal year
- `PUT /api/companies/{id}/exchange-rates` - upsert monthly rates + notes

### Budgets Router (`routers/budgets.py`)
- `GET /api/companies/{id}/budgets` - list
- `POST /api/companies/{id}/budgets` - create
- `GET /api/companies/{id}/budgets/{budget_id}` - get with entries
- `PUT /api/companies/{id}/budgets/{budget_id}/entries` - bulk upsert
- `DELETE /api/companies/{id}/budgets/{budget_id}` - delete

### Notes Router (`routers/notes.py`)
- `GET /api/companies/{id}/notes` - list/filter by page, row, period
- `POST /api/companies/{id}/notes` - create
- `PATCH /api/companies/{id}/notes/{note_id}` - update
- `DELETE /api/companies/{id}/notes/{note_id}` - delete

### Projections Router (`routers/projections.py`)
- Full CRUD for projections, adjustments, and loans

### Business Risks Router (`routers/business_risks.py`)
- Full CRUD

### Forecast Configs Router (`routers/forecast_configs.py`)
- Full CRUD

All routers: org-scoped, JWT-protected, Pydantic schemas, following existing conventions.

## Frontend Changes

### New API Functions (`lib/api.ts`)
- `getIncomeStatement(companyId, params)`, `getBalanceSheet(...)`, `getCashFlow(...)`
- `getExchangeRates(companyId, fiscalYear)`, `upsertExchangeRates(...)`
- `listBudgets(companyId)`, `createBudget(...)`, `getBudgetEntries(...)`, etc.
- `listNotes(companyId, filters)`, `createNote(...)`, etc.
- `listProjections(companyId)`, CRUD functions for adjustments/loans

### New Hooks (`hooks/`)
- `useFinancialStatement(companyId, type, params)` - re-fetches on param changes
- `useExchangeRates(companyId, fiscalYear)`
- `useBudgets(companyId)`
- `useNotes(companyId, filters)`
- `useProjections(companyId)`

### Page Rewiring
For each page:
1. Remove hardcoded `companiesData` constants
2. Remove `localStorage.getItem/setItem` calls
3. Import new hook
4. Wire hook data into existing component props
5. Add loading/empty states
6. Keep all existing UI/layout code intact

## Execution Phases

### Phase 1 - Foundation (parallel)
- DB Expert: Audit models, add missing indexes/constraints
- Backend Dev: Build financial statement computation service

### Phase 2 - Endpoints (sequential)
- Backend Dev: Financial statements router + schemas
- Backend Dev: Config routers (exchange-rates, budgets, notes)

### Phase 3 - Frontend (overlaps Phase 2)
- Frontend Dev: API functions + hooks
- Frontend Dev: Rewire pages (income-statement -> balance-sheet -> cash-flow -> configs)

### Phase 4 - Testing (overlaps Phase 3)
- QA: Backend endpoint tests
- QA: Frontend-backend integration verification

### Project Manager
- Runs throughout - tracks dependencies, reviews integration, ensures alignment
