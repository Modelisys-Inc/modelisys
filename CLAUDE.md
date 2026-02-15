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

Backend is exposed on port 8001 (host) -> 8000 (container). Frontend on port 3000.

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
- **HTTP status codes:** 201 (create), 204 (delete), 401 (unauthenticated), 403 (unauthorized)
- **Router/Schema/Model separation:** routers handle HTTP, schemas validate I/O, models define DB
- **Cascade deletes** configured at the DB level via `ondelete="CASCADE"`
- **Timestamps:** `created_at` and `updated_at` on all entities
- **Type hints everywhere** (PEP 484)

### Frontend

- **"use client"** directive on all interactive components
- **Custom hooks** for API data fetching (e.g., `useFinancialStatement`, `useCompanies`)
- **`apiFetch()` in lib/api.ts** handles auth token injection and automatic refresh on 401
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
- See `docs/plans/` for detailed design documents

ALWAYS USE TEAMS WHEN DEEMED NECESSARY
TEAMS SHOULD BE COMPOSED OF 
- BACKEND DEVELOPER
- FRONTEND DEVELOPER
- PROJECT MANAGER
- QA ENGINEER
- SYSTEM ARCHITECT

ALWAYS TEST IN PLAYWRIGHT

UPDATE YOUR CLAUDE.MD FILE WHEN NEEDED TO KEEP IMPORTANT INFORMATION