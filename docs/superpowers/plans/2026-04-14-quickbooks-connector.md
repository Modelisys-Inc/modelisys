# QuickBooks Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v1 QuickBooks Online connector — OAuth connect + trial balance pull with suggest-and-review mapping bootstrap — against Intuit sandbox.

**Architecture:** Dedicated `backend/app/integrations/quickbooks/` module. Two-step preview/commit flow. Per-company `QuickBooksConnection` row with Fernet-encrypted tokens. Frontend page at `/settings/companies/[id]/quickbooks` with three states (not-connected, connected, review).

**Tech Stack:** FastAPI 0.115, SQLAlchemy 2.0 (sync), Pydantic v2, Alembic, httpx, cryptography (Fernet), respx (test mocks); Next.js 16 / React 19 / shadcn / Playwright.

**Spec:** [docs/superpowers/specs/2026-04-14-quickbooks-connector-design.md](../specs/2026-04-14-quickbooks-connector-design.md)

## Spec deviations (data-model adaptation)

The spec assumed a simplified TB model. The real Modelisys schema requires:

1. **TB writes use `TrialBalanceEntry(company_id, account_id, fiscal_year, month, amount)`** — not `(as_of_date, debit, credit)`. `account_id` references `ChartOfAccount`, which we **upsert** during commit (UNIQUE on `company_id, account_number`).
2. **Preview takes `fiscal_year` + `month`**, not `as_of_date`. QBO date range is computed from `(company.fiscal_year_end, fiscal_year, month, is_cumulative_tb)`.
3. **`amount` is signed** = `debit - credit` (assets/expenses positive, liabilities/equity/revenue negative). We pass through what QBO returns.
4. **Currency** is taken from `Company.currency` (no per-pull selector).
5. **Link codes are enumerated** by parsing `FinancialStatementMapping.structure` JSON across the four `mapping_type` rows (`bilan`, `resultats`, `capex`, `baiia`) for the user's org. New endpoint `GET /api/quickbooks/link-codes` returns the flat list.
6. **`AccountMapping` upsert** sets `link_code` and `description` only; other fields (summary_ef, divisions, etc.) left alone for existing rows or defaulted for new ones.

---

## Phase 0 — Engineering prerequisites

### Task 0.1: Add Python dependencies

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1:** Append `cryptography==43.0.1` and `respx==0.21.1` to the bottom of `backend/requirements.txt`. Both are already needed (cryptography is transitively available via python-jose; pinning makes it explicit since we depend on Fernet directly).

- [ ] **Step 2:** Run `pip install -r backend/requirements.txt` from `backend/` to verify they resolve.

- [ ] **Step 3:** Commit.

```bash
git add backend/requirements.txt
git commit -m "build: add cryptography and respx for QBO connector"
```

### Task 0.2: Generate token encryption key for local dev

**Files:**
- Modify: `.env` (local only — gitignored)
- Modify: `backend/.env.example`

- [ ] **Step 1:** Run `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` to generate a key.

- [ ] **Step 2:** Add to `.env`:

```
QBO_TOKEN_ENCRYPTION_KEY=<generated-key>
INTUIT_CLIENT_ID=
INTUIT_CLIENT_SECRET=
INTUIT_ENVIRONMENT=sandbox
INTUIT_REDIRECT_URI=http://localhost:8000/api/quickbooks/callback
```

- [ ] **Step 3:** Add the same keys (with empty values) to `backend/.env.example` if it exists; create it if it doesn't, copying the existing settings.

- [ ] **Step 4:** Commit `.env.example` only (never `.env`).

```bash
git add backend/.env.example
git commit -m "build: document QBO env vars in .env.example"
```

---

## Phase 1 — Data model + encryption

### Task 1.1: Add settings to `config.py`

**Files:**
- Modify: `backend/app/config.py`

- [ ] **Step 1:** Add fields to the `Settings` class (after `frontend_url`):

```python
    # QuickBooks integration
    intuit_client_id: str = ""
    intuit_client_secret: str = ""
    intuit_environment: str = "sandbox"  # sandbox | production
    intuit_redirect_uri: str = "http://localhost:8000/api/quickbooks/callback"
    qbo_token_encryption_key: str = ""

    @field_validator("qbo_token_encryption_key")
    @classmethod
    def validate_qbo_key(cls, v: str) -> str:
        env = os.getenv("ENVIRONMENT", "development")
        if env == "production" and not v:
            raise ValueError("QBO_TOKEN_ENCRYPTION_KEY must be set in production")
        return v

    @property
    def intuit_oauth_base(self) -> str:
        return "https://oauth.platform.intuit.com"

    @property
    def intuit_api_base(self) -> str:
        if self.intuit_environment == "production":
            return "https://quickbooks.api.intuit.com"
        return "https://sandbox-quickbooks.api.intuit.com"

    @property
    def intuit_authorize_base(self) -> str:
        return "https://appcenter.intuit.com/connect/oauth2"
```

- [ ] **Step 2:** Run `cd backend && python -c "from app.config import settings; print(settings.intuit_api_base)"` to verify.

- [ ] **Step 3:** Commit.

```bash
git add backend/app/config.py
git commit -m "feat(qbo): add Intuit and token encryption settings"
```

### Task 1.2: Encryption helper module + tests

**Files:**
- Create: `backend/app/integrations/__init__.py` (empty)
- Create: `backend/app/integrations/quickbooks/__init__.py` (empty)
- Create: `backend/app/integrations/quickbooks/encryption.py`
- Create: `backend/tests/integrations/__init__.py` (empty)
- Create: `backend/tests/integrations/quickbooks/__init__.py` (empty)
- Create: `backend/tests/integrations/quickbooks/test_encryption.py`

- [ ] **Step 1: Write the failing test** (`backend/tests/integrations/quickbooks/test_encryption.py`):

```python
import pytest
from cryptography.fernet import Fernet, InvalidToken

from app.integrations.quickbooks import encryption


@pytest.fixture(autouse=True)
def patch_key(monkeypatch):
    key = Fernet.generate_key().decode()
    monkeypatch.setattr(encryption, "_get_key", lambda: key.encode())


def test_encrypt_decrypt_round_trip():
    plain = "ya29.A0AfH6S..."
    cipher = encryption.encrypt(plain)
    assert cipher != plain
    assert encryption.decrypt(cipher) == plain


def test_encrypt_produces_different_ciphertext_each_call():
    a = encryption.encrypt("same-token")
    b = encryption.encrypt("same-token")
    assert a != b
    assert encryption.decrypt(a) == encryption.decrypt(b) == "same-token"


def test_decrypt_with_wrong_key_raises(monkeypatch):
    cipher = encryption.encrypt("token")
    monkeypatch.setattr(encryption, "_get_key", lambda: Fernet.generate_key())
    with pytest.raises(InvalidToken):
        encryption.decrypt(cipher)


def test_encrypt_none_returns_none():
    assert encryption.encrypt(None) is None
    assert encryption.decrypt(None) is None
```

- [ ] **Step 2: Run** `cd backend && python -m pytest tests/integrations/quickbooks/test_encryption.py -v` — expect import error.

- [ ] **Step 3: Write encryption module** (`backend/app/integrations/quickbooks/encryption.py`):

```python
"""Fernet-based encryption for QuickBooks OAuth tokens at rest."""
from cryptography.fernet import Fernet

from app.config import settings


def _get_key() -> bytes:
    key = settings.qbo_token_encryption_key
    if not key:
        raise RuntimeError("QBO_TOKEN_ENCRYPTION_KEY is not configured")
    return key.encode()


def encrypt(plaintext: str | None) -> str | None:
    if plaintext is None:
        return None
    return Fernet(_get_key()).encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str | None) -> str | None:
    if ciphertext is None:
        return None
    return Fernet(_get_key()).decrypt(ciphertext.encode()).decode()
```

- [ ] **Step 4: Run tests** — expect all 4 to pass.

- [ ] **Step 5: Commit.**

```bash
git add backend/app/integrations backend/tests/integrations
git commit -m "feat(qbo): add Fernet token encryption helpers"
```

### Task 1.3: `QuickBooksConnection` model

**Files:**
- Create: `backend/app/models/quickbooks_connection.py`
- Modify: `backend/app/models/__init__.py` (if it explicitly imports models)
- Modify: `backend/app/models/company.py` (add reverse relationship)

- [ ] **Step 1:** Create the model:

```python
"""QuickBooks Online connection per company."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class QuickBooksConnection(Base):
    __tablename__ = "quickbooks_connections"
    __table_args__ = (
        UniqueConstraint("company_id", name="uq_quickbooks_connections_company_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    realm_id: Mapped[str] = mapped_column(String(64), nullable=False)
    access_token: Mapped[str] = mapped_column(String(2048), nullable=False)  # encrypted
    refresh_token: Mapped[str] = mapped_column(String(2048), nullable=False)  # encrypted
    access_token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    refresh_token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # active | revoked
    connected_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    company = relationship("Company", back_populates="quickbooks_connection")
```

- [ ] **Step 2:** In `backend/app/models/company.py`, add to the `Company` class relationships:

```python
    quickbooks_connection = relationship(
        "QuickBooksConnection",
        back_populates="company",
        uselist=False,
        cascade="all, delete-orphan",
    )
```

- [ ] **Step 3:** If `backend/app/models/__init__.py` has explicit imports, add `from app.models.quickbooks_connection import QuickBooksConnection`. Otherwise no change.

- [ ] **Step 4:** Run `cd backend && python -c "from app.models.quickbooks_connection import QuickBooksConnection; print(QuickBooksConnection.__tablename__)"`.

- [ ] **Step 5:** Commit.

```bash
git add backend/app/models/quickbooks_connection.py backend/app/models/company.py backend/app/models/__init__.py
git commit -m "feat(qbo): add QuickBooksConnection model"
```

### Task 1.4: Alembic migration 007

**Files:**
- Create: `backend/alembic/versions/007_add_quickbooks_connections.py`

- [ ] **Step 1:** Write migration:

```python
"""add quickbooks_connections

Revision ID: 007
Revises: 006
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quickbooks_connections",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("realm_id", sa.String(64), nullable=False),
        sa.Column("access_token", sa.String(2048), nullable=False),
        sa.Column("refresh_token", sa.String(2048), nullable=False),
        sa.Column("access_token_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("refresh_token_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("connected_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("connected_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("company_id", name="uq_quickbooks_connections_company_id"),
    )
    op.create_index("ix_quickbooks_connections_company_id", "quickbooks_connections", ["company_id"])


def downgrade() -> None:
    op.drop_index("ix_quickbooks_connections_company_id", "quickbooks_connections")
    op.drop_table("quickbooks_connections")
```

- [ ] **Step 2:** Run `cd backend && alembic upgrade head` against a local Postgres (or skip if not running locally — tests will exercise it via `Base.metadata.create_all`). Verify with `alembic current`.

- [ ] **Step 3:** Run full pytest suite to ensure nothing broke: `cd backend && python -m pytest -x`.

- [ ] **Step 4:** Commit.

```bash
git add backend/alembic/versions/007_add_quickbooks_connections.py
git commit -m "feat(qbo): add migration for quickbooks_connections table"
```

---

## Phase 2 — OAuth flow

### Task 2.1: State JWT helpers + tests

**Files:**
- Create: `backend/app/integrations/quickbooks/oauth.py`
- Create: `backend/tests/integrations/quickbooks/test_oauth_state.py`

- [ ] **Step 1: Write tests** for state JWT round-trip (10 min TTL, audience check, company_id, user_id):

```python
import time
import uuid

import pytest

from app.integrations.quickbooks import oauth


def test_state_round_trip():
    company_id = uuid.uuid4()
    user_id = uuid.uuid4()
    token = oauth.create_state(company_id, user_id)
    payload = oauth.verify_state(token)
    assert payload.company_id == company_id
    assert payload.user_id == user_id


def test_state_wrong_audience_rejected():
    from app.utils.security import create_access_token
    bad = create_access_token({"sub": str(uuid.uuid4())})
    with pytest.raises(oauth.InvalidStateError):
        oauth.verify_state(bad)


def test_state_expired_rejected(monkeypatch):
    monkeypatch.setattr(oauth, "_STATE_TTL_SECONDS", -1)
    token = oauth.create_state(uuid.uuid4(), uuid.uuid4())
    with pytest.raises(oauth.InvalidStateError):
        oauth.verify_state(token)


def test_state_garbage_rejected():
    with pytest.raises(oauth.InvalidStateError):
        oauth.verify_state("not-a-jwt")
```

- [ ] **Step 2: Run** — expect `ImportError`.

- [ ] **Step 3: Implement state helpers** (initial `oauth.py` — more added in 2.2):

```python
"""Intuit OAuth2 helpers: state JWT, authorize URL, token exchange + refresh."""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import settings

_STATE_AUDIENCE = "qbo-oauth"
_STATE_TTL_SECONDS = 600  # 10 minutes


class InvalidStateError(Exception):
    pass


class TokenExchangeError(Exception):
    pass


@dataclass
class StatePayload:
    company_id: uuid.UUID
    user_id: uuid.UUID


def create_state(company_id: uuid.UUID, user_id: uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "aud": _STATE_AUDIENCE,
        "company_id": str(company_id),
        "user_id": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=_STATE_TTL_SECONDS)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_state(token: str) -> StatePayload:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            audience=_STATE_AUDIENCE,
        )
    except JWTError as e:
        raise InvalidStateError(str(e)) from e
    return StatePayload(
        company_id=uuid.UUID(payload["company_id"]),
        user_id=uuid.UUID(payload["user_id"]),
    )
```

