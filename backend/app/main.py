import time
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import Depends, FastAPI, Request

from app.dependencies import enforce_company_write
from fastapi.exceptions import ResponseValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import ProgrammingError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.middleware.security import SecurityHeadersMiddleware
from app.utils.logging import get_logger, setup_logging

# Initialize Sentry if DSN is configured
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=0.1 if settings.environment == "production" else 1.0,
    )

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize logging
setup_logging()
logger = get_logger(__name__)
from app.routers import (
    account_mappings,
    admin,
    auth,
    budgets,
    business_risks,
    coa_promotion,
    companies,
    company_link_codes,
    customers,
    exchange_rates,
    financial_statements,
    forecast_configs,
    health,
    notes,
    organizations,
    projections,
    standard_link_codes,
    statement_chart_configs,
    statement_structures,
    suppliers,
    trial_balance,
)
from app.integrations.quickbooks import router as quickbooks_router


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all incoming requests."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000

        # Skip health check logging to reduce noise
        if request.url.path != "/api/health":
            logger.info(
                f"{request.method} {request.url.path} - {response.status_code} ({duration_ms:.1f}ms)"
            )

        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.app_name} in {settings.environment} mode")
    yield
    # Shutdown
    logger.info("Shutting down")


app = FastAPI(
    title=settings.app_name,
    description="""
## Modelisys Financial Modeling API

Backend API for the Modelisys financial modeling platform.

### Features
- Multi-tenant organization management
- Trial balance import and management
- Financial statement generation (Income Statement, Balance Sheet, Cash Flow)
- Budget and projection management
- Multi-currency support with exchange rates

### Authentication
All endpoints (except `/api/health` and `/api/auth/*`) require a Bearer token.
Obtain a token via `/api/auth/login` and include it in the Authorization header.
""",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "health", "description": "Health check endpoint"},
        {"name": "auth", "description": "Authentication and user management"},
        {"name": "companies", "description": "Company CRUD operations"},
        {"name": "trial-balance", "description": "Trial balance import and management"},
        {"name": "financial-statements", "description": "Generate financial statements"},
        {"name": "budgets", "description": "Budget management"},
        {"name": "projections", "description": "Financial projections"},
        {"name": "exchange-rates", "description": "Currency exchange rates"},
    ],
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(ProgrammingError)
async def sqlalchemy_programming_error_handler(request: Request, exc: ProgrammingError):
    """Colonne manquante (souvent migration non appliquée) ou erreur SQL côté schéma."""
    logger.exception("SQLAlchemy ProgrammingError on %s %s", request.method, request.url.path)
    msg = str(exc).lower()
    if "attachments" in msg and "does not exist" in msg:
        return JSONResponse(
            status_code=503,
            content={
                "detail": (
                    "La base de données n’est pas à jour : colonne « attachments » absente. "
                    "Exécutez les migrations sur le serveur API : alembic upgrade head "
                    "(ou redémarrez le conteneur backend qui applique les migrations au démarrage)."
                )
            },
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Erreur de schéma base de données. Vérifiez que les migrations Alembic sont appliquées."},
    )


@app.exception_handler(ResponseValidationError)
async def response_validation_error_handler(request: Request, exc: ResponseValidationError):
    logger.exception(
        "Response validation failed on %s %s: %s",
        request.method,
        request.url.path,
        exc.errors(),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Réponse API invalide (sérialisation). Vérifiez les logs serveur."},
    )

# Security headers (added first, executes last)
app.add_middleware(SecurityHeadersMiddleware)

# Request logging
app.add_middleware(RequestLoggingMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(companies.router)
# Company-scoped data routers: a router-level guard rejects writes (non-safe HTTP
# methods) by viewers / users without an edit grant. Reads stay scoped by each
# endpoint's own verify_company_access call.
_write_guard = [Depends(enforce_company_write)]
app.include_router(trial_balance.router, dependencies=_write_guard)
app.include_router(account_mappings.router, dependencies=_write_guard)
app.include_router(company_link_codes.router, dependencies=_write_guard)
app.include_router(coa_promotion.router)
app.include_router(statement_structures.router, dependencies=_write_guard)
app.include_router(statement_chart_configs.router, dependencies=_write_guard)
app.include_router(financial_statements.router, dependencies=_write_guard)
app.include_router(exchange_rates.router, dependencies=_write_guard)
app.include_router(budgets.router, dependencies=_write_guard)
app.include_router(notes.router, dependencies=_write_guard)
app.include_router(projections.router, dependencies=_write_guard)
app.include_router(organizations.router)
app.include_router(business_risks.router, dependencies=_write_guard)
app.include_router(forecast_configs.router, dependencies=_write_guard)
app.include_router(customers.router, dependencies=_write_guard)
app.include_router(suppliers.router, dependencies=_write_guard)
app.include_router(standard_link_codes.router)
app.include_router(admin.router)
# QBO router has an unauthenticated OAuth callback, so it can't take the
# auth-forcing write guard; its write endpoints enforce access explicitly.
app.include_router(quickbooks_router.router)


@app.get("/")
async def root():
    return {"message": "Welcome to Modelisys API"}
