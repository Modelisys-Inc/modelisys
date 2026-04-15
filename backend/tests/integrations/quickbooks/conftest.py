"""Shared QBO test fixtures: bypass broken bcrypt-based auth in tests by
overriding `get_current_user` directly."""
from __future__ import annotations

import pytest
from cryptography.fernet import Fernet

from app.config import settings
from app.dependencies import get_current_user
from app.main import app
from app.models.company import Company
from app.models.organization import Organization
from app.models.user import User, UserOrganization, UserRole


@pytest.fixture(autouse=True)
def qbo_env(monkeypatch):
    """Set Intuit credentials and a fresh encryption key for every QBO test."""
    monkeypatch.setattr(settings, "intuit_client_id", "test-client")
    monkeypatch.setattr(settings, "intuit_client_secret", "test-secret")
    monkeypatch.setattr(settings, "intuit_environment", "sandbox")
    monkeypatch.setattr(
        settings,
        "intuit_redirect_uri",
        "http://localhost:8000/api/quickbooks/callback",
    )
    monkeypatch.setattr(settings, "qbo_token_encryption_key", Fernet.generate_key().decode())
    monkeypatch.setattr(settings, "frontend_url", "http://localhost:3000")


@pytest.fixture
def org_user_company(db):
    """Create a fresh org + user + membership + company directly via DB."""
    org = Organization(name="Test Org", slug="test-org")
    db.add(org)
    db.flush()
    user = User(
        email="qbo-test@example.com",
        hashed_password="not-used-tests-bypass-auth",
        full_name="QBO Test User",
        is_active=True,
    )
    db.add(user)
    db.flush()
    db.add(UserOrganization(user_id=user.id, organization_id=org.id, role=UserRole.ADMIN))
    company = Company(organization_id=org.id, name="Test Co", currency="CAD")
    db.add(company)
    db.commit()
    db.refresh(company)
    db.refresh(user)
    return org, user, company


@pytest.fixture
def auth_client(client, org_user_company):
    """A TestClient where get_current_user is overridden to return our test user."""
    _, user, _ = org_user_company

    def _override():
        return user

    app.dependency_overrides[get_current_user] = _override
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def other_org_user(db):
    """A user in a different organization (for cross-org auth tests)."""
    org = Organization(name="Other Org", slug="other-org")
    db.add(org)
    db.flush()
    user = User(
        email="other@example.com",
        hashed_password="not-used",
        full_name="Other User",
        is_active=True,
    )
    db.add(user)
    db.flush()
    db.add(UserOrganization(user_id=user.id, organization_id=org.id, role=UserRole.ADMIN))
    db.commit()
    return user