- [ ] **Step 4: Run tests** — all 4 pass.

- [ ] **Step 5: Commit.**

```bash
git add backend/app/integrations/quickbooks/oauth.py backend/tests/integrations/quickbooks/test_oauth_state.py
git commit -m "feat(qbo): add OAuth state JWT helpers"
```

### Task 2.2: Authorize URL + token exchange/refresh + tests (mocked Intuit)

**Files:**
- Modify: `backend/app/integrations/quickbooks/oauth.py`
- Create: `backend/tests/integrations/quickbooks/test_oauth_tokens.py`

- [ ] **Step 1: Append to `oauth.py`:**

```python
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int  # seconds
    x_refresh_token_expires_in: int  # seconds


def build_authorize_url(state: str) -> str:
    params = {
        "client_id": settings.intuit_client_id,
        "redirect_uri": settings.intuit_redirect_uri,
        "response_type": "code",
        "scope": "com.intuit.quickbooks.accounting",
        "state": state,
    }
    return f"{settings.intuit_authorize_base}?{urlencode(params)}"


def _token_endpoint() -> str:
    return f"{settings.intuit_oauth_base}/oauth2/v1/tokens/bearer_token"


def exchange_code_for_tokens(code: str) -> TokenResponse:
    """Exchange an authorization code for access + refresh tokens."""
    response = httpx.post(
        _token_endpoint(),
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.intuit_redirect_uri,
        },
        auth=(settings.intuit_client_id, settings.intuit_client_secret),
        headers={"Accept": "application/json"},
        timeout=15.0,
    )
    if response.status_code != 200:
        raise TokenExchangeError(f"Intuit token exchange failed: {response.status_code} {response.text}")
    return TokenResponse(**response.json())


def refresh_tokens(refresh_token: str) -> TokenResponse:
    response = httpx.post(
        _token_endpoint(),
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        auth=(settings.intuit_client_id, settings.intuit_client_secret),
        headers={"Accept": "application/json"},
        timeout=15.0,
    )
    if response.status_code != 200:
        raise TokenExchangeError(f"Intuit refresh failed: {response.status_code} {response.text}")
    return TokenResponse(**response.json())


def revoke_token(token: str) -> None:
    """Revoke a refresh or access token at Intuit. Failure is logged by caller, not raised."""
    response = httpx.post(
        f"{settings.intuit_oauth_base}/oauth2/v1/tokens/revoke",
        json={"token": token},
        auth=(settings.intuit_client_id, settings.intuit_client_secret),
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        timeout=15.0,
    )
    if response.status_code not in (200, 401):
        raise TokenExchangeError(f"Intuit revoke failed: {response.status_code} {response.text}")
```

- [ ] **Step 2: Write tests using respx:**

```python
import pytest
import respx
from httpx import Response

from app.config import settings
from app.integrations.quickbooks import oauth


@pytest.fixture
def intuit_creds(monkeypatch):
    monkeypatch.setattr(settings, "intuit_client_id", "test-client")
    monkeypatch.setattr(settings, "intuit_client_secret", "test-secret")
    monkeypatch.setattr(settings, "intuit_redirect_uri", "http://localhost:8000/api/quickbooks/callback")


def test_build_authorize_url(intuit_creds):
    url = oauth.build_authorize_url("state-jwt-here")
    assert url.startswith("https://appcenter.intuit.com/connect/oauth2?")
    assert "client_id=test-client" in url
    assert "scope=com.intuit.quickbooks.accounting" in url
    assert "state=state-jwt-here" in url


@respx.mock
def test_exchange_code_for_tokens(intuit_creds):
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer_token").mock(
        return_value=Response(200, json={
            "access_token": "AT-123",
            "refresh_token": "RT-456",
            "expires_in": 3600,
            "x_refresh_token_expires_in": 8640000,
            "token_type": "bearer",
        })
    )
    tokens = oauth.exchange_code_for_tokens("auth-code")
    assert tokens.access_token == "AT-123"
    assert tokens.refresh_token == "RT-456"
    assert tokens.expires_in == 3600


@respx.mock
def test_exchange_code_failure_raises(intuit_creds):
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer_token").mock(
        return_value=Response(400, json={"error": "invalid_grant"})
    )
    with pytest.raises(oauth.TokenExchangeError):
        oauth.exchange_code_for_tokens("bad")


@respx.mock
def test_refresh_tokens_success(intuit_creds):
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer_token").mock(
        return_value=Response(200, json={
            "access_token": "AT-new",
            "refresh_token": "RT-rotated",
            "expires_in": 3600,
            "x_refresh_token_expires_in": 8640000,
            "token_type": "bearer",
        })
    )
    tokens = oauth.refresh_tokens("RT-old")
    assert tokens.access_token == "AT-new"
    assert tokens.refresh_token == "RT-rotated"


@respx.mock
def test_refresh_tokens_invalid_grant_raises(intuit_creds):
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer_token").mock(
        return_value=Response(400, json={"error": "invalid_grant"})
    )
    with pytest.raises(oauth.TokenExchangeError):
        oauth.refresh_tokens("expired")


@respx.mock
def test_revoke_token_swallows_401(intuit_creds):
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/revoke").mock(
        return_value=Response(401)
    )
    oauth.revoke_token("RT-anything")  # no exception
```

- [ ] **Step 3: Run** `cd backend && python -m pytest tests/integrations/quickbooks/test_oauth_tokens.py -v` — all pass.

- [ ] **Step 4: Commit.**

```bash
git add backend/app/integrations/quickbooks/oauth.py backend/tests/integrations/quickbooks/test_oauth_tokens.py
git commit -m "feat(qbo): add Intuit OAuth token exchange, refresh, revoke"
```

### Task 2.3: Connection service (CRUD + token refresh logic) + tests

**Files:**
- Create: `backend/app/integrations/quickbooks/service.py`
- Create: `backend/tests/integrations/quickbooks/test_connection_service.py`

- [ ] **Step 1: Write tests** for `upsert_connection`, `get_valid_access_token`, `mark_revoked`, `delete_connection`.

```python
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import respx
from httpx import Response

from app.config import settings
from app.integrations.quickbooks import encryption, oauth, service
from app.models.company import Company
from app.models.organization import Organization
from app.models.quickbooks_connection import QuickBooksConnection
from app.models.user import User


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setattr(settings, "intuit_client_id", "client")
    monkeypatch.setattr(settings, "intuit_client_secret", "secret")
    from cryptography.fernet import Fernet
    monkeypatch.setattr(settings, "qbo_token_encryption_key", Fernet.generate_key().decode())


@pytest.fixture
def company_with_user(db):
    org = Organization(name="Org")
    db.add(org); db.flush()
    company = Company(organization_id=org.id, name="Co")
    db.add(company); db.flush()
    user = User(email="u@e.com", hashed_password="x", full_name="U", is_active=True)
    db.add(user); db.flush()
    return company, user


def test_upsert_creates_new_connection(db, company_with_user):
    company, user = company_with_user
    tokens = oauth.TokenResponse(access_token="AT", refresh_token="RT", expires_in=3600, x_refresh_token_expires_in=8640000)
    conn = service.upsert_connection(db, company.id, "realm-1", tokens, user.id)
    assert conn.realm_id == "realm-1"
    assert encryption.decrypt(conn.access_token) == "AT"
    assert encryption.decrypt(conn.refresh_token) == "RT"


def test_upsert_overwrites_existing(db, company_with_user):
    company, user = company_with_user
    t1 = oauth.TokenResponse(access_token="A1", refresh_token="R1", expires_in=3600, x_refresh_token_expires_in=8640000)
    t2 = oauth.TokenResponse(access_token="A2", refresh_token="R2", expires_in=3600, x_refresh_token_expires_in=8640000)
    service.upsert_connection(db, company.id, "realm-1", t1, user.id)
    conn = service.upsert_connection(db, company.id, "realm-2", t2, user.id)
    assert encryption.decrypt(conn.access_token) == "A2"
    assert conn.realm_id == "realm-2"
    assert db.query(QuickBooksConnection).count() == 1


def test_get_valid_access_token_returns_existing_when_fresh(db, company_with_user):
    company, user = company_with_user
    tokens = oauth.TokenResponse(access_token="AT", refresh_token="RT", expires_in=3600, x_refresh_token_expires_in=8640000)
    conn = service.upsert_connection(db, company.id, "r", tokens, user.id)
    assert service.get_valid_access_token(db, conn) == "AT"


@respx.mock
def test_get_valid_access_token_refreshes_when_expired(db, company_with_user):
    company, user = company_with_user
    tokens = oauth.TokenResponse(access_token="AT-old", refresh_token="RT-old", expires_in=3600, x_refresh_token_expires_in=8640000)
    conn = service.upsert_connection(db, company.id, "r", tokens, user.id)
    conn.access_token_expires_at = datetime.now(timezone.utc) - timedelta(seconds=10)
    db.commit()
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer_token").mock(
        return_value=Response(200, json={
            "access_token": "AT-new", "refresh_token": "RT-new",
            "expires_in": 3600, "x_refresh_token_expires_in": 8640000, "token_type": "bearer"
        })
    )
    assert service.get_valid_access_token(db, conn) == "AT-new"
    db.refresh(conn)
    assert encryption.decrypt(conn.refresh_token) == "RT-new"


@respx.mock
def test_get_valid_access_token_marks_revoked_on_invalid_grant(db, company_with_user):
    company, user = company_with_user
    tokens = oauth.TokenResponse(access_token="AT", refresh_token="RT", expires_in=3600, x_refresh_token_expires_in=8640000)
    conn = service.upsert_connection(db, company.id, "r", tokens, user.id)
    conn.access_token_expires_at = datetime.now(timezone.utc) - timedelta(seconds=10)
    db.commit()
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer_token").mock(
        return_value=Response(400, json={"error": "invalid_grant"})
    )
    with pytest.raises(service.ConnectionRevokedError):
        service.get_valid_access_token(db, conn)
    db.refresh(conn)
    assert conn.status == "revoked"
```

- [ ] **Step 2: Implement `service.py`:**

```python
"""QuickBooks connection lifecycle: upsert, refresh-if-needed, revoke."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.integrations.quickbooks import encryption, oauth
from app.models.quickbooks_connection import QuickBooksConnection

logger = logging.getLogger(__name__)

_REFRESH_SKEW_SECONDS = 60


class ConnectionRevokedError(Exception):
    pass


def upsert_connection(
    db: Session,
    company_id: uuid.UUID,
    realm_id: str,
    tokens: oauth.TokenResponse,
    user_id: uuid.UUID,
) -> QuickBooksConnection:
    now = datetime.now(timezone.utc)
    conn = db.query(QuickBooksConnection).filter(QuickBooksConnection.company_id == company_id).first()
    if conn is None:
        conn = QuickBooksConnection(
            company_id=company_id,
            realm_id=realm_id,
            access_token=encryption.encrypt(tokens.access_token),
            refresh_token=encryption.encrypt(tokens.refresh_token),
            access_token_expires_at=now + timedelta(seconds=tokens.expires_in),
            refresh_token_expires_at=now + timedelta(seconds=tokens.x_refresh_token_expires_in),
            status="active",
            connected_by_user_id=user_id,
        )
        db.add(conn)
    else:
        conn.realm_id = realm_id
        conn.access_token = encryption.encrypt(tokens.access_token)
        conn.refresh_token = encryption.encrypt(tokens.refresh_token)
        conn.access_token_expires_at = now + timedelta(seconds=tokens.expires_in)
        conn.refresh_token_expires_at = now + timedelta(seconds=tokens.x_refresh_token_expires_in)
        conn.status = "active"
        conn.connected_by_user_id = user_id
    db.commit()
    db.refresh(conn)
    return conn


def get_valid_access_token(db: Session, conn: QuickBooksConnection) -> str:
    """Return a non-expired access token, refreshing if needed.

    Raises ConnectionRevokedError if refresh fails — caller should surface a reconnect prompt.
    """
    if conn.status != "active":
        raise ConnectionRevokedError("connection is not active")

    now = datetime.now(timezone.utc)
    if conn.access_token_expires_at > now + timedelta(seconds=_REFRESH_SKEW_SECONDS):
        return encryption.decrypt(conn.access_token)

    refresh_plain = encryption.decrypt(conn.refresh_token)
    try:
        new_tokens = oauth.refresh_tokens(refresh_plain)
    except oauth.TokenExchangeError as e:
        logger.warning("QBO refresh failed for company %s: %s", conn.company_id, e)
        conn.status = "revoked"
        db.commit()
        raise ConnectionRevokedError("refresh failed") from e

    conn.access_token = encryption.encrypt(new_tokens.access_token)
    conn.refresh_token = encryption.encrypt(new_tokens.refresh_token)
    conn.access_token_expires_at = now + timedelta(seconds=new_tokens.expires_in)
    conn.refresh_token_expires_at = now + timedelta(seconds=new_tokens.x_refresh_token_expires_in)
    db.commit()
    db.refresh(conn)
    return new_tokens.access_token


def disconnect(db: Session, conn: QuickBooksConnection) -> None:
    """Revoke at Intuit (best-effort) and delete the local row."""
    try:
        oauth.revoke_token(encryption.decrypt(conn.refresh_token))
    except oauth.TokenExchangeError as e:
        logger.warning("QBO revoke failed for company %s: %s — proceeding with local delete", conn.company_id, e)
    db.delete(conn)
    db.commit()
```

