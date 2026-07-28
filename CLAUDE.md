# Modelisys

Financial modeling SaaS platform with multi-tenant organization/company hierarchy.

## Tech Stack

- **Backend:** FastAPI 0.115 / Python 3.12 / SQLAlchemy 2.0 (async) / Alembic / PostgreSQL 16
- **Frontend:** Next.js 16 (App Router) / React 19 / TypeScript 5 / Tailwind CSS 4 / Radix UI (shadcn)
- **Auth:** JWT (python-jose) with access/refresh tokens, bcrypt password hashing
- **Testing:** pytest (backend), Playwright (frontend e2e)
- **Package Manager:** pnpm (frontend), pip (backend)
- **Infra:** Docker Compose (frontend + backend + PostgreSQL)

## Project Structure

```
backend/
  app/
    main.py              # FastAPI app, CORS, router includes
    config.py            # pydantic-settings (env vars)
    database.py          # SQLAlchemy engine + session
    dependencies.py      # Auth dependency injection (get_current_user)
    models/              # SQLAlchemy ORM models (UUID PKs throughout)
    routers/             # API endpoint handlers
    schemas/             # Pydantic request/response models
    services/            # Business logic (financial statement computation)
    utils/security.py    # JWT creation/verification, password hashing
  alembic/               # DB migrations
  tests/                 # pytest test files (test_*.py)

frontend/
  app/                   # Next.js App Router pages
    (public)/            # Login, landing (no auth required)
    financial-statements/  # Income statement, balance sheet, cash flow
    settings/            # Company config, mapping, trial balance
    projections/         # Forecasting
    evaluation/          # Business model, EBITDA, net tangible assets
    analysis/            # Capex
    layout.tsx           # Root layout
    providers.tsx        # Theme + auth providers
  components/            # React components
    ui/                  # shadcn/Radix primitives (auto-generated)
    *-summary.tsx        # Summary view components
    *-detail.tsx         # Detail view components
    *-chart.tsx          # Chart components (Recharts)
  contexts/              # React Context (auth-context, sidebar-context)
  hooks/                 # Custom hooks (use-companies, use-financial-statement, etc.)
  lib/
    api.ts               # API client with auto token refresh
    financial-utils.ts   # Formatting + financial calculations
    utils.ts             # cn() helper (clsx + tailwind-merge)
  e2e/                   # Playwright e2e tests
  middleware.ts          # Route protection (redirect if unauthenticated)
```

## Running the Project

```bash
# Full stack via Docker
docker-compose up

# Backend only (port 8000)
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend only (port 3000)
cd frontend
pnpm install
pnpm dev
```

Backend is exposed on port 8000 (host and container). Frontend on port 3000.

## Running Tests

```bash
# Backend tests (uses SQLite in-memory)
cd backend
python -m pytest

# Frontend e2e (requires running app at localhost:3000)
cd frontend
pnpm test:e2e
pnpm test:e2e:ui   # interactive UI mode
```

## Key Conventions

### Backend

- **All models use UUID primary keys** (PostgreSQL UUID type, `uuid.uuid4` default)
- **Multi-tenancy via org scoping:** queries always filter by the user's organization
- **Auth pattern:** `current_user: User = Depends(get_current_user)` on every router
- **API prefix:** all routes under `/api/` (e.g., `/api/companies/{id}/...`)
- **HTTP status codes:** 201 (create), 204 (delete), 401 (unauthenticated), 403 (unauthorized).
  Missing/malformed bearer credentials **must** be 401: FastAPI's stock `HTTPBearer`
  raises 403 on the pinned 0.115.0 (newer releases raise 401), so `app/dependencies.py`
  wraps it in `BearerAuth` to normalize the status regardless of version. Run backend
  tests against the pinned `requirements.txt` versions — a newer local FastAPI hides
  this divergence and CI catches it instead.
- **Router/Schema/Model separation:** routers handle HTTP, schemas validate I/O, models define DB
- **Cascade deletes** configured at the DB level via `ondelete="CASCADE"`
- **Timestamps:** `created_at` and `updated_at` on all entities
- **Type hints everywhere** (PEP 484)

