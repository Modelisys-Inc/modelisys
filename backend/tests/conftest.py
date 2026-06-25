import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.sql.sqltypes import UUID
from sqlalchemy.ext.compiler import compiles
from unittest.mock import patch

from app.database import Base, get_db
from app.main import app
from app.utils.rate_limit import auth_rate_limiter, api_rate_limiter


# Register PostgreSQL UUID type to compile as CHAR(32) on SQLite
@compiles(UUID, "sqlite")
def _compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(32)"


# Use in-memory SQLite for tests
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    # Reset rate limiters for each test
    auth_rate_limiter.tokens.clear()
    auth_rate_limiter.last_update.clear()
    api_rate_limiter.tokens.clear()
    api_rate_limiter.last_update.clear()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def seed_standard_link_codes(setup_db):
    """Seed minimal standard link codes so tests that validate against them pass."""
    from app.models.standard_link_code import StandardLinkCode
    # Use family="TST" so build_income_statement / build_balance_sheet fall back
    # to DEFAULT_* constants (only triggered by real ACT/REV/etc. families).
    codes = [
        StandardLinkCode(code="actif.encaisse", family="TST", is_leaf=True, sort_order=1),
        StandardLinkCode(code="actif.old", family="TST", is_leaf=True, sort_order=2),
        StandardLinkCode(code="revenus.ventes", family="TST", is_leaf=True, sort_order=3),
        StandardLinkCode(code="44-330", family="TST", is_leaf=True, sort_order=4),
        StandardLinkCode(code="REV-001", family="TST", is_leaf=True, sort_order=5),
        StandardLinkCode(code="COGS-001", family="TST", is_leaf=True, sort_order=6),
        StandardLinkCode(code="OPEX-001", family="TST", is_leaf=True, sort_order=7),
        StandardLinkCode(code="REV-PROD", family="TST", is_leaf=True, sort_order=8),
        StandardLinkCode(code="REV-SVC", family="TST", is_leaf=True, sort_order=9),
        StandardLinkCode(code="20.1", family="TST", is_leaf=True, sort_order=10),
        StandardLinkCode(code="20.2", family="TST", is_leaf=True, sort_order=11),
        StandardLinkCode(code="AC-001", family="TST", is_leaf=True, sort_order=12),
        StandardLinkCode(code="A", family="TST", is_leaf=True, sort_order=13),
        StandardLinkCode(code="CF-CASH", family="TST", is_leaf=True, sort_order=14),
    ]
    with Session(engine) as session:
        session.add_all(codes)
        session.commit()


@pytest.fixture
def registered_user(client):
    """Register a user and return the response data."""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "TestPassword123",
            "full_name": "Test User",
            "organization_name": "Test Org",
        },
    )
    return response.json()


@pytest.fixture
def auth_headers(registered_user):
    """Return authorization headers for a registered user."""
    return {"Authorization": f"Bearer {registered_user['access_token']}"}


@pytest.fixture
def su_headers(db):
    """Superadmin auth headers — the only role allowed to manage the global chart."""
    from app.models.user import User
    from app.utils.security import create_access_token

    u = User(
        email="root-su@e.com",
        hashed_password="x",
        full_name="Root",
        is_active=True,
        is_superadmin=True,
    )
    db.add(u)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token({'sub': str(u.id)})}"}