- [ ] **Step 3: Run** `python -m pytest tests/integrations/quickbooks/ -v` — all pass.

- [ ] **Step 4: Commit.**

```bash
git add backend/app/integrations/quickbooks/service.py backend/tests/integrations/quickbooks/test_connection_service.py
git commit -m "feat(qbo): connection lifecycle service with refresh handling"
```

### Task 2.4: OAuth router + tests

**Files:**
- Create: `backend/app/schemas/quickbooks.py`
- Create: `backend/app/integrations/quickbooks/router.py`
- Modify: `backend/app/main.py` (register router)
- Create: `backend/tests/integrations/quickbooks/test_oauth_router.py`

- [ ] **Step 1: Schemas** (`backend/app/schemas/quickbooks.py`):

```python
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ConnectionStatusResponse(BaseModel):
    status: Literal["connected", "revoked", "not_connected"]
    realm_id: str | None = None
    connected_at: datetime | None = None
    connected_by_user_id: str | None = None


class TrialBalanceRowProposal(BaseModel):
    qbo_account_id: str
    account_number: str
    account_name: str
    qbo_account_type: str | None
    qbo_account_sub_type: str | None
    debit: float
    credit: float
    proposed_link_code: str | None
    confidence: Literal["high", "medium", "low"]
    existing_link_code: str | None


class TrialBalancePreviewRequest(BaseModel):
    fiscal_year: int
    month: int  # 1-12


class TrialBalancePreviewResponse(BaseModel):
    fiscal_year: int
    month: int
    currency: str
    fetched_at: datetime
    rows: list[TrialBalanceRowProposal]


class TrialBalanceCommitRow(BaseModel):
    account_number: str
    account_name: str
    debit: float
    credit: float
    link_code: str | None
    skip: bool = False


class TrialBalanceCommitRequest(BaseModel):
    fiscal_year: int
    month: int
    rows: list[TrialBalanceCommitRow]
    overwrite_existing_tb: bool = False


class TrialBalanceCommitResponse(BaseModel):
    accounts_imported: int
    mappings_created: int
    mappings_updated: int


class LinkCodeOption(BaseModel):
    code: str
    label: str
    mapping_type: str  # bilan | resultats | capex | baiia
```

- [ ] **Step 2: Router** (`backend/app/integrations/quickbooks/router.py`) — authorize, callback, status, disconnect endpoints. The TB endpoints come in Phase 3/4.

```python
"""QuickBooks Online OAuth + sync endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.integrations.quickbooks import oauth, service
from app.models.company import Company
from app.models.quickbooks_connection import QuickBooksConnection
from app.models.user import User, UserOrganization
from app.schemas.quickbooks import ConnectionStatusResponse

router = APIRouter(prefix="/api/quickbooks", tags=["quickbooks"])


def _get_company_for_user(db: Session, user: User, company_id: uuid.UUID) -> Company:
    company = db.query(Company).filter(Company.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    membership = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == user.id,
            UserOrganization.organization_id == company.organization_id,
        )
        .first()
    )
    if membership is None:
        raise HTTPException(status_code=403, detail="Not authorized for this company")
    return company


@router.get("/authorize")
def authorize(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)
    state = oauth.create_state(company.id, current_user.id)
    return RedirectResponse(oauth.build_authorize_url(state), status_code=307)


@router.get("/callback")
def callback(
    state: str,
    code: str | None = None,
    realmId: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    try:
        payload = oauth.verify_state(state)
    except oauth.InvalidStateError:
        raise HTTPException(status_code=400, detail="Invalid or expired authorization state")

    if error:
        return RedirectResponse(
            f"{settings.frontend_url}/settings/companies/{payload.company_id}/quickbooks?qbo=denied",
            status_code=307,
        )

    if not code or not realmId:
        raise HTTPException(status_code=400, detail="Missing code or realmId")

    user = db.query(User).filter(User.id == payload.user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=403, detail="User no longer active")

    company = _get_company_for_user(db, user, payload.company_id)

    try:
        tokens = oauth.exchange_code_for_tokens(code)
    except oauth.TokenExchangeError as e:
        raise HTTPException(status_code=502, detail=f"Token exchange with Intuit failed: {e}")

    service.upsert_connection(db, company.id, realmId, tokens, user.id)
    return RedirectResponse(
        f"{settings.frontend_url}/settings/companies/{company.id}/quickbooks?qbo=connected",
        status_code=307,
    )


@router.get("/companies/{company_id}/connection", response_model=ConnectionStatusResponse)
def get_connection_status(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)
    conn = db.query(QuickBooksConnection).filter(QuickBooksConnection.company_id == company.id).first()
    if conn is None:
        return ConnectionStatusResponse(status="not_connected")
    return ConnectionStatusResponse(
        status=conn.status if conn.status in ("active", "revoked") else "not_connected",
        realm_id=conn.realm_id,
        connected_at=conn.connected_at,
        connected_by_user_id=str(conn.connected_by_user_id) if conn.connected_by_user_id else None,
    )


# Map "active" status to "connected" for the response enum
@router.get("/companies/{company_id}/connection", response_model=ConnectionStatusResponse, include_in_schema=False)
def _alias(company_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_connection_status(company_id, current_user, db)
```

> **Note:** in the response model, `status` is `Literal["connected", "revoked", "not_connected"]` but the DB value is `"active"`. Fix the mapping by changing the schema or translating in the handler. Use this corrected handler:

```python
@router.get("/companies/{company_id}/connection", response_model=ConnectionStatusResponse)
def get_connection_status(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)
    conn = db.query(QuickBooksConnection).filter(QuickBooksConnection.company_id == company.id).first()
    if conn is None:
        return ConnectionStatusResponse(status="not_connected")
    status_label = "connected" if conn.status == "active" else "revoked"
    return ConnectionStatusResponse(
        status=status_label,
        realm_id=conn.realm_id,
        connected_at=conn.connected_at,
        connected_by_user_id=str(conn.connected_by_user_id) if conn.connected_by_user_id else None,
    )


@router.delete("/companies/{company_id}/connection", status_code=204)
def disconnect(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)
    conn = db.query(QuickBooksConnection).filter(QuickBooksConnection.company_id == company.id).first()
    if conn is None:
        raise HTTPException(status_code=404, detail="No QuickBooks connection")
    service.disconnect(db, conn)
    return None
```

(Drop the duplicate `_alias` and use the corrected `get_connection_status`.)

- [ ] **Step 3: Register in `backend/app/main.py`:**

```python
from app.integrations.quickbooks import router as quickbooks_router
# ...
app.include_router(quickbooks_router.router)
```

- [ ] **Step 4: Tests** (`backend/tests/integrations/quickbooks/test_oauth_router.py`) — happy path connect, denied, invalid state, cross-org user, disconnect:

```python
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import respx
from cryptography.fernet import Fernet
from httpx import Response

from app.config import settings
from app.integrations.quickbooks import oauth, service, encryption
from app.models.company import Company
from app.models.organization import Organization
from app.models.quickbooks_connection import QuickBooksConnection
from app.models.user import User, UserOrganization
from app.utils.security import hash_password


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setattr(settings, "intuit_client_id", "client")
    monkeypatch.setattr(settings, "intuit_client_secret", "secret")
    monkeypatch.setattr(settings, "qbo_token_encryption_key", Fernet.generate_key().decode())
    monkeypatch.setattr(settings, "frontend_url", "http://localhost:3000")


@pytest.fixture
def org_user_company(db):
    org = Organization(name="O")
    db.add(org); db.flush()
    user = User(email="u@x.com", hashed_password=hash_password("Password123!"), full_name="U", is_active=True)
    db.add(user); db.flush()
    db.add(UserOrganization(user_id=user.id, organization_id=org.id, role="owner"))
    company = Company(organization_id=org.id, name="C")
    db.add(company); db.commit()
    db.refresh(company)
    return org, user, company


def _login(client, email="u@x.com"):
    r = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_authorize_redirects_to_intuit(client, org_user_company):
    _, _, company = org_user_company
    headers = _login(client)
    r = client.get(f"/api/quickbooks/authorize?company_id={company.id}", headers=headers, follow_redirects=False)
    assert r.status_code == 307
    assert "appcenter.intuit.com/connect/oauth2" in r.headers["location"]


def test_authorize_rejects_other_org(client, db, org_user_company):
    _, _, company = org_user_company
    other_org = Organization(name="Other")
    db.add(other_org); db.flush()
    other_user = User(email="o@x.com", hashed_password=hash_password("Password123!"), full_name="O", is_active=True)
    db.add(other_user); db.flush()
    db.add(UserOrganization(user_id=other_user.id, organization_id=other_org.id, role="owner"))
    db.commit()
    headers = _login(client, "o@x.com")
    r = client.get(f"/api/quickbooks/authorize?company_id={company.id}", headers=headers, follow_redirects=False)
    assert r.status_code == 403


@respx.mock
def test_callback_creates_connection(client, db, org_user_company):
    _, user, company = org_user_company
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer_token").mock(
        return_value=Response(200, json={
            "access_token": "AT", "refresh_token": "RT",
            "expires_in": 3600, "x_refresh_token_expires_in": 8640000, "token_type": "bearer"
        })
    )
    state = oauth.create_state(company.id, user.id)
    r = client.get(f"/api/quickbooks/callback?state={state}&code=AUTH_CODE&realmId=12345", follow_redirects=False)
    assert r.status_code == 307
    assert "qbo=connected" in r.headers["location"]
    conn = db.query(QuickBooksConnection).filter(QuickBooksConnection.company_id == company.id).first()
    assert conn is not None
    assert conn.realm_id == "12345"


def test_callback_denied_redirects(client, org_user_company):
    _, user, company = org_user_company
    state = oauth.create_state(company.id, user.id)
    r = client.get(f"/api/quickbooks/callback?state={state}&error=access_denied", follow_redirects=False)
    assert r.status_code == 307
    assert "qbo=denied" in r.headers["location"]


def test_callback_invalid_state(client):
    r = client.get("/api/quickbooks/callback?state=garbage&code=x&realmId=1")
    assert r.status_code == 400


def test_status_not_connected(client, org_user_company):
    _, _, company = org_user_company
    headers = _login(client)
    r = client.get(f"/api/quickbooks/companies/{company.id}/connection", headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "not_connected"


def test_status_connected(client, db, org_user_company):
    _, user, company = org_user_company
    tokens = oauth.TokenResponse(access_token="AT", refresh_token="RT", expires_in=3600, x_refresh_token_expires_in=8640000)
    service.upsert_connection(db, company.id, "realm1", tokens, user.id)
    headers = _login(client)
    r = client.get(f"/api/quickbooks/companies/{company.id}/connection", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "connected"
    assert body["realm_id"] == "realm1"


@respx.mock
def test_disconnect_deletes_connection(client, db, org_user_company):
    _, user, company = org_user_company
    tokens = oauth.TokenResponse(access_token="AT", refresh_token="RT", expires_in=3600, x_refresh_token_expires_in=8640000)
    service.upsert_connection(db, company.id, "realm1", tokens, user.id)
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/revoke").mock(return_value=Response(200))
    headers = _login(client)
    r = client.delete(f"/api/quickbooks/companies/{company.id}/connection", headers=headers)
    assert r.status_code == 204
    assert db.query(QuickBooksConnection).count() == 0
```

- [ ] **Step 5: Run** `python -m pytest tests/integrations/quickbooks/ -v` — all pass.

- [ ] **Step 6: Commit.**

```bash
git add backend/app/schemas/quickbooks.py backend/app/integrations/quickbooks/router.py backend/app/main.py backend/tests/integrations/quickbooks/test_oauth_router.py
git commit -m "feat(qbo): OAuth authorize/callback/status/disconnect endpoints"
```

---

## Phase 3 — QBO API client + TB preview

### Task 3.1: Mapping rules table + tests

**Files:**
- Create: `backend/app/integrations/quickbooks/mapping_rules.py`
- Create: `backend/tests/integrations/quickbooks/test_mapping_rules.py`

The mapping rules use **generic-but-customizable** placeholder link codes. The user MUST customize these to match their real `FinancialStatementMapping.structure` link codes during onboarding. We document this in the release checklist.

- [ ] **Step 1: Implement.**