### Frontend

- **"use client"** directive on all interactive components
- **Custom hooks** for API data fetching (e.g., `useFinancialStatement`, `useCompanies`)
- **`apiFetch()` in lib/api.ts** handles auth token injection and automatic refresh on 401.
  It JSON-stringifies the `body` for you — pass a **raw object** (`body: payload`),
  NOT `body: JSON.stringify(payload)` (that double-encodes → 422).
- **Path alias:** `@/*` maps to project root
- **Styling:** Tailwind utility classes; slate neutrals, emerald accents
- **Components follow naming pattern:** `{Entity}{View}.tsx` (e.g., `BalanceSheetSummary`)
- **Forms:** react-hook-form + zod validation
- **Charts:** Recharts
- **Icons:** lucide-react
- **Dark mode:** next-themes

### Naming

- Python: `snake_case` (functions/variables), `CamelCase` (classes)
- TypeScript: `camelCase` (variables/functions), `PascalCase` (components/types)
- Files: `kebab-case` for all files
- Hooks: `use-{feature}.ts`
- API routes: `/api/{resource}` or `/api/companies/{id}/{resource}`

## Database

- PostgreSQL 16 (Docker)
- Migrations managed by Alembic (`backend/alembic/versions/`)
- Hierarchical model: Organization -> Company -> Division -> SubDivision
- Key entities: User, AccountMapping, TrialBalance, FinancialStatementMapping, ExchangeRate, Budget, Note, Projection, BusinessRisk, ForecastConfig
- Test DB: SQLite in-memory (with UUID type compilation shim in conftest.py)

## Environment Variables

Defined in `.env` at project root, loaded by Docker Compose:

```
POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
DATABASE_URL=postgresql://{user}:{password}@db:5432/{db}
JWT_SECRET_KEY=<change-in-production>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## CI/CD & Deployment

### Pipeline
- **GitHub Actions** deploys automatically on every push to `main`
- Pipeline: test (pytest + pnpm build) -> build Docker images -> push to ACR -> deploy to Azure Container Apps
- Workflow file: `.github/workflows/deploy.yml`

### Azure Resources
- **Container Apps:** `modelisys-backend` (port 8000) + `modelisys-frontend` (port 3000) in `modelisys-env`
- **Container Registry:** `modelisysacr` (Basic SKU)
- **PostgreSQL:** `modelisys-db` (Flexible Server, Burstable B1ms, PostgreSQL 16)
- **Resource Group:** `modelisys-rg` (East US)
- **Domains:** `app.modelisys.com` (frontend), `api.modelisys.com` (backend)

### Infrastructure Scripts
```bash
# First-time setup (requires az login)
./infra/setup.sh

# Destroy all resources
./infra/teardown.sh
```

### Rollback
```bash
# List revisions
az containerapp revision list --name modelisys-backend --resource-group modelisys-rg -o table

