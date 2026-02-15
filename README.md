# Modelisys

Financial modeling SaaS platform for multi-tenant organizations. Manage companies, divisions, trial balances, and generate financial statements with projections and valuations.

## Features

- **Multi-tenant Architecture**: Organizations with multiple companies, divisions, and sub-divisions
- **Financial Statements**: Income statement, balance sheet, and cash flow computed from trial balance data
- **Account Mapping**: Map GL accounts to financial statement line items via link codes
- **Budgets & Projections**: Create budgets and multi-year projections with adjustments
- **Analysis Tools**: Capex analysis, working capital, ratios, seasonality
- **Valuation Methods**: DCF, EBITDA multiple, net tangible assets, CCF, VCA
- **Exchange Rates**: Multi-currency support with configurable rates

## Tech Stack

- **Backend**: FastAPI, Python 3.12, SQLAlchemy 2.0 (async), PostgreSQL 16
- **Frontend**: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4
- **Auth**: JWT with access/refresh tokens
- **Testing**: pytest (backend), Playwright (frontend e2e)

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ and pnpm (for local frontend development)
- Python 3.12+ (for local backend development)

### Running with Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/Modelisys-Inc/modelisys.git
cd modelisys

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit backend/.env and set:
# - JWT_SECRET_KEY (generate with: openssl rand -hex 32)
# - POSTGRES_PASSWORD

# Start all services
docker-compose up
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Documentation: http://localhost:8001/docs

### Local Development

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8001
```

**Frontend:**

```bash
cd frontend
pnpm install
pnpm dev
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://modelisys:modelisys@db:5432/modelisys` |
| `JWT_SECRET_KEY` | **Required in production** - JWT signing key | `change-me-in-production` |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL | `7` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000` |
| `ENVIRONMENT` | `development`, `staging`, or `production` | `development` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8001` |

## Running Tests

**Backend tests:**

```bash
cd backend
python -m pytest
```

**Frontend e2e tests:**

```bash
cd frontend
pnpm test:e2e        # headless
pnpm test:e2e:ui     # interactive UI mode
```

## Project Structure

```
modelisys/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   ├── config.py         # Environment settings
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── routers/          # API endpoints
│   │   ├── schemas/          # Pydantic models
│   │   └── services/         # Business logic
│   ├── alembic/              # Database migrations
│   └── tests/                # pytest tests
├── frontend/
│   ├── app/                  # Next.js pages
│   ├── components/           # React components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities and API client
│   └── e2e/                  # Playwright tests
└── docker-compose.yml
```

## API Documentation

Once the backend is running, interactive API documentation is available at:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Production Deployment

For production deployments:

1. **Set environment to production**:
   ```
   ENVIRONMENT=production
   ```

2. **Generate a secure JWT secret**:
   ```bash
   openssl rand -hex 32
   ```

3. **Configure CORS origins** for your domain:
   ```
   CORS_ORIGINS=https://app.yourdomain.com
   ```

4. **Set up a production PostgreSQL database** with proper credentials

5. **Use HTTPS** for all traffic

## License

Proprietary - All rights reserved by Modelisys Inc.