```python
"""QBO AccountType / AccountSubType -> Modelisys link_code proposals.

These are GENERIC defaults. Each Modelisys org's FinancialStatementMapping uses
custom link_codes; users can override via the review screen on first import.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass
class Proposal:
    link_code: str | None
    confidence: Literal["high", "medium", "low"]
    reason: str


# (account_type, account_sub_type) -> link_code
_HIGH_CONFIDENCE: dict[tuple[str, str], str] = {
    # Income
    ("Income", "SalesOfProductIncome"): "revenus.ventes_produits",
    ("Income", "ServiceFeeIncome"): "revenus.ventes_services",
    ("Income", "DiscountsRefundsGiven"): "revenus.escomptes",
    ("Income", "OtherPrimaryIncome"): "revenus.autres",
    ("Other Income", "OtherMiscellaneousIncome"): "revenus.autres_revenus",
    ("Other Income", "InterestEarned"): "revenus.interets",

    # COGS
    ("Cost of Goods Sold", "SuppliesMaterialsCogs"): "couts.matieres",
    ("Cost of Goods Sold", "EquipmentRentalCogs"): "couts.location_equipement",
    ("Cost of Goods Sold", "ShippingFreightDeliveryCos"): "couts.transport",
    ("Cost of Goods Sold", "OtherCostsOfServiceCos"): "couts.autres",

    # Expense
    ("Expense", "PayrollExpenses"): "charges.salaires",
    ("Expense", "OfficeGeneralAdministrativeExpenses"): "charges.administration",
    ("Expense", "RentOrLeaseOfBuildings"): "charges.loyer",
    ("Expense", "Insurance"): "charges.assurances",
    ("Expense", "Utilities"): "charges.services_publics",
    ("Expense", "TravelMeals"): "charges.deplacements",
    ("Expense", "Advertising"): "charges.publicite",
    ("Expense", "BankCharges"): "charges.frais_bancaires",
    ("Expense", "Depreciation"): "charges.amortissement",

    # Bank / Cash
    ("Bank", "CashOnHand"): "actif.encaisse",
    ("Bank", "Checking"): "actif.encaisse",
    ("Bank", "Savings"): "actif.encaisse",
    ("Bank", "MoneyMarket"): "actif.placements",

    # AR / AP
    ("Accounts Receivable", "AccountsReceivable"): "actif.comptes_a_recevoir",
    ("Accounts Payable", "AccountsPayable"): "passif.comptes_a_payer",
    ("Credit Card", "CreditCard"): "passif.cartes_credit",

    # Other current
    ("Other Current Asset", "Inventory"): "actif.stocks",
    ("Other Current Asset", "PrepaidExpenses"): "actif.frais_payes_avance",
    ("Other Current Liability", "FederalIncomeTaxPayable"): "passif.impots_a_payer",
    ("Other Current Liability", "PayrollTaxPayable"): "passif.charges_sociales",
    ("Other Current Liability", "SalesTaxPayable"): "passif.taxes_a_payer",

    # Fixed assets
    ("Fixed Asset", "MachineryAndEquipment"): "actif.equipement",
    ("Fixed Asset", "Buildings"): "actif.batiments",
    ("Fixed Asset", "Vehicles"): "actif.vehicules",
    ("Fixed Asset", "FurnitureAndFixtures"): "actif.mobilier",
    ("Fixed Asset", "Land"): "actif.terrain",
    ("Fixed Asset", "AccumulatedDepreciation"): "actif.amortissement_cumule",

    # Long-term
    ("Long Term Liability", "LongTermDebt"): "passif.dette_long_terme",
    ("Long Term Liability", "ShareholderNotesPayable"): "passif.avances_actionnaires",

    # Equity
    ("Equity", "OwnersEquity"): "capitaux.capital_actions",
    ("Equity", "RetainedEarnings"): "capitaux.benefices_non_repartis",
    ("Equity", "AccumulatedAdjustment"): "capitaux.ajustements",
}

# Type-only fallbacks (medium confidence)
_MEDIUM_CONFIDENCE: dict[str, str] = {
    "Income": "revenus.autres",
    "Other Income": "revenus.autres_revenus",
    "Cost of Goods Sold": "couts.autres",
    "Expense": "charges.administration",
    "Other Expense": "charges.autres",
    "Bank": "actif.encaisse",
    "Accounts Receivable": "actif.comptes_a_recevoir",
    "Accounts Payable": "passif.comptes_a_payer",
    "Credit Card": "passif.cartes_credit",
    "Other Current Asset": "actif.autres_actifs_court_terme",
    "Other Current Liability": "passif.autres_passifs_court_terme",
    "Fixed Asset": "actif.immobilisations",
    "Other Asset": "actif.autres",
    "Long Term Liability": "passif.dette_long_terme",
    "Equity": "capitaux.autres",
}


def propose(account_type: str | None, account_sub_type: str | None, account_name: str | None = None) -> Proposal:
    if account_type and account_sub_type:
        link = _HIGH_CONFIDENCE.get((account_type, account_sub_type))
        if link:
            return Proposal(link_code=link, confidence="high", reason=f"{account_type}/{account_sub_type} exact match")
    if account_type:
        link = _MEDIUM_CONFIDENCE.get(account_type)
        if link:
            return Proposal(link_code=link, confidence="medium", reason=f"{account_type} type fallback")
    return Proposal(link_code=None, confidence="low", reason="no rule matched — manual mapping required")
```

- [ ] **Step 2: Tests.**

```python
from app.integrations.quickbooks.mapping_rules import propose


def test_high_confidence_exact_match():
    p = propose("Income", "SalesOfProductIncome")
    assert p.confidence == "high"
    assert p.link_code == "revenus.ventes_produits"


def test_medium_confidence_type_only():
    p = propose("Expense", "UnknownSubType")
    assert p.confidence == "medium"
    assert p.link_code == "charges.administration"


def test_low_confidence_no_match():
    p = propose("MysteryType", "MysterySub")
    assert p.confidence == "low"
    assert p.link_code is None


def test_handles_none_inputs():
    p = propose(None, None)
    assert p.confidence == "low"
    assert p.link_code is None
```

- [ ] **Step 3: Run + commit.**

```bash
python -m pytest tests/integrations/quickbooks/test_mapping_rules.py -v
git add backend/app/integrations/quickbooks/mapping_rules.py backend/tests/integrations/quickbooks/test_mapping_rules.py
git commit -m "feat(qbo): default account-type to link-code mapping rules"
```

### Task 3.2: QBO API client (TB report + accounts query) + tests

**Files:**
- Create: `backend/app/integrations/quickbooks/client.py`
- Create: `backend/tests/integrations/quickbooks/test_client.py`

- [ ] **Step 1: Implement.**

```python
"""Thin httpx wrapper for QuickBooks Online accounting API."""
from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.integrations.quickbooks import service
from app.models.quickbooks_connection import QuickBooksConnection

logger = logging.getLogger(__name__)


class QBOClientError(Exception):
    def __init__(self, message: str, status_code: int | None = None, intuit_tid: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.intuit_tid = intuit_tid


def _api_url(realm_id: str, path: str) -> str:
    return f"{settings.intuit_api_base}/v3/company/{realm_id}{path}"


def _request(
    db: Session,
    conn: QuickBooksConnection,
    method: str,
    path: str,
    params: dict | None = None,
    *,
    _retried_401: bool = False,
) -> dict[str, Any]:
    access_token = service.get_valid_access_token(db, conn)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }
    url = _api_url(conn.realm_id, path)
    try:
        response = httpx.request(method, url, params=params, headers=headers, timeout=15.0)
    except httpx.TimeoutException as e:
        raise QBOClientError(f"QBO request timed out: {e}", status_code=504) from e

    intuit_tid = response.headers.get("intuit_tid")

    if response.status_code == 401 and not _retried_401:
        # Force-refresh and retry once
        from datetime import datetime, timezone
        conn.access_token_expires_at = datetime.now(timezone.utc)
        db.commit()
        return _request(db, conn, method, path, params, _retried_401=True)

    if response.status_code == 429:
        retry_after = float(response.headers.get("Retry-After", "1"))
        time.sleep(min(retry_after, 5.0))
        try:
            response = httpx.request(method, url, params=params, headers=headers, timeout=15.0)
        except httpx.TimeoutException as e:
            raise QBOClientError("QBO retry after 429 timed out", status_code=504) from e

    if response.status_code >= 500:
        time.sleep(1.0)
        try:
            response = httpx.request(method, url, params=params, headers=headers, timeout=15.0)
        except httpx.TimeoutException as e:
            raise QBOClientError("QBO retry after 5xx timed out", status_code=504) from e

    if response.status_code >= 400:
        logger.warning(
            "QBO error realm=%s path=%s status=%s intuit_tid=%s body=%s",
            conn.realm_id, path, response.status_code, intuit_tid, response.text[:500]
        )
        raise QBOClientError(
            f"QBO API error: {response.status_code}",
            status_code=response.status_code,
            intuit_tid=intuit_tid,
        )

    return response.json()


def get_trial_balance_report(
    db: Session, conn: QuickBooksConnection, start_date: str, end_date: str
) -> dict[str, Any]:
    """Fetch the TrialBalance report. Dates are YYYY-MM-DD."""
    return _request(
        db, conn, "GET", "/reports/TrialBalance",
        params={"start_date": start_date, "end_date": end_date, "accounting_method": "Accrual"},
    )


def list_accounts(db: Session, conn: QuickBooksConnection) -> list[dict[str, Any]]:
    """Fetch all Accounts via QueryAPI."""
    body = _request(
        db, conn, "GET", "/query",
        params={"query": "SELECT * FROM Account MAXRESULTS 1000", "minorversion": "65"},
    )
    return body.get("QueryResponse", {}).get("Account", [])
```

- [ ] **Step 2: Tests** (mock the underlying httpx call):

```python
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import respx
from cryptography.fernet import Fernet
from httpx import Response

from app.config import settings
from app.integrations.quickbooks import client, encryption, oauth, service
from app.models.company import Company
from app.models.organization import Organization
from app.models.user import User


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setattr(settings, "intuit_environment", "sandbox")
    monkeypatch.setattr(settings, "intuit_client_id", "c")
    monkeypatch.setattr(settings, "intuit_client_secret", "s")
    monkeypatch.setattr(settings, "qbo_token_encryption_key", Fernet.generate_key().decode())


@pytest.fixture
def conn(db):
    org = Organization(name="O"); db.add(org); db.flush()
    company = Company(organization_id=org.id, name="C"); db.add(company); db.flush()
    user = User(email="u@e.com", hashed_password="x", full_name="U", is_active=True); db.add(user); db.flush()
    tokens = oauth.TokenResponse(access_token="AT", refresh_token="RT", expires_in=3600, x_refresh_token_expires_in=8640000)
    return service.upsert_connection(db, company.id, "realm-1", tokens, user.id)


@respx.mock
def test_get_trial_balance_success(db, conn):
    respx.get("https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/reports/TrialBalance").mock(
        return_value=Response(200, json={"Header": {}, "Rows": {}})
    )
    body = client.get_trial_balance_report(db, conn, "2026-03-01", "2026-03-31")
    assert "Header" in body


@respx.mock
def test_401_triggers_refresh_then_retry(db, conn):
    route = respx.get("https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/reports/TrialBalance")
    route.side_effect = [
        Response(401, json={"error": "expired"}),
        Response(200, json={"Header": {}, "Rows": {}}),
    ]
    refresh = respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer_token").mock(
        return_value=Response(200, json={
            "access_token": "AT2", "refresh_token": "RT2",
            "expires_in": 3600, "x_refresh_token_expires_in": 8640000, "token_type": "bearer"
        })
    )
    body = client.get_trial_balance_report(db, conn, "2026-03-01", "2026-03-31")
    assert "Header" in body
    assert refresh.called


@respx.mock
def test_429_honors_retry_after_then_succeeds(db, conn, monkeypatch):
    monkeypatch.setattr(client.time, "sleep", lambda _: None)
    route = respx.get("https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/reports/TrialBalance")
    route.side_effect = [
        Response(429, headers={"Retry-After": "0"}),
        Response(200, json={"Rows": {}}),
    ]
    assert client.get_trial_balance_report(db, conn, "a", "b") == {"Rows": {}}


@respx.mock
def test_5xx_retries_then_raises_on_second(db, conn, monkeypatch):
    monkeypatch.setattr(client.time, "sleep", lambda _: None)
    route = respx.get("https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/reports/TrialBalance")
    route.side_effect = [Response(500), Response(500)]
    with pytest.raises(client.QBOClientError) as exc:
        client.get_trial_balance_report(db, conn, "a", "b")
    assert exc.value.status_code == 500


@respx.mock
def test_list_accounts_returns_array(db, conn):
    respx.get("https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/query").mock(
        return_value=Response(200, json={"QueryResponse": {"Account": [{"Id": "1", "Name": "Cash"}]}})
    )
    accounts = client.list_accounts(db, conn)
    assert accounts == [{"Id": "1", "Name": "Cash"}]
```

- [ ] **Step 3: Run + commit.**

```bash
python -m pytest tests/integrations/quickbooks/test_client.py -v
git add backend/app/integrations/quickbooks/client.py backend/tests/integrations/quickbooks/test_client.py
git commit -m "feat(qbo): httpx-based API client with refresh, throttle, and retry"
```

### Task 3.3: TB report parser + service.propose_trial_balance + tests

**Files:**
- Modify: `backend/app/integrations/quickbooks/service.py` (add functions)
- Create: `backend/tests/integrations/quickbooks/fixtures/trial_balance_sample.json`
- Create: `backend/tests/integrations/quickbooks/test_tb_proposals.py`

- [ ] **Step 1: Append to `service.py`:**