# Activate a previous revision
az containerapp revision activate --name modelisys-backend --resource-group modelisys-rg --revision <revision-name>
```

## Git Workflow

- **Main branch:** `main`
- **Feature branches:** `feature/phase-{N}-{description}`
- **PRs:** feature branches merged to main via pull requests
- **Phases:** phase-1 (backend foundation), phase-2 (companies/auth), phase-3a (statement structures)

## Architecture Notes

- Financial statements are **computed server-side** from trial balance data, account mappings, and statement structures
- The computation service lives in `backend/app/services/financial_statements.py`
- Statement structures define the rows/sections of income statement, balance sheet, etc.
- Account mappings link GL accounts to statement rows via `link_codes`
- Cash flow is derived from income statement + balance sheet deltas
- CF codes (TEX/TIN/TFI) with `attached_link_codes` including `CAP-C.1` reuse the
  bilan CAP-C.1 formula (REV CT×−1 − charges) over the **selected horizon months**
  (mois courant = that month only; YTD = Jan→mois; not always YTD like BS CAP-C.1)
- See `docs/plans/` for detailed design documents

### Diagnostic (rapport VC)

- `GET /api/companies/{id}/diagnostic` (read gate `verify_company_access`, viewers OK)
  returns a single aggregate payload (`app/schemas/company_diagnostic.py`): 5-year
  trends, seasonality, per-division profitability, product/service margins, 5-year
  ratios, capex, and an indicative EBITDA-multiple valuation. Computed in
  `app/services/company_diagnostic.py` on top of the statement engine using
  link-code **family** sums (REV/CMV/… — never label matching); EBITDA = EBIT +
  amortissement; equity = assets − liabilities; capex = ΔALT net + amortissement.
  Product scoping uses `_product_filter_ctx` (ContextVar in
  `financial_statements.py`); multiples come from `ForecastConfig`
  `config_type="ebitda_multiple"` else default 3–5× (rationale notes the default).
- Frontend: `/modules/diagnostic` (static route beats the `[moduleId]` placeholder;
  reached via the module nav, not the sidebar). Redesigned (2026-07) as a
  light-theme report aligned with financial-statement pages: components in `frontend/components/diagnostic/v2/`
  (hero with 0-100 health index, KPI strip, hand-written SVG charts — **no
  Recharts** — drill-down drawer, sticky nav rail). Client-side derivations
  (health index, typed signals, ratio definitions) in `lib/diagnostic-derive.ts`;
  design tokens in `lib/diagnostic-theme.ts`; sector medians **hardcoded** in
  `lib/diagnostic-benchmarks.ts` (should move to the backend eventually —
  original handoff's `api-gaps.md` lists Phase-2 payload fields: EBITDA bridge,
  per-year seasonality, cash flow, debt, headcount, multi-method valuation).
  `diagnostic-format.ts` + `diagnostic-skeleton.tsx` (kept from v1) still used;
  hook `use-company-diagnostic.ts` unchanged. E2e (fully mocked) in
  `frontend/e2e/diagnostic.spec.ts` + `diagnostic-visual.spec.ts`; testids:
  `kpi-cards`, `lifecycle-badge`, `division-row-{id}`, `valuation-notes`,
  `diagnostic-error`, `diagnostic-signal`, `products-empty-state`.
- Known deltas vs analysis pages (deliberate, flagged for product review): capex
  differs from `/analysis/capex` (ΔALT vs Δ of first BS total row);
  `interest_coverage` = EBIT/FIN here vs EBITDA/FIN on `/analysis/ratios`.

### Authorization (RBAC)

Roles (see `app/dependencies.py`):
- **superadmin** — `User.is_superadmin` (platform staff): full access to every org,
  and the only role allowed to manage the global chart of accounts. Granted
  out-of-band (not via the UI): `python -m app.scripts.set_superadmin <email>`
  (add `--revoke` to remove).
- **admin** — `UserOrganization.role = admin`: full read+write on all companies in
  their org; manages company entities (create/update/delete + divisions) and
  (later) grants access to others.
- **user** — `role = member`: read+write only on companies granted via
  `user_company_access`, or all org companies if `UserOrganization.all_companies`.
- **viewer** — `role = viewer`: read-only on granted companies (writes → 403).

Enforcement is centralized:
- `verify_company_access(db, user, company_id, require_write=False)` is the single
  gate — returns 404 for no-access (never leaks existence), 403 for a viewer write.
  Every company-scoped read endpoint calls it.
- `enforce_company_write` is a router-level dependency attached in `main.py` to the
  company-scoped data routers: it rejects any non-safe HTTP method (write) by
  viewers / ungranted users, covering all current and future mutations. (QBO is
  gated explicitly instead, because it has an unauthenticated OAuth callback.)
- `require_org_admin` / `require_superadmin` gate org-admin and platform actions.
- `list_companies` is role-scoped; `create_company` + division CRUD are admin-only.

Client (organization) management + feature flags are **superadmin-only**
(`app/routers/admin.py`, prefix `/api/admin`): list clients, create a client
(org + first admin user by email — they set their password via "forgot password"),
and toggle per-client feature flags. Flags are a fixed registry
(`app/services/feature_flags.py`); `Organization.feature_flags` stores overrides,
and the effective flags (defaults merged with overrides) are returned on each org
in `/api/auth/me`. Frontend: `/settings/clients` (superadmin-only). Read flags in
the UI via `usePermissions`/auth-context org `feature_flags` to gate features.

Grant management (admin-only) lives on the org members API
(`/api/organizations/{org_id}/members`): list/invite/update-role/remove plus
`PATCH .../{user_id}` for the `all_companies` toggle and
`PUT .../{user_id}/companies` to set per-company grants. Frontend:
`/settings/users` (the "Accès" dialog per member).

Superadmin global-code CRUD (the only writes to the shared chart): `POST/PATCH/DELETE
/api/standard-link-codes` gated by `require_superadmin` (`app/services/coa_admin.py`)
— create is additive + versioned, delete tombstones (never hard-deletes), edits are
in-place metadata. `is_superadmin` is exposed on `/api/auth/me`. Frontend:
`/settings/standard-codes` (superadmin-only). This retires the MO.xlsx seed for
ongoing changes.

Frontend role-awareness: the `usePermissions()` hook (`hooks/use-permissions.ts`)
exposes `canEdit` (false for viewers); edit controls are hidden for viewers on
mapping, trial balance, custom link codes, notes (note-modal), and the company
settings page (name/fiscal/currency/cumulative-TB + division & sub-division
CRUD + delete-company). The backend is the source of truth (viewer writes → 403);
the hook is UX only.

### Trial balance storage

- `trial_balance_entries` is **RANGE-partitioned by `fiscal_year`** in PostgreSQL
  (migration 015): composite PK `(id, fiscal_year)`, a `DEFAULT` partition so
  inserts for any year never fail, plus explicit yearly partitions (2015–2035).
  Add future-year partitions with
  `CREATE TABLE trial_balance_entries_y<YYYY> PARTITION OF trial_balance_entries FOR VALUES FROM (<YYYY>) TO (<YYYY+1>)`.
  On SQLite (tests) it's a plain composite-PK table.
- **Rollup:** `account_annual_balances` (model `AccountAnnualBalance`) caches the
  annual total per GL account. `app/services/tb_rollup.refresh_annual_balances`
  rebuilds a (company, fiscal_year) slice from the entries; it's called after
  every TB write (trial-balance upsert/upload/delete + QBO commit). Read via
  `GET /api/companies/{id}/trial-balance/annual-summary?fiscal_year=`. Derived
  cache — never the source of truth; the compute service still reads raw entries.

### Link codes (chart of accounts)

- **Global registry:** `standard_link_codes` (model `StandardLinkCode`) is the
  shared, org-agnostic standardized chart, seeded from `data/MO.xlsx` via
  `python -m app.scripts.seed_standard_link_codes` (idempotent upsert by `code`).
  Read-only API at `/api/standard-link-codes`. Hierarchy via `parent_code`/`is_leaf`;
  only leaf codes are assignable.
- **Tenant-local overlay:** `company_link_codes` (model `CompanyLinkCode`) holds
  per-company custom codes for accounting-complex clients. They stay private to
  the company (never auto-shared). Codes are auto-generated in a reserved
  namespace (`{FAMILY}-Z{n}`) and validated never to collide with a global code.
  CRUD at `/api/companies/{id}/custom-link-codes`; creation also appends an
  assignable leaf to the company's `CompanyStatementStructure` so it renders.
  Frontend: `CompanyCustomLinkCodes` panel on the "Code de liaison" page.
- **Resolution is unified:** `app/services/link_code_resolver.py` is the single
  source of truth — a code is assignable if it's a global leaf OR a leaf in the
  company's overlay. Both validation gates (manual `account-mappings` upsert and
  QBO `commit_trial_balance`) and both pickers use it.
- **Curated promotion (Phase 4):** each `CompanyLinkCode` has a `promotion_status`
  ("pending" | "promoted" | "rejected"). A curator works a queue at
  `/api/coa/promotion-candidates` (org-scoped): each candidate shows a
  duplicate-suggestion by **rollup signature** (family + ft_category + account_type,
  not label). `POST .../{id}/promote` either links the candidate to an existing
  global code (`link_to_existing_code`) or publishes a NEW global code additively
  as a fresh `CoaVersion` (`app/services/coa_promotion.py`); `POST .../{id}/reject`
  drops it from the queue. Promotion sets `promoted_to_standard_code`. Never
  auto-shares. **Superadmin-only** (it writes the shared global chart) — the queue
  lists pending candidates across all orgs. Frontend: `CoaPromotionQueue` at
  `/settings/coa-promotion` (superadmin-gated; e2e `frontend/e2e/coa-promotion.spec.ts`).
- **Versioning (lightweight):** `coa_versions` (model `CoaVersion`) is an audit
  history — one row per seed/publish run; current version = `max(version)`.
  `Company.coa_version` stamps the chart cohort a company was created under.
  `StandardLinkCode` has `is_active` + `deprecated_at` + `coa_version`: the seed
  (`apply_records` in `seed_standard_link_codes.py`) is now additive — it bumps
  the version, upserts/reactivates present codes, and **tombstones** codes absent
  from the new MO.xlsx (never hard-deletes), so historical references stay
  resolvable. NOTE: existing companies are already insulated from chart changes
  because their `CompanyStatementStructure` is a per-company snapshot taken at
  creation (compute reads that snapshot, never live `standard_link_codes`).

## QuickBooks Online integration

Per-company connector in `backend/app/integrations/quickbooks/`:

- **OAuth2 flow** with Intuit (sandbox by default). Tokens stored in
  `quickbooks_connections` table, encrypted at rest via Fernet
  (`QBO_TOKEN_ENCRYPTION_KEY`). State CSRF JWT signed with `JWT_SECRET_KEY`,
  audience `qbo-oauth`.
- **Two-step preview/commit:** `POST /api/quickbooks/companies/{id}/trial-balance/preview`
  pulls TB + returns rows with `existing_link_code` (no DB writes). `POST .../commit`
  upserts `ChartOfAccount`, `AccountMapping`, and `TrialBalanceEntry` in one
  transaction.
- **TB schema fit:** preview/commit take `fiscal_year` + `month` (matching
  `TrialBalanceEntry`), not `as_of_date`. QBO pulls are always cumulative
  (YTD: fiscal-year-start through end-of-target-month). On commit, the
  company is forced to `is_cumulative_tb=True` so the FS service interprets
  the stored YTD entries correctly.
- **Strict link-code picker:** the QBO review screen reads valid link codes from
  the **global** `standard_link_codes` registry (leaf codes only) unioned with the
  company's tenant-local overlay (see "Link codes" above). `commit_trial_balance`
  rejects any non-skipped row whose `link_code` is not assignable for that company
  (422), via `link_code_resolver`.
- **Class/Location tagging:** preview/commit also pull a GeneralLedger report to
  discover which QBO Classes (→ `AccountMapping.divisions`) and Locations/Lieux
  (→ `AccountMapping.sub_divisions`) each account appears under. The preview
  merges discovered values with existing tags (union) and shows them as editable
  chips (`QuickBooksTagCell`); commit writes the CSV and additively upserts
  `Division`/`SubDivision` rows for observed (class, location) pairs. Discovery
  is best-effort — GL/prefs failures degrade to empty tags and never block the
  TB import. Tracking-on flags are derived from discovered data, not Preferences.
- **Frontend:** `/settings/companies/[id]/quickbooks` with three states
  (not_connected / connected / revoked) and a `QuickBooksReviewTable` for
  per-row mapping review.
- **Tests:** `backend/tests/integrations/quickbooks/` mocks Intuit via `respx`.
  Frontend e2e in `frontend/e2e/quickbooks.spec.ts` mocks all backend endpoints.
- **Sandbox setup + smoke checklist:** `docs/quickbooks-release-checklist.md`.

ALWAYS USE TEAMS WHEN DEEMED NECESSARY
TEAMS SHOULD BE COMPOSED OF 
- BACKEND DEVELOPER
- FRONTEND DEVELOPER
- PROJECT MANAGER
- QA ENGINEER
- SYSTEM ARCHITECT

ALWAYS TEST IN PLAYWRIGHT

UPDATE YOUR CLAUDE.MD FILE WHEN NEEDED TO KEEP IMPORTANT INFORMATION