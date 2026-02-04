from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import account_mappings, auth, companies, health, statement_structures, trial_balance


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title=settings.app_name,
    description="Backend API for Modelisys financial modeling platform",
    version="0.1.0",
    lifespan=lifespan,
)

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


@app.get("/")
async def root():
    return {"message": "Welcome to Modelisys API"}