```python
from datetime import date
from typing import Any

from app.integrations.quickbooks import client as qbo_client
from app.integrations.quickbooks.mapping_rules import propose, Proposal
from app.models.account_mapping import AccountMapping
from app.models.company import Company


def parse_trial_balance_report(report: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten the QBO TrialBalance report into rows with account_id, account_number, name, debit, credit.

    QBO returns a nested 'Rows.Row' structure where data rows have ColData=[{value: name + (number)}, {value: debit}, {value: credit}].
    Account ID is in ColData[0].id.
    """
    out: list[dict[str, Any]] = []

    def walk(rows: list[dict[str, Any]]):
        for row in rows:
            if row.get("type") == "Section" and "Rows" in row and "Row" in row["Rows"]:
                walk(row["Rows"]["Row"])
            elif "ColData" in row:
                cols = row["ColData"]
                if len(cols) < 3:
                    continue
                name_col = cols[0]
                name_value = name_col.get("value", "")
                qbo_account_id = name_col.get("id", "")
                # Account number is parenthesized in the name when present, e.g. "Sales (4000)"
                account_number = ""
                account_name = name_value
                if "(" in name_value and name_value.rstrip().endswith(")"):
                    open_paren = name_value.rfind("(")
                    account_name = name_value[:open_paren].strip()
                    account_number = name_value[open_paren + 1:-1].strip()
                debit_str = cols[1].get("value", "") or "0"
                credit_str = cols[2].get("value", "") or "0"
                try:
                    debit = float(debit_str)
                    credit = float(credit_str)
                except ValueError:
                    debit = credit = 0.0
                out.append({
                    "qbo_account_id": qbo_account_id,
                    "account_number": account_number or qbo_account_id,
                    "account_name": account_name,
                    "debit": debit,
                    "credit": credit,
                })

    rows = report.get("Rows", {}).get("Row", [])
    walk(rows)
    return out


def _date_range_for(company: Company, fiscal_year: int, month: int) -> tuple[str, str]:
    """Return (start_date, end_date) ISO strings for the QBO TB pull.

    If is_cumulative_tb: range is fiscal-year-start..end-of-month (YTD).
    Otherwise: range is just the month itself.
    """
    fye_month, fye_day = (int(p) for p in company.fiscal_year_end.split("-"))
    fy_start_month = (fye_month % 12) + 1
    fy_start_year = fiscal_year - 1 if fy_start_month != 1 else fiscal_year
    fy_start = date(fy_start_year, fy_start_month, 1)

    end_year = fy_start_year + (1 if month + fy_start_month - 1 > 12 else 0)
    end_month = ((month + fy_start_month - 2) % 12) + 1
    # last day of end_month
    if end_month == 12:
        end_date = date(end_year, 12, 31)
    else:
        from calendar import monthrange
        end_date = date(end_year, end_month, monthrange(end_year, end_month)[1])

    if company.is_cumulative_tb:
        return fy_start.isoformat(), end_date.isoformat()
    # single month
    start_date = date(end_year, end_month, 1)
    return start_date.isoformat(), end_date.isoformat()


def propose_trial_balance(
    db: Session, conn: QuickBooksConnection, company: Company, fiscal_year: int, month: int
) -> dict[str, Any]:
    start_iso, end_iso = _date_range_for(company, fiscal_year, month)
    report = qbo_client.get_trial_balance_report(db, conn, start_iso, end_iso)
    accounts = qbo_client.list_accounts(db, conn)
    accounts_by_id = {a["Id"]: a for a in accounts}

    existing_mappings = {
        m.account_number: m
        for m in db.query(AccountMapping).filter(AccountMapping.company_id == company.id).all()
    }

    rows = []
    for r in parse_trial_balance_report(report):
        acct_meta = accounts_by_id.get(r["qbo_account_id"], {})
        # Prefer AcctNum from metadata when present
        acct_num = acct_meta.get("AcctNum") or r["account_number"]
        type_ = acct_meta.get("AccountType")
        sub_type = acct_meta.get("AccountSubType")
        prop = propose(type_, sub_type, r["account_name"])
        existing = existing_mappings.get(acct_num)
        rows.append({
            "qbo_account_id": r["qbo_account_id"],
            "account_number": acct_num,
            "account_name": r["account_name"],
            "qbo_account_type": type_,
            "qbo_account_sub_type": sub_type,
            "debit": r["debit"],
            "credit": r["credit"],
            "proposed_link_code": prop.link_code,
            "confidence": prop.confidence,
            "existing_link_code": existing.link_code if existing else None,
        })
    return {"currency": company.currency, "rows": rows}
```

- [ ] **Step 2: Create fixture** at `backend/tests/integrations/quickbooks/fixtures/trial_balance_sample.json`:

```json
{
  "Header": {"ReportName": "TrialBalance", "StartPeriod": "2026-03-01", "EndPeriod": "2026-03-31"},
  "Rows": {
    "Row": [
      {"ColData": [{"value": "Cash (1000)", "id": "1"}, {"value": "5000.00"}, {"value": ""}]},
      {"ColData": [{"value": "Sales (4000)", "id": "42"}, {"value": ""}, {"value": "12500.00"}]},
      {"ColData": [{"value": "Office Supplies (6010)", "id": "60"}, {"value": "300.00"}, {"value": ""}]}
    ]
  }
}
```

- [ ] **Step 3: Tests:**

```python
import json
import pathlib
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import respx
from cryptography.fernet import Fernet
from httpx import Response

from app.config import settings
from app.integrations.quickbooks import oauth, service
from app.models.account_mapping import AccountMapping
from app.models.company import Company
from app.models.organization import Organization
from app.models.user import User

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "trial_balance_sample.json"


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setattr(settings, "intuit_environment", "sandbox")
    monkeypatch.setattr(settings, "intuit_client_id", "c")
    monkeypatch.setattr(settings, "intuit_client_secret", "s")
    monkeypatch.setattr(settings, "qbo_token_encryption_key", Fernet.generate_key().decode())


def test_parse_trial_balance_extracts_rows():
    report = json.loads(FIXTURE.read_text())
    rows = service.parse_trial_balance_report(report)
    assert len(rows) == 3
    cash = next(r for r in rows if r["account_number"] == "1000")
    assert cash["account_name"] == "Cash"
    assert cash["debit"] == 5000.0
    assert cash["credit"] == 0.0
    sales = next(r for r in rows if r["account_number"] == "4000")
    assert sales["credit"] == 12500.0


def test_date_range_non_cumulative_single_month():
    company = Company(name="C", fiscal_year_end="12-31", is_cumulative_tb=False)
    start, end = service._date_range_for(company, 2026, 3)
    assert start == "2026-03-01"
    assert end == "2026-03-31"


def test_date_range_cumulative_ytd():
    company = Company(name="C", fiscal_year_end="12-31", is_cumulative_tb=True)
    start, end = service._date_range_for(company, 2026, 3)
    assert start == "2026-01-01"
    assert end == "2026-03-31"


@respx.mock
def test_propose_trial_balance_combines_tb_and_accounts(db):
    org = Organization(name="O"); db.add(org); db.flush()
    company = Company(organization_id=org.id, name="C", currency="USD"); db.add(company); db.flush()
    user = User(email="u@e.com", hashed_password="x", full_name="U", is_active=True); db.add(user); db.flush()
    tokens = oauth.TokenResponse(access_token="AT", refresh_token="RT", expires_in=3600, x_refresh_token_expires_in=8640000)
    conn = service.upsert_connection(db, company.id, "realm-1", tokens, user.id)
    db.add(AccountMapping(company_id=company.id, account_number="1000", description="Cash", link_code="actif.encaisse"))
    db.commit()

    respx.get("https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/reports/TrialBalance").mock(
        return_value=Response(200, json=json.loads(FIXTURE.read_text()))
    )
    respx.get("https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/query").mock(
        return_value=Response(200, json={"QueryResponse": {"Account": [
            {"Id": "1", "AcctNum": "1000", "Name": "Cash", "AccountType": "Bank", "AccountSubType": "Checking"},
            {"Id": "42", "AcctNum": "4000", "Name": "Sales", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Id": "60", "AcctNum": "6010", "Name": "Office Supplies", "AccountType": "Expense", "AccountSubType": "OfficeGeneralAdministrativeExpenses"},
        ]}})
    )
    result = service.propose_trial_balance(db, conn, company, 2026, 3)
    assert result["currency"] == "USD"
    rows = result["rows"]
    cash = next(r for r in rows if r["account_number"] == "1000")
    assert cash["proposed_link_code"] == "actif.encaisse"
    assert cash["confidence"] == "high"
    assert cash["existing_link_code"] == "actif.encaisse"
    sales = next(r for r in rows if r["account_number"] == "4000")
    assert sales["proposed_link_code"] == "revenus.ventes_produits"
    assert sales["existing_link_code"] is None
```

- [ ] **Step 4: Run + commit.**

```bash
python -m pytest tests/integrations/quickbooks/test_tb_proposals.py -v
git add backend/app/integrations/quickbooks/service.py backend/tests/integrations/quickbooks/
git commit -m "feat(qbo): parse TB report and propose mappings"
```

### Task 3.4: Preview endpoint + link-codes endpoint + tests

**Files:**
- Modify: `backend/app/integrations/quickbooks/router.py`
- Modify: `backend/tests/integrations/quickbooks/test_oauth_router.py` (or new file)

- [ ] **Step 1: Add to router:**

```python
from datetime import datetime, timezone
from app.integrations.quickbooks import service as qbo_service
from app.models.financial_statement_mapping import FinancialStatementMapping
from app.schemas.quickbooks import (
    LinkCodeOption,
    TrialBalancePreviewRequest,
    TrialBalancePreviewResponse,
    TrialBalanceRowProposal,
)


def _require_active_connection(db: Session, company_id: uuid.UUID) -> QuickBooksConnection:
    conn = db.query(QuickBooksConnection).filter(QuickBooksConnection.company_id == company_id).first()
    if conn is None:
        raise HTTPException(status_code=404, detail="No QuickBooks connection for this company")
    if conn.status != "active":
        raise HTTPException(status_code=424, detail="QuickBooks connection is revoked — reconnect required")
    return conn


@router.post(
    "/companies/{company_id}/trial-balance/preview",
    response_model=TrialBalancePreviewResponse,
)
def preview_trial_balance(
    company_id: uuid.UUID,
    body: TrialBalancePreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)
    conn = _require_active_connection(db, company.id)
    if not 1 <= body.month <= 12:
        raise HTTPException(status_code=422, detail="month must be 1..12")
    try:
        result = qbo_service.propose_trial_balance(db, conn, company, body.fiscal_year, body.month)
    except qbo_service.ConnectionRevokedError:
        raise HTTPException(status_code=424, detail="QuickBooks connection revoked")
    except Exception as e:  # QBOClientError carries a status_code
        from app.integrations.quickbooks.client import QBOClientError
        if isinstance(e, QBOClientError):
            sc = e.status_code or 502
            if sc in (429,):
                raise HTTPException(status_code=503, detail="QuickBooks is rate-limiting; try again shortly")
            if sc == 504:
                raise HTTPException(status_code=504, detail="QuickBooks request timed out")
            raise HTTPException(status_code=502, detail=f"QuickBooks error: {e}")
        raise
    return TrialBalancePreviewResponse(
        fiscal_year=body.fiscal_year,
        month=body.month,
        currency=result["currency"],
        fetched_at=datetime.now(timezone.utc),
        rows=[TrialBalanceRowProposal(**r) for r in result["rows"]],
    )


@router.get("/companies/{company_id}/link-codes", response_model=list[LinkCodeOption])
def list_link_codes(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)
    mappings = (
        db.query(FinancialStatementMapping)
        .filter(FinancialStatementMapping.organization_id == company.organization_id)
        .all()
    )
    options: list[LinkCodeOption] = []

    def walk(node, mapping_type: str):
        if isinstance(node, dict):
            code = node.get("link_code") or node.get("code") or node.get("id")
            label = node.get("label") or node.get("name") or code
            if code:
                options.append(LinkCodeOption(code=str(code), label=str(label), mapping_type=mapping_type))
            for v in node.values():
                walk(v, mapping_type)
        elif isinstance(node, list):
            for item in node:
                walk(item, mapping_type)

    for m in mappings:
        walk(m.structure, m.mapping_type)
    # Deduplicate by code, keeping first occurrence
    seen = set()
    unique: list[LinkCodeOption] = []
    for o in options:
        if o.code in seen:
            continue
        seen.add(o.code)
        unique.append(o)
    return unique
```

- [ ] **Step 2: Add tests** for preview happy path, missing connection 404, revoked 424, validation 422, 429 maps to 503.

