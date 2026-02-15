import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.utils.logging import get_logger, setup_logging

# Initialize logging
setup_logging()
logger = get_logger(__name__)
from app.routers import (
    account_mappings,
    auth,
    budgets,
    business_risks,
    companies,
    customers,
    exchange_rates,
    financial_statements,
    forecast_configs,
    health,
    notes,
    organizations,
    projections,
    statement_structures,
    suppliers,
    trial_balance,
)


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
    description="Backend API for Modelisys financial modeling platform",
    version="0.1.0",
    lifespan=lifespan,
)

# Request logging (added first, executes last)
app.add_middleware(RequestLoggingMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(trial_balance.router)
app.include_router(account_mappings.router)
app.include_router(statement_structures.router)
app.include_router(financial_statements.router)
app.include_router(exchange_rates.router)
app.include_router(budgets.router)
app.include_router(notes.router)
app.include_router(projections.router)
app.include_router(organizations.router)
app.include_router(business_risks.router)
app.include_router(forecast_configs.router)
app.include_router(customers.router)
app.include_router(suppliers.router)


@app.get("/")
async def root():
    return {"message": "Welcome to Modelisys API"}