```python
@respx.mock
def test_preview_happy_path(client, db, org_user_company):
    _, user, company = org_user_company
    tokens = oauth.TokenResponse(access_token="AT", refresh_token="RT", expires_in=3600, x_refresh_token_expires_in=8640000)
    service.upsert_connection(db, company.id, "realm-1", tokens, user.id)
    import json, pathlib
    fixture = json.loads((pathlib.Path(__file__).parent / "fixtures" / "trial_balance_sample.json").read_text())
    respx.get("https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/reports/TrialBalance").mock(
        return_value=Response(200, json=fixture)
    )
    respx.get("https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/query").mock(
        return_value=Response(200, json={"QueryResponse": {"Account": [
            {"Id": "1", "AcctNum": "1000", "AccountType": "Bank", "AccountSubType": "Checking"},
            {"Id": "42", "AcctNum": "4000", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Id": "60", "AcctNum": "6010", "AccountType": "Expense", "AccountSubType": "OfficeGeneralAdministrativeExpenses"},
        ]}})
    )
    headers = _login(client)
    r = client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "month": 3},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["currency"] == "CAD"
    assert len(body["rows"]) == 3


def test_preview_missing_connection(client, org_user_company):
    _, _, company = org_user_company
    headers = _login(client)
    r = client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "month": 3},
        headers=headers,
    )
    assert r.status_code == 404


def test_preview_invalid_month(client, db, org_user_company):
    _, user, company = org_user_company
    tokens = oauth.TokenResponse(access_token="AT", refresh_token="RT", expires_in=3600, x_refresh_token_expires_in=8640000)
    service.upsert_connection(db, company.id, "realm-1", tokens, user.id)
    headers = _login(client)
    r = client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "month": 13},
        headers=headers,
    )
    assert r.status_code == 422


def test_link_codes_extracts_from_structure(client, db, org_user_company):
    org, _, company = org_user_company
    from app.models.financial_statement_mapping import FinancialStatementMapping
    db.add(FinancialStatementMapping(
        organization_id=org.id, mapping_type="bilan",
        structure=[{"link_code": "actif.encaisse", "label": "Encaisse"}, {"link_code": "passif.dette", "label": "Dette"}]
    ))
    db.commit()
    headers = _login(client)
    r = client.get(f"/api/quickbooks/companies/{company.id}/link-codes", headers=headers)
    assert r.status_code == 200
    codes = {o["code"] for o in r.json()}
    assert codes == {"actif.encaisse", "passif.dette"}
```

- [ ] **Step 3: Run + commit.**

```bash
python -m pytest tests/integrations/quickbooks/ -v
git add backend/app/integrations/quickbooks/router.py backend/tests/integrations/quickbooks/
git commit -m "feat(qbo): TB preview and link-codes endpoints"
```

---

## Phase 4 — Commit endpoint + frontend

### Task 4.1: Commit endpoint + tests

**Files:**
- Modify: `backend/app/integrations/quickbooks/service.py`
- Modify: `backend/app/integrations/quickbooks/router.py`
- Create: `backend/tests/integrations/quickbooks/test_commit.py`

- [ ] **Step 1: Append to `service.py`:**

```python
from sqlalchemy import select
from app.models.trial_balance import ChartOfAccount, TrialBalanceEntry


class TBConflictError(Exception):
    pass


def commit_trial_balance(
    db: Session,
    company: Company,
    fiscal_year: int,
    month: int,
    rows: list[dict],  # each: {account_number, account_name, debit, credit, link_code, skip}
    overwrite: bool,
) -> dict[str, int]:
    """Upsert ChartOfAccount + AccountMapping + TrialBalanceEntry within one transaction.

    Returns counts: {accounts_imported, mappings_created, mappings_updated}.
    Raises TBConflictError if entries exist for (company, fiscal_year, month) and overwrite=False.
    """
    # Lock the company row to serialize concurrent commits
    db.execute(select(Company).where(Company.id == company.id).with_for_update())

    existing_entry_count = (
        db.query(TrialBalanceEntry)
        .filter(
            TrialBalanceEntry.company_id == company.id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
            TrialBalanceEntry.month == month,
        )
        .count()
    )
    if existing_entry_count > 0 and not overwrite:
        raise TBConflictError(f"Trial balance already exists for {fiscal_year}-{month:02d}")
    if existing_entry_count > 0:
        db.query(TrialBalanceEntry).filter(
            TrialBalanceEntry.company_id == company.id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
            TrialBalanceEntry.month == month,
        ).delete()

    accounts_imported = 0
    mappings_created = 0
    mappings_updated = 0

    chart_by_num = {
        c.account_number: c
        for c in db.query(ChartOfAccount).filter(ChartOfAccount.company_id == company.id).all()
    }
    mapping_by_num = {
        m.account_number: m
        for m in db.query(AccountMapping).filter(AccountMapping.company_id == company.id).all()
    }

    for r in rows:
        if r.get("skip"):
            continue
        acct_num = r["account_number"]
        acct_name = r["account_name"]
        link_code = r.get("link_code")

        chart = chart_by_num.get(acct_num)
        if chart is None:
            chart = ChartOfAccount(company_id=company.id, account_number=acct_num, account_name=acct_name)
            db.add(chart)
            db.flush()
            chart_by_num[acct_num] = chart
        elif chart.account_name != acct_name:
            chart.account_name = acct_name

        amount = float(r.get("debit", 0)) - float(r.get("credit", 0))
        db.add(TrialBalanceEntry(
            company_id=company.id, account_id=chart.id,
            fiscal_year=fiscal_year, month=month, amount=amount,
        ))
        accounts_imported += 1

        existing = mapping_by_num.get(acct_num)
        if existing is None:
            db.add(AccountMapping(
                company_id=company.id,
                account_number=acct_num,
                description=acct_name,
                link_code=link_code,
            ))
            mappings_created += 1
        else:
            if existing.link_code != link_code or existing.description != acct_name:
                existing.link_code = link_code
                existing.description = acct_name
                mappings_updated += 1

    db.commit()
    return {
        "accounts_imported": accounts_imported,
        "mappings_created": mappings_created,
        "mappings_updated": mappings_updated,
    }
```

- [ ] **Step 2: Add commit endpoint to router:**

```python
from app.schemas.quickbooks import TrialBalanceCommitRequest, TrialBalanceCommitResponse


@router.post(
    "/companies/{company_id}/trial-balance/commit",
    response_model=TrialBalanceCommitResponse,
    status_code=201,
)
def commit_trial_balance_endpoint(
    company_id: uuid.UUID,
    body: TrialBalanceCommitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)
    if not 1 <= body.month <= 12:
        raise HTTPException(status_code=422, detail="month must be 1..12")
    try:
        result = qbo_service.commit_trial_balance(
            db, company, body.fiscal_year, body.month,
            [r.model_dump() for r in body.rows], body.overwrite_existing_tb,
        )
    except qbo_service.TBConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return TrialBalanceCommitResponse(**result)
```

- [ ] **Step 3: Tests:**

```python
import uuid

import pytest
from cryptography.fernet import Fernet

from app.config import settings
from app.models.account_mapping import AccountMapping
from app.models.company import Company
from app.models.organization import Organization
from app.models.trial_balance import ChartOfAccount, TrialBalanceEntry
from app.models.user import User, UserOrganization
from app.utils.security import hash_password


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setattr(settings, "qbo_token_encryption_key", Fernet.generate_key().decode())


@pytest.fixture
def org_user_company(db):
    org = Organization(name="O"); db.add(org); db.flush()
    user = User(email="u@x.com", hashed_password=hash_password("Password123!"), full_name="U", is_active=True)
    db.add(user); db.flush()
    db.add(UserOrganization(user_id=user.id, organization_id=org.id, role="owner"))
    company = Company(organization_id=org.id, name="C", currency="CAD"); db.add(company); db.commit(); db.refresh(company)
    return org, user, company


def _login(client, email="u@x.com"):
    r = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_commit_creates_tb_chart_and_mappings(client, db, org_user_company):
    _, _, company = org_user_company
    headers = _login(client)
    body = {
        "fiscal_year": 2026, "month": 3,
        "rows": [
            {"account_number": "1000", "account_name": "Cash", "debit": 5000, "credit": 0, "link_code": "actif.encaisse"},
            {"account_number": "4000", "account_name": "Sales", "debit": 0, "credit": 12500, "link_code": "revenus.ventes"},
        ],
        "overwrite_existing_tb": False,
    }
    r = client.post(f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body, headers=headers)
    assert r.status_code == 201, r.text
    j = r.json()
    assert j == {"accounts_imported": 2, "mappings_created": 2, "mappings_updated": 0}
    assert db.query(ChartOfAccount).filter_by(company_id=company.id).count() == 2
    assert db.query(TrialBalanceEntry).filter_by(company_id=company.id).count() == 2
    cash_entry = (
        db.query(TrialBalanceEntry)
        .join(ChartOfAccount, TrialBalanceEntry.account_id == ChartOfAccount.id)
        .filter(ChartOfAccount.account_number == "1000")
        .one()
    )
    assert float(cash_entry.amount) == 5000.0


def test_commit_skips_rows(client, db, org_user_company):
    _, _, company = org_user_company
    headers = _login(client)
    body = {
        "fiscal_year": 2026, "month": 3,
        "rows": [
            {"account_number": "1000", "account_name": "Cash", "debit": 5000, "credit": 0, "link_code": "actif.encaisse"},
            {"account_number": "9999", "account_name": "Skipped", "debit": 0, "credit": 0, "link_code": None, "skip": True},
        ],
        "overwrite_existing_tb": False,
    }
    r = client.post(f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body, headers=headers)
    assert r.json()["accounts_imported"] == 1


def test_commit_conflict_without_overwrite(client, db, org_user_company):
    _, _, company = org_user_company
    headers = _login(client)
    body = {
        "fiscal_year": 2026, "month": 3,
        "rows": [{"account_number": "1000", "account_name": "Cash", "debit": 5000, "credit": 0, "link_code": "actif.encaisse"}],
        "overwrite_existing_tb": False,
    }
    client.post(f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body, headers=headers)
    r2 = client.post(f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body, headers=headers)
    assert r2.status_code == 409


def test_commit_overwrite_replaces(client, db, org_user_company):
    _, _, company = org_user_company
    headers = _login(client)
    first = {"fiscal_year": 2026, "month": 3, "rows": [
        {"account_number": "1000", "account_name": "Cash", "debit": 5000, "credit": 0, "link_code": "actif.encaisse"},
    ], "overwrite_existing_tb": False}
    client.post(f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=first, headers=headers)
    second = {"fiscal_year": 2026, "month": 3, "rows": [
        {"account_number": "1000", "account_name": "Cash", "debit": 7500, "credit": 0, "link_code": "actif.encaisse"},
    ], "overwrite_existing_tb": True}
    r = client.post(f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=second, headers=headers)
    assert r.status_code == 201
    assert db.query(TrialBalanceEntry).filter_by(company_id=company.id).count() == 1
    e = db.query(TrialBalanceEntry).filter_by(company_id=company.id).one()
    assert float(e.amount) == 7500.0


def test_commit_updates_existing_mapping(client, db, org_user_company):
    _, _, company = org_user_company
    db.add(AccountMapping(company_id=company.id, account_number="1000", description="Cash", link_code="actif.old"))
    db.commit()
    headers = _login(client)
    body = {"fiscal_year": 2026, "month": 3, "rows": [
        {"account_number": "1000", "account_name": "Cash", "debit": 5000, "credit": 0, "link_code": "actif.encaisse"},
    ], "overwrite_existing_tb": False}
    r = client.post(f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body, headers=headers)
    assert r.json()["mappings_updated"] == 1
    m = db.query(AccountMapping).filter_by(company_id=company.id).one()
    assert m.link_code == "actif.encaisse"
```

- [ ] **Step 4: Run + commit.**

```bash
python -m pytest tests/integrations/quickbooks/ -v
git add backend/app/integrations/quickbooks/ backend/tests/integrations/quickbooks/test_commit.py
git commit -m "feat(qbo): TB commit endpoint with chart and mapping upsert"
```

### Task 4.2: Frontend API client additions

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1:** Append the QBO API helpers (export at the bottom of the file):

```typescript
// ============= QuickBooks Online =============

export type QboConnectionStatus = {
  status: "connected" | "revoked" | "not_connected"
  realm_id?: string | null
  connected_at?: string | null
  connected_by_user_id?: string | null
}

export type QboTrialBalanceProposalRow = {
  qbo_account_id: string
  account_number: string
  account_name: string
  qbo_account_type: string | null
  qbo_account_sub_type: string | null
  debit: number
  credit: number
  proposed_link_code: string | null
  confidence: "high" | "medium" | "low"
  existing_link_code: string | null
}

export type QboTrialBalancePreview = {
  fiscal_year: number
  month: number
  currency: string
  fetched_at: string
  rows: QboTrialBalanceProposalRow[]
}

export type QboLinkCode = { code: string; label: string; mapping_type: string }

export type QboCommitRow = {
  account_number: string
  account_name: string
  debit: number
  credit: number
  link_code: string | null
  skip?: boolean
}

export async function getQboConnectionStatus(companyId: string): Promise<QboConnectionStatus> {
  return apiFetch<QboConnectionStatus>(`/api/quickbooks/companies/${companyId}/connection`)
}

export function getQboAuthorizeUrl(companyId: string, accessToken: string): string {
  // Authorize redirects to Intuit. The frontend opens a full-page navigation;
  // we attach the token as a query param so the backend dependency picks it up via Authorization header is hard via redirect — instead we use the bearer-token in the link via fetch + redirect manually:
  return `/api/quickbooks/authorize?company_id=${companyId}`
}

export async function disconnectQbo(companyId: string): Promise<void> {
  await apiFetch<void>(`/api/quickbooks/companies/${companyId}/connection`, { method: "DELETE" })
}

export async function previewQboTrialBalance(
  companyId: string, fiscalYear: number, month: number,
): Promise<QboTrialBalancePreview> {
  return apiFetch<QboTrialBalancePreview>(
    `/api/quickbooks/companies/${companyId}/trial-balance/preview`,
    { method: "POST", body: JSON.stringify({ fiscal_year: fiscalYear, month }) },
  )
}

export async function commitQboTrialBalance(
  companyId: string, fiscalYear: number, month: number,
  rows: QboCommitRow[], overwriteExistingTb: boolean,
): Promise<{ accounts_imported: number; mappings_created: number; mappings_updated: number }> {
  return apiFetch(
    `/api/quickbooks/companies/${companyId}/trial-balance/commit`,
    {
      method: "POST",
      body: JSON.stringify({ fiscal_year: fiscalYear, month, rows, overwrite_existing_tb: overwriteExistingTb }),
    },
  )
}

export async function listQboLinkCodes(companyId: string): Promise<QboLinkCode[]> {
  return apiFetch<QboLinkCode[]>(`/api/quickbooks/companies/${companyId}/link-codes`)
}
```

- [ ] **Step 2: OAuth-redirect-with-bearer issue:** Since `Authorization` header isn't sent on a top-level navigation, the authorize endpoint must accept the access token via query param OR the user must already be logged in via a session cookie. Since this app uses Bearer tokens in `localStorage` only, change the authorize flow to: the backend verifies the bearer token attached in a special header that the frontend sends *before* navigating, gets back the Intuit URL, then the frontend does `window.location.href = intuit_url`.

  **Modify `backend/app/integrations/quickbooks/router.py`** — change `authorize` to return JSON instead of a redirect:

```python
@router.get("/authorize")
def authorize(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)
    state = oauth.create_state(company.id, current_user.id)
    return {"authorize_url": oauth.build_authorize_url(state)}
```

  **Update test in `test_oauth_router.py`** for `test_authorize_redirects_to_intuit`:

```python
def test_authorize_returns_intuit_url(client, org_user_company):
    _, _, company = org_user_company
    headers = _login(client)
    r = client.get(f"/api/quickbooks/authorize?company_id={company.id}", headers=headers)
    assert r.status_code == 200
    assert "appcenter.intuit.com/connect/oauth2" in r.json()["authorize_url"]
```

  **Update `frontend/lib/api.ts`:**

```typescript
export async function getQboAuthorizeUrl(companyId: string): Promise<string> {
  const r = await apiFetch<{ authorize_url: string }>(`/api/quickbooks/authorize?company_id=${companyId}`)
  return r.authorize_url
}
```

- [ ] **Step 3:** Run backend tests, fix the test name and commit.

```bash
cd backend && python -m pytest tests/integrations/quickbooks/ -v
git add backend/app/integrations/quickbooks/router.py backend/tests/integrations/quickbooks/test_oauth_router.py frontend/lib/api.ts
git commit -m "feat(qbo): expose authorize as JSON; add frontend API helpers"
```

### Task 4.3: Frontend hook + page (states A and B)

**Files:**
- Create: `frontend/hooks/use-quickbooks-connection.ts`
- Create: `frontend/app/settings/companies/[id]/quickbooks/page.tsx`

- [ ] **Step 1: Hook:**

```typescript
"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getQboConnectionStatus, getQboAuthorizeUrl, disconnectQbo,
  type QboConnectionStatus,
} from "@/lib/api"

export function useQuickBooksConnection(companyId: string) {
  const [status, setStatus] = useState<QboConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setStatus(await getQboConnectionStatus(companyId))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load connection")
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { refresh() }, [refresh])

  const connect = useCallback(async () => {
    const url = await getQboAuthorizeUrl(companyId)
    window.location.href = url
  }, [companyId])

  const disconnect = useCallback(async () => {
    await disconnectQbo(companyId)
    await refresh()
  }, [companyId, refresh])

  return { status, loading, error, refresh, connect, disconnect }
}
```

- [ ] **Step 2: Page** (initial — adds review state in 4.4):

```typescript
"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useQuickBooksConnection } from "@/hooks/use-quickbooks-connection"
import { previewQboTrialBalance, type QboTrialBalancePreview } from "@/lib/api"

export default function QuickBooksPage() {
  const params = useParams<{ id: string }>()
  const companyId = params.id
  const search = useSearchParams()
  const { toast } = useToast()
  const { status, loading, connect, disconnect, refresh } = useQuickBooksConnection(companyId)

  const [fiscalYear, setFiscalYear] = useState<number>(new Date().getFullYear())
  const [month, setMonth] = useState<number>(((new Date().getMonth() + 11) % 12) + 1)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<QboTrialBalancePreview | null>(null)

  useEffect(() => {
    const flag = search.get("qbo")
    if (flag === "connected") toast({ title: "QuickBooks connected" })
    if (flag === "denied") toast({ title: "QuickBooks connection cancelled", variant: "destructive" })
  }, [search, toast])

  if (loading) return <div className="p-8">Loading…</div>

  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-6">
      <h1 className="text-2xl font-semibold">QuickBooks Online</h1>

      {status?.status === "not_connected" && (
        <Card>
          <CardHeader><CardTitle>Connect QuickBooks</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect this company to QuickBooks Online to import trial balances and bootstrap account mappings automatically.
            </p>
            <Button onClick={connect}>Connect QuickBooks</Button>
          </CardContent>
        </Card>
      )}

      {status?.status === "revoked" && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader><CardTitle>Reconnect required</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">QuickBooks access expired. Reconnect to continue importing data.</p>
            <Button onClick={connect}>Reconnect QuickBooks</Button>
          </CardContent>
        </Card>
      )}

      {status?.status === "connected" && !preview && (
        <Card>
          <CardHeader>
            <CardTitle>Connected</CardTitle>
            <p className="text-sm text-muted-foreground">Realm ID: {status.realm_id}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fy">Fiscal year</Label>
                <Input id="fy" type="number" value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="mo">Month (1-12)</Label>
                <Input id="mo" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  setPreviewing(true)
                  try {
                    setPreview(await previewQboTrialBalance(companyId, fiscalYear, month))
                  } catch (e) {
                    toast({ title: "Preview failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" })
                  } finally {
                    setPreviewing(false)
                  }
                }}
                disabled={previewing}
              >
                {previewing ? "Pulling…" : "Preview trial balance"}
              </Button>
              <Button variant="outline" onClick={async () => { await disconnect(); toast({ title: "Disconnected" }) }}>
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {preview && (
        <ReviewTable
          companyId={companyId}
          preview={preview}
          onCancel={() => setPreview(null)}
          onCommitted={async () => {
            setPreview(null)
            toast({ title: "Trial balance imported" })
            await refresh()
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3:** Don't import `ReviewTable` yet — leave the page broken; implement in 4.4.

- [ ] **Step 4: Commit (broken-build commit ok; next task fixes).**

```bash
git add frontend/hooks/use-quickbooks-connection.ts frontend/app/settings/companies/
git commit -m "feat(qbo): connect/disconnect UI for company QuickBooks page"
```

### Task 4.4: Review table component + commit flow + 409 modal

**Files:**
- Create: `frontend/components/quickbooks-review-table.tsx`
- Modify: `frontend/app/settings/companies/[id]/quickbooks/page.tsx` (import ReviewTable)

- [ ] **Step 1: Component:**

```typescript
"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import {
  commitQboTrialBalance, listQboLinkCodes,
  type QboCommitRow, type QboLinkCode, type QboTrialBalancePreview,
} from "@/lib/api"

type Filter = "all" | "high" | "review" | "mapped"

type RowState = {
  account_number: string
  account_name: string
  debit: number
  credit: number
  qbo_type: string | null
  qbo_subtype: string | null
  link_code: string | null
  confidence: "high" | "medium" | "low"
  existing_link_code: string | null
  skip: boolean
}

export function ReviewTable({
  companyId, preview, onCancel, onCommitted,
}: {
  companyId: string
  preview: QboTrialBalancePreview
  onCancel: () => void
  onCommitted: () => void
}) {
  const { toast } = useToast()
  const [linkCodes, setLinkCodes] = useState<QboLinkCode[]>([])
  const [rows, setRows] = useState<RowState[]>(() =>
    preview.rows.map((r) => ({
      account_number: r.account_number,
      account_name: r.account_name,
      debit: r.debit,
      credit: r.credit,
      qbo_type: r.qbo_account_type,
      qbo_subtype: r.qbo_account_sub_type,
      link_code: r.proposed_link_code,
      confidence: r.confidence,
      existing_link_code: r.existing_link_code,
      skip: false,
    })),
  )
  const [filter, setFilter] = useState<Filter>("all")
  const [committing, setCommitting] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)

  useEffect(() => { listQboLinkCodes(companyId).then(setLinkCodes).catch(() => setLinkCodes([])) }, [companyId])

  const counts = useMemo(() => ({
    high: rows.filter((r) => r.confidence === "high").length,
    review: rows.filter((r) => r.confidence !== "high" && !r.existing_link_code).length,
    mapped: rows.filter((r) => r.existing_link_code !== null).length,
  }), [rows])

  const totals = useMemo(() => {
    const debit = rows.filter((r) => !r.skip).reduce((s, r) => s + r.debit, 0)
    const credit = rows.filter((r) => !r.skip).reduce((s, r) => s + r.credit, 0)
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.01 }
  }, [rows])

  const visibleRows = useMemo(() => {
    if (filter === "high") return rows.filter((r) => r.confidence === "high")
    if (filter === "review") return rows.filter((r) => r.confidence !== "high" && !r.existing_link_code)
    if (filter === "mapped") return rows.filter((r) => r.existing_link_code !== null)
    return rows
  }, [rows, filter])

  const updateRow = (idx: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const acceptAllHighConfidence = () => {
    setRows((prev) => prev.map((r) => (r.confidence === "high" && !r.link_code ? { ...r, link_code: r.link_code } : r)))
  }

  const canCommit = rows.every((r) => r.skip || (r.link_code && r.link_code.length > 0))

  const doCommit = async (overwrite: boolean) => {
    setCommitting(true)
    try {
      const payload: QboCommitRow[] = rows.map((r) => ({
        account_number: r.account_number,
        account_name: r.account_name,
        debit: r.debit,
        credit: r.credit,
        link_code: r.link_code,
        skip: r.skip,
      }))
      await commitQboTrialBalance(companyId, preview.fiscal_year, preview.month, payload, overwrite)
      onCommitted()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("409") || msg.toLowerCase().includes("already exists")) {
        setConflictOpen(true)
      } else {
        toast({ title: "Import failed", description: msg, variant: "destructive" })
      }
    } finally {
      setCommitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review trial balance — {preview.fiscal_year}-{String(preview.month).padStart(2, "0")} ({preview.currency})</CardTitle>
        <div className="flex gap-2 text-sm">
          <button className={filter === "all" ? "font-bold" : ""} onClick={() => setFilter("all")}>All ({rows.length})</button>
          <button className={filter === "high" ? "font-bold" : ""} onClick={() => setFilter("high")}>High ({counts.high})</button>
          <button className={filter === "review" ? "font-bold" : ""} onClick={() => setFilter("review")}>Needs review ({counts.review})</button>
          <button className={filter === "mapped" ? "font-bold" : ""} onClick={() => setFilter("mapped")}>Already mapped ({counts.mapped})</button>
          <Button size="sm" variant="outline" onClick={acceptAllHighConfidence}>Accept all high-confidence</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>QBO type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Link code</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Skip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((r) => {
                const idx = rows.indexOf(r)
                return (
                  <TableRow key={r.account_number}>
                    <TableCell className="font-mono text-xs">{r.account_number}</TableCell>
                    <TableCell>{r.account_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.qbo_type}/{r.qbo_subtype}</TableCell>
                    <TableCell className="text-right font-mono">{r.debit.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{r.credit.toFixed(2)}</TableCell>
                    <TableCell>
                      <Input
                        list="qbo-link-codes"
                        value={r.link_code ?? ""}
                        onChange={(e) => updateRow(idx, { link_code: e.target.value || null })}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.confidence === "high" ? "default" : r.confidence === "medium" ? "secondary" : "outline"}>
                        {r.confidence}
                      </Badge>
                      {r.existing_link_code && r.existing_link_code !== r.link_code && (
                        <Badge variant="outline" className="ml-1">Already mapped</Badge>
                      )}
                    </TableCell>
                    <TableCell><Checkbox checked={r.skip} onCheckedChange={(v) => updateRow(idx, { skip: !!v })} /></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <datalist id="qbo-link-codes">
            {linkCodes.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </datalist>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <div className={totals.balanced ? "" : "text-red-600 font-semibold"}>
            Debit total: {totals.debit.toFixed(2)} · Credit total: {totals.credit.toFixed(2)}
            {!totals.balanced && " — does not balance!"}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={committing}>Cancel</Button>
            <Button onClick={() => doCommit(false)} disabled={!canCommit || committing}>
              {committing ? "Importing…" : "Import trial balance"}
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>A trial balance for {preview.fiscal_year}-{String(preview.month).padStart(2, "0")} already exists.</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Overwrite the existing entries? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictOpen(false)}>Cancel</Button>
            <Button onClick={async () => { setConflictOpen(false); await doCommit(true) }}>Overwrite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
```

- [ ] **Step 2: Add the import** in `page.tsx`:

```typescript
import { ReviewTable } from "@/components/quickbooks-review-table"
```

- [ ] **Step 3: Run frontend build** to surface type errors:

```bash
cd frontend && pnpm tsc --noEmit
```

  Fix any errors (most likely: missing toast import path — verify it's `@/components/ui/use-toast` not `@/hooks/use-toast`; check existing usage in the repo and match).

- [ ] **Step 4: Commit.**

```bash
git add frontend/components/quickbooks-review-table.tsx frontend/app/settings/companies/[id]/quickbooks/page.tsx
git commit -m "feat(qbo): review table and commit flow with 409 overwrite modal"
```

### Task 4.5: Playwright e2e for connect → preview → commit (mocked)

**Files:**
- Create: `frontend/e2e/quickbooks.spec.ts`

- [ ] **Step 1:** Implement. The spec hits the real frontend dev server but mocks `/api/quickbooks/*` via `page.route`.

```typescript
import { test, expect } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const URL = `/settings/companies/${COMPANY_ID}/quickbooks`

async function loginViaToken(page) {
  // Bypass real login by injecting a token. AuthContext reads localStorage on mount.
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("refresh_token", "fake-refresh")
  })
}

test.beforeEach(async ({ page }) => {
  await loginViaToken(page)
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ id: "u1", email: "u@e.com", full_name: "U", is_active: true, created_at: "2026-01-01" }),
  }))
  await page.route("**/api/organizations**", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify([{ id: "o1", name: "Org", slug: "o", role: "owner" }]),
  }))
})

test("not connected → connect button visible", async ({ page }) => {
  await page.route(`**/api/quickbooks/companies/${COMPANY_ID}/connection`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "not_connected" }) }),
  )
  await page.goto(URL)
  await expect(page.getByRole("button", { name: /connect quickbooks/i })).toBeVisible()
})

test("connected → preview → commit flow", async ({ page }) => {
  await page.route(`**/api/quickbooks/companies/${COMPANY_ID}/connection`, (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ status: "connected", realm_id: "12345", connected_at: "2026-04-14T00:00:00Z" }),
    }),
  )
  await page.route(`**/api/quickbooks/companies/${COMPANY_ID}/trial-balance/preview`, (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        fiscal_year: 2026, month: 3, currency: "CAD", fetched_at: "2026-04-14T00:00:00Z",
        rows: [
          { qbo_account_id: "1", account_number: "1000", account_name: "Cash", qbo_account_type: "Bank",
            qbo_account_sub_type: "Checking", debit: 5000, credit: 0,
            proposed_link_code: "actif.encaisse", confidence: "high", existing_link_code: null },
          { qbo_account_id: "42", account_number: "4000", account_name: "Sales", qbo_account_type: "Income",
            qbo_account_sub_type: "SalesOfProductIncome", debit: 0, credit: 5000,
            proposed_link_code: "revenus.ventes", confidence: "high", existing_link_code: null },
        ],
      }),
    }),
  )
  await page.route(`**/api/quickbooks/companies/${COMPANY_ID}/link-codes`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
      { code: "actif.encaisse", label: "Encaisse", mapping_type: "bilan" },
      { code: "revenus.ventes", label: "Ventes", mapping_type: "resultats" },
    ]) }),
  )
  await page.route(`**/api/quickbooks/companies/${COMPANY_ID}/trial-balance/commit`, (route) =>
    route.fulfill({ status: 201, contentType: "application/json",
      body: JSON.stringify({ accounts_imported: 2, mappings_created: 2, mappings_updated: 0 }) }),
  )

  await page.goto(URL)
  await expect(page.getByText(/Realm ID: 12345/)).toBeVisible()
  await page.getByRole("button", { name: /preview trial balance/i }).click()
  await expect(page.getByText("Cash")).toBeVisible()
  await expect(page.getByText("Sales")).toBeVisible()
  await page.getByRole("button", { name: /import trial balance/i }).click()
  await expect(page.getByText(/trial balance imported/i)).toBeVisible()
})

test("conflict → overwrite modal → retry", async ({ page }) => {
  await page.route(`**/api/quickbooks/companies/${COMPANY_ID}/connection`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ status: "connected", realm_id: "12345" }) }),
  )
  await page.route(`**/api/quickbooks/companies/${COMPANY_ID}/trial-balance/preview`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      fiscal_year: 2026, month: 3, currency: "CAD", fetched_at: "2026-04-14T00:00:00Z",
      rows: [{ qbo_account_id: "1", account_number: "1000", account_name: "Cash", qbo_account_type: "Bank",
        qbo_account_sub_type: "Checking", debit: 5000, credit: 0,
        proposed_link_code: "actif.encaisse", confidence: "high", existing_link_code: null }],
    }) }),
  )
  await page.route(`**/api/quickbooks/companies/${COMPANY_ID}/link-codes`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  )
  let commitCalls = 0
  await page.route(`**/api/quickbooks/companies/${COMPANY_ID}/trial-balance/commit`, (route) => {
    commitCalls += 1
    if (commitCalls === 1) {
      route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ detail: "already exists" }) })
    } else {
      route.fulfill({ status: 201, contentType: "application/json",
        body: JSON.stringify({ accounts_imported: 1, mappings_created: 1, mappings_updated: 0 }) })
    }
  })

  await page.goto(URL)
  await page.getByRole("button", { name: /preview trial balance/i }).click()
  await page.getByRole("button", { name: /import trial balance/i }).click()
  await expect(page.getByText(/already exists/i)).toBeVisible()
  await page.getByRole("button", { name: /overwrite/i }).click()
  await expect(page.getByText(/trial balance imported/i)).toBeVisible()
})
```

- [ ] **Step 2:** Run `cd frontend && pnpm test:e2e` (or skip if dev env not set up — note in commit message). Fix selector mismatches if any (look at actual rendered HTML).

- [ ] **Step 3: Commit.**

```bash
git add frontend/e2e/quickbooks.spec.ts
git commit -m "test(qbo): Playwright e2e for connect, preview, commit, conflict flows"
```

---

## Phase 5 — Polish, docs, and final verification

### Task 5.1: Add link to QBO page from existing settings hub

**Files:**
- Modify: `frontend/app/settings/companies/page.tsx` (add a "QuickBooks" action per company row, pointing to `/settings/companies/{id}/quickbooks`)

- [ ] **Step 1:** Read the existing companies page to find the row layout, then add a small button/link. Match existing visual style. If unclear where it fits, add a small "QuickBooks" link icon to each company card.

- [ ] **Step 2: Run typecheck + commit.**

```bash
cd frontend && pnpm tsc --noEmit
git add frontend/app/settings/companies/page.tsx
git commit -m "feat(qbo): link QuickBooks page from companies list"
```

### Task 5.2: Release checklist + README addendum

**Files:**
- Create: `docs/quickbooks-release-checklist.md`
- Modify: `README.md`

- [ ] **Step 1:** Write `docs/quickbooks-release-checklist.md`:

```markdown
# QuickBooks Connector — Release Checklist

## Before merging to main

- [ ] All backend tests pass: `cd backend && python -m pytest`
- [ ] Frontend typechecks and builds: `cd frontend && pnpm tsc --noEmit && pnpm build`
- [ ] Playwright e2e passes: `cd frontend && pnpm test:e2e`
- [ ] `.env.example` documents `INTUIT_*` and `QBO_TOKEN_ENCRYPTION_KEY`

## Sandbox setup (one-time per developer)

1. Create an Intuit developer account at https://developer.intuit.com.
2. Create a new app, select "Accounting" scope only.
3. In the app's **Keys & OAuth** tab (Sandbox), copy `Client ID` and `Client Secret`.
4. Add a Redirect URI: `http://localhost:8000/api/quickbooks/callback`.
5. Generate an encryption key:
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```
6. Populate `.env`:
   ```
   INTUIT_CLIENT_ID=<from step 3>
   INTUIT_CLIENT_SECRET=<from step 3>
   INTUIT_ENVIRONMENT=sandbox
   INTUIT_REDIRECT_URI=http://localhost:8000/api/quickbooks/callback
   QBO_TOKEN_ENCRYPTION_KEY=<from step 5>
   ```

## Manual sandbox smoke test

1. Sign in to the app, create a Modelisys company.
2. Sign in to https://developer.intuit.com, open the Sandbox dashboard, and confirm a sandbox QBO company exists with seeded TB data.
3. In Modelisys, navigate to **Settings → Companies → {company} → QuickBooks**.
4. Click **Connect QuickBooks**. Authorize on Intuit's screen.
5. Confirm redirect lands on the QuickBooks page with status "Connected" and a realm ID shown.
6. Pick a fiscal year + month with seeded data; click **Preview trial balance**.
7. Confirm the table renders with mapping proposals.
8. Click **Import trial balance**. Confirm the success toast.
9. Navigate to **Trial Balance** for the same company/period — confirm imported entries appear.
10. Re-run import for the same period; confirm 409 → overwrite modal → success.
11. Click **Disconnect**; confirm status returns to "Not connected".

## Customizing mapping rules

The default `backend/app/integrations/quickbooks/mapping_rules.py` table uses
**generic French link codes** (e.g., `actif.encaisse`, `revenus.ventes_produits`).
You MUST customize this dict to match the link codes used by your organization's
`FinancialStatementMapping.structure`. The review screen lets users override
on a per-row basis, but accurate proposals dramatically reduce onboarding time.

## Production app review (Intuit)

When ready to support live QBO files (not sandbox):
1. Submit the app for review in the Intuit developer portal. Requires:
   - Working demo (Loom or live URL).
   - Privacy policy URL.
   - Terms of service URL.
2. Typical turnaround: 1–4 weeks.
3. Once approved, set `INTUIT_ENVIRONMENT=production` and the production
   `INTUIT_CLIENT_ID` / `INTUIT_CLIENT_SECRET` in Azure Container Apps env.
4. No code change required.
```

- [ ] **Step 2:** Append to `README.md` under a new "QuickBooks Online (sandbox)" section a brief pointer to the checklist.

- [ ] **Step 3: Commit.**

```bash
git add docs/quickbooks-release-checklist.md README.md
git commit -m "docs(qbo): release checklist and README addendum"
```

### Task 5.3: Final verification

- [ ] **Step 1:** Run the full backend suite:
  ```bash
  cd backend && python -m pytest -v
  ```
  All tests must pass. Fix any failures (look for dependency-injection errors, missing fixtures, real-DB-vs-SQLite differences). Re-run until clean.

- [ ] **Step 2:** Frontend typecheck + build:
  ```bash
  cd frontend && pnpm tsc --noEmit && pnpm build
  ```
  Fix any type errors. Re-run until clean.

- [ ] **Step 3:** Playwright (only if a dev environment is available — Modelisys's CI doesn't run Playwright headlessly without setup):
  ```bash
  cd frontend && pnpm test:e2e --reporter=line
  ```
  If the Playwright setup needs Intuit creds or a running backend that's hard to mock, document the limitation in the commit and skip; CI/manual smoke covers it.

- [ ] **Step 4:** Push branch and open a PR if not already.

  ```bash
  git push -u origin feat/add-quickbooks-connector
  # (Skip PR creation unless explicitly requested.)
  ```

---

## Self-review (writing-plans skill checklist)

**Spec coverage:**
- ✅ Architecture / data model → Tasks 1.1, 1.3, 1.4
- ✅ OAuth flow (state JWT, exchange, refresh, revoke) → Tasks 2.1, 2.2, 2.3, 2.4
- ✅ Token encryption → Task 1.2
- ✅ Connection status / disconnect endpoints → Task 2.4
- ✅ TB preview (parse + propose + existing-mapping detection) → Tasks 3.2, 3.3, 3.4
- ✅ Mapping rules table → Task 3.1 (with documented user-customization requirement)
- ✅ Link-code enumeration → Task 3.4
- ✅ TB commit (chart-of-accounts upsert, TB entries, mapping upsert, 409 conflict) → Task 4.1
- ✅ Frontend connect/disconnect UI + 3 states → Task 4.3
- ✅ Review table with combobox, confidence, skip, balance-check → Task 4.4
- ✅ 409 overwrite modal → Task 4.4
- ✅ Playwright e2e → Task 4.5
- ✅ Release checklist + sandbox setup docs → Task 5.2
- ✅ Final verification → Task 5.3

**Spec deviation noted upfront:** real `TrialBalanceEntry(year, month, amount)` model adapted (see Spec deviations).

**Placeholder scan:** none — every task has runnable code.

**Type consistency:** `QboCommitRow.skip` defaults to `false` in both backend Pydantic schema (`TrialBalanceCommitRow`) and frontend type. Connection status uses `connected | revoked | not_connected` consistently across backend response and frontend type. Confidence uses `high | medium | low` consistently.

---

## Execution

This plan was approved for autonomous overnight execution by the user. The executing engineer/agent should:

1. Work the tasks top-to-bottom.
2. Run tests at every checkpoint indicated.
3. Fix failures before committing — if a test reveals a real bug, fix it; if the test is wrong, fix it; do not leave broken tests.
4. If a step's exact code conflicts with a real codebase pattern discovered at execution time, prefer the codebase pattern and adjust the step.
5. Report progress at the end with: which tasks committed, which tests pass, what (if anything) is blocked.
