# Dashboard parity for Bilan and Trésorerie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the income-statement Tableau de bord chart system into a statement-agnostic module backed by PostgreSQL, then bring multi-slot user-customizable dashboards to Bilan and Trésorerie (which gains a Tableau de bord section).

**Architecture:** New table `statement_chart_configs` (`company_id`, `statement_type`, `chart_instance_id`, `version`, `config_json` JSONB) plus FastAPI CRUD endpoints. Frontend port consolidates `performance-chart-config.ts`, `income-statement-chart.tsx`, and `performance-chart-settings-dialog.tsx` into statement-agnostic equivalents and rewires all three statement pages to consume them. Org-wide configs with `version`-based stale-write detection. Old files (`balance-sheet-chart.tsx`, `cash-flow-chart.tsx`, the three above) are deleted.

**Tech Stack:** FastAPI 0.115 / SQLAlchemy 2.0 / Alembic / PostgreSQL 16 (JSONB) on the backend. Next.js 16 / React 19 / TypeScript 5 / Recharts on the frontend. Playwright for e2e.

**Spec:** [docs/superpowers/specs/2026-05-18-dashboard-parity-bilan-tresorerie-design.md](../specs/2026-05-18-dashboard-parity-bilan-tresorerie-design.md)

---

## Phase A — Backend: data model + API

### Task 1: Migration + ORM model

**Files:**
- Create: `backend/alembic/versions/010_add_statement_chart_configs.py`
- Create: `backend/app/models/statement_chart_config.py`
- Modify: `backend/app/models/__init__.py` (if it re-exports models — check first)

- [ ] **Step 1: Inspect models package init**

Run: `Read backend/app/models/__init__.py`

If the file imports model modules, the new model module gets a line added at Step 3. If it's empty (other models load via direct imports in routers/services), no change needed.

- [ ] **Step 2: Create the model**

Write `backend/app/models/statement_chart_config.py`:

```python
import uuid
from datetime import datetime

from sqlalchemy import JSON, Index, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StatementChartConfig(Base):
    __tablename__ = "statement_chart_configs"
    __table_args__ = (
        UniqueConstraint(
            "company_id", "statement_type", "chart_instance_id",
            name="uq_chart_configs_company_statement_instance",
        ),
        Index(
            "ix_chart_configs_company_statement",
            "company_id", "statement_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    statement_type: Mapped[str] = mapped_column(String(32), nullable=False)
    # "income-statement" | "balance-sheet" | "cash-flow"
    chart_instance_id: Mapped[str] = mapped_column(String(64), nullable=False)
    # "default" for the first slot; uuid strings for additional slots
    slot_index: Mapped[int] = mapped_column(Integer, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    config_json: Mapped[dict] = mapped_column(
        JSON().with_variant(JSONB(astext_type=Text()), "postgresql"),
        nullable=False,
    )
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 3: Create the migration**

Write `backend/alembic/versions/010_add_statement_chart_configs.py`:

```python
"""Add statement_chart_configs table

Revision ID: 010
Revises: 009
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "statement_chart_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("statement_type", sa.String(length=32), nullable=False),
        sa.Column("chart_instance_id", sa.String(length=64), nullable=False),
        sa.Column("slot_index", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "config_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id", "statement_type", "chart_instance_id",
            name="uq_chart_configs_company_statement_instance",
        ),
    )
    op.create_index(
        "ix_chart_configs_company_statement",
        "statement_chart_configs",
        ["company_id", "statement_type"],
    )


def downgrade() -> None:
    op.drop_index("ix_chart_configs_company_statement", table_name="statement_chart_configs")
    op.drop_table("statement_chart_configs")
```

- [ ] **Step 4: Run alembic upgrade locally to verify migration applies**

Run: `cd backend && alembic upgrade head`
Expected: `Running upgrade 009 -> 010, Add statement_chart_configs table` (or similar).

- [ ] **Step 5: Confirm SQLite test bootstrap picks up the new table**

Run: `cd backend && python -m pytest tests/test_health.py -v`
Expected: PASS (no schema errors from `Base.metadata.create_all` in `conftest.py`).

- [ ] **Step 6: Commit**

```bash
git add backend/alembic/versions/010_add_statement_chart_configs.py \
        backend/app/models/statement_chart_config.py
git commit -m "feat(db): add statement_chart_configs table"
```

---

### Task 2: Pydantic schemas

**Files:**
- Create: `backend/app/schemas/statement_chart_config.py`

- [ ] **Step 1: Write the schemas**

Write `backend/app/schemas/statement_chart_config.py`:

```python
"""Pydantic schemas for statement_chart_configs API.

The V2 series spec carried in `config_json` is a tree of variants
(single/sum/difference/ratio/derivedMargin). We validate the *shape*
of the top-level container here; nested specs are accepted as
arbitrary dicts and re-validated when the frontend reads them.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


StatementType = Literal["income-statement", "balance-sheet", "cash-flow"]


class ChartSeriesSpec(BaseModel):
    """Top-level series shape. Nested `spec` dict is opaque to the backend."""

    model_config = ConfigDict(extra="allow")

    id: str = Field(..., min_length=1, max_length=128)
    kind: Literal["bar", "line"]
    label: str = Field(..., min_length=0, max_length=200)
    spec: dict
    yAxis: Literal["left", "right"]
    valueFormat: Literal["currency", "ratio"]
    showOnChart: bool = True
    showInSidePanel: bool = True
    color: str | None = None
    stackGroup: str | None = None


class ChartConfigPayload(BaseModel):
    """Body of a V2 chart config stored in `config_json`."""

    version: Literal[2] = 2
    chartTitle: str = Field(..., min_length=0, max_length=200)
    series: list[ChartSeriesSpec] = Field(default_factory=list)


class ChartSlotResponse(BaseModel):
    """One row returned by GET / PUT / POST."""

    chart_instance_id: str
    slot_index: int
    version: int
    config: ChartConfigPayload
    updated_by_user_email: str | None = None
    updated_at: datetime


class ChartSlotListResponse(BaseModel):
    slots: list[ChartSlotResponse]


class ChartSlotUpdateRequest(BaseModel):
    """Body of PUT — version is required for stale-write detection."""

    version: int = Field(..., ge=1)
    config: ChartConfigPayload


class ChartSlotConflictResponse(BaseModel):
    """Body returned with 409 Conflict on stale PUT."""

    detail: str = "stale_version"
    current_version: int
    current_config: ChartConfigPayload
    updated_by_user_email: str | None = None
    updated_at: datetime
```

- [ ] **Step 2: Smoke-test parsing**

Run: `cd backend && python -c "from app.schemas.statement_chart_config import ChartConfigPayload, ChartSlotUpdateRequest, ChartSeriesSpec; print(ChartSlotUpdateRequest(version=1, config={'version': 2, 'chartTitle': 't', 'series': []}))"`
Expected: prints an object without errors.

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/statement_chart_config.py
git commit -m "feat(api): pydantic schemas for statement chart configs"
```

---

### Task 3: Defaults service

**Files:**
- Create: `backend/app/services/statement_chart_defaults.py`
- Create: `backend/tests/test_statement_chart_defaults.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_statement_chart_defaults.py`:

```python
import pytest

from app.services.statement_chart_defaults import seed_default_chart_config


def test_income_statement_default_has_three_series():
    cfg = seed_default_chart_config("income-statement")
    assert cfg["version"] == 2
    assert cfg["chartTitle"] == "Performance financière"
    assert len(cfg["series"]) == 3
    labels = [s["label"] for s in cfg["series"]]
    assert labels == ["Revenus", "BAIIA", "Marge brute (%)"]


def test_income_statement_default_margin_references_revenue_series():
    cfg = seed_default_chart_config("income-statement")
    rev_id = cfg["series"][0]["id"]
    margin_spec = cfg["series"][2]["spec"]
    assert margin_spec["type"] == "derivedMargin"
    assert margin_spec["revenueSeriesId"] == rev_id


def test_balance_sheet_default_has_three_bars():
    cfg = seed_default_chart_config("balance-sheet")
    assert cfg["chartTitle"] == "Bilan"
    assert len(cfg["series"]) == 3
    assert all(s["kind"] == "bar" for s in cfg["series"])
    labels = [s["label"] for s in cfg["series"]]
    assert labels == ["Actifs", "Passifs", "Capitaux propres"]


def test_cash_flow_default_has_stacked_bars_plus_net_line():
    cfg = seed_default_chart_config("cash-flow")
    assert cfg["chartTitle"] == "Flux de trésorerie"
    assert len(cfg["series"]) == 4
    kinds = [s["kind"] for s in cfg["series"]]
    assert kinds == ["bar", "bar", "bar", "line"]
    # First three bars are stacked together
    stack_groups = [cfg["series"][i].get("stackGroup") for i in range(3)]
    assert stack_groups == ["cf", "cf", "cf"]
    assert cfg["series"][3].get("stackGroup") is None


def test_empty_link_codes_for_all_defaults():
    """Defaults pre-build series shape but leave link codes blank — the user picks them."""
    for stype in ("income-statement", "balance-sheet", "cash-flow"):
        cfg = seed_default_chart_config(stype)
        for s in cfg["series"]:
            spec = s["spec"]
            if spec["type"] == "single":
                assert spec["code"] == ""
            elif spec["type"] == "derivedMargin":
                gp = spec["grossProfitFromSpec"]
                assert gp["type"] == "single"
                assert gp["code"] == ""


def test_unknown_statement_type_raises():
    with pytest.raises(ValueError):
        seed_default_chart_config("unknown")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_statement_chart_defaults.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.statement_chart_defaults'`.

- [ ] **Step 3: Write the service**

Write `backend/app/services/statement_chart_defaults.py`:

```python
"""Default V2 chart configs per statement type.

Returned as dicts (not Pydantic models) — they're persisted in JSONB.
Every series uses an empty `link_code` (`""`); the user fills these in
via the settings dialog. We pre-build the *shape* (kind, axis, format,
color, label, stackGroup) but not the wiring, because link codes vary
by company.
"""

from typing import Literal


StatementType = Literal["income-statement", "balance-sheet", "cash-flow"]

_DEFAULT_COLORS = [
    "#3b82f6",  # 0
    "#10b981",  # 1
    "#f59e0b",  # 2
    "#8b5cf6",  # 3
    "#ec4899",  # 4
    "#06b6d4",  # 5
    "#84cc16",  # 6
]


def _income_statement_default() -> dict:
    rev_id = "perf-default-revenue"
    ebita_id = "perf-default-ebita"
    margin_id = "perf-default-margin"
    return {
        "version": 2,
        "chartTitle": "Performance financière",
        "series": [
            {
                "id": rev_id,
                "kind": "bar",
                "label": "Revenus",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[0],
            },
            {
                "id": ebita_id,
                "kind": "bar",
                "label": "BAIIA",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[1],
            },
            {
                "id": margin_id,
                "kind": "line",
                "label": "Marge brute (%)",
                "spec": {
                    "type": "derivedMargin",
                    "revenueSeriesId": rev_id,
                    "grossProfitFromSpec": {"type": "single", "code": ""},
                },
                "yAxis": "right",
                "valueFormat": "ratio",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[2],
            },
        ],
    }


def _balance_sheet_default() -> dict:
    return {
        "version": 2,
        "chartTitle": "Bilan",
        "series": [
            {
                "id": "bs-default-assets",
                "kind": "bar",
                "label": "Actifs",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[0],
            },
            {
                "id": "bs-default-liabilities",
                "kind": "bar",
                "label": "Passifs",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[1],
            },
            {
                "id": "bs-default-equity",
                "kind": "bar",
                "label": "Capitaux propres",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[2],
            },
        ],
    }


def _cash_flow_default() -> dict:
    return {
        "version": 2,
        "chartTitle": "Flux de trésorerie",
        "series": [
            {
                "id": "cf-default-operating",
                "kind": "bar",
                "label": "Exploitation",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[0],
                "stackGroup": "cf",
            },
            {
                "id": "cf-default-investing",
                "kind": "bar",
                "label": "Investissement",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[3],
                "stackGroup": "cf",
            },
            {
                "id": "cf-default-financing",
                "kind": "bar",
                "label": "Financement",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[4],
                "stackGroup": "cf",
            },
            {
                "id": "cf-default-net",
                "kind": "line",
                "label": "Flux net",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[1],
            },
        ],
    }


_FACTORIES = {
    "income-statement": _income_statement_default,
    "balance-sheet": _balance_sheet_default,
    "cash-flow": _cash_flow_default,
}


def seed_default_chart_config(statement_type: StatementType) -> dict:
    factory = _FACTORIES.get(statement_type)
    if factory is None:
        raise ValueError(f"Unknown statement_type: {statement_type!r}")
    return factory()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_statement_chart_defaults.py -v`
Expected: 6 PASSED.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/statement_chart_defaults.py \
        backend/tests/test_statement_chart_defaults.py
git commit -m "feat(api): default chart configs per statement type"
```

---

### Task 4: GET list endpoint with auto-seed

**Files:**
- Create: `backend/app/routers/statement_chart_configs.py`
- Create: `backend/tests/test_statement_chart_configs.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/test_statement_chart_configs.py`:

```python
import uuid


def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


# --- GET with auto-seed ---


def test_list_empty_seeds_default_slot(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=income-statement",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "slots" in data
    assert len(data["slots"]) == 1
    slot = data["slots"][0]
    assert slot["chart_instance_id"] == "default"
    assert slot["slot_index"] == 0
    assert slot["version"] == 1
    assert slot["config"]["chartTitle"] == "Performance financière"
    assert len(slot["config"]["series"]) == 3


def test_list_seeds_correct_default_per_statement_type(client, auth_headers):
    company_id = _create_company(client, auth_headers)

    bs = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=balance-sheet",
        headers=auth_headers,
    ).json()
    assert bs["slots"][0]["config"]["chartTitle"] == "Bilan"

    cf = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=cash-flow",
        headers=auth_headers,
    ).json()
    assert cf["slots"][0]["config"]["chartTitle"] == "Flux de trésorerie"
    assert len(cf["slots"][0]["config"]["series"]) == 4


def test_list_second_call_does_not_duplicate_seed(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    a = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=income-statement",
        headers=auth_headers,
    ).json()
    b = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=income-statement",
        headers=auth_headers,
    ).json()
    assert len(a["slots"]) == 1
    assert len(b["slots"]) == 1
    assert a["slots"][0]["chart_instance_id"] == b["slots"][0]["chart_instance_id"]


def test_list_invalid_statement_type_returns_422(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=bogus",
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_list_requires_auth(client):
    company_id = uuid.uuid4()
    response = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=income-statement",
    )
    assert response.status_code in (401, 403)


def test_list_unknown_company_returns_404(client, auth_headers):
    other_company = uuid.uuid4()
    response = client.get(
        f"/api/companies/{other_company}/statement-chart-configs?statement_type=income-statement",
        headers=auth_headers,
    )
    assert response.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_statement_chart_configs.py -v`
Expected: 404 errors on every test (router not yet registered).

- [ ] **Step 3: Write the router with GET only**

Write `backend/app/routers/statement_chart_configs.py`:

```python
import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, verify_company_access
from app.models.statement_chart_config import StatementChartConfig
from app.models.user import User
from app.schemas.statement_chart_config import (
    ChartConfigPayload,
    ChartSlotListResponse,
    ChartSlotResponse,
)
from app.services.statement_chart_defaults import seed_default_chart_config


router = APIRouter(
    prefix="/api/companies/{company_id}/statement-chart-configs",
    tags=["statement-chart-configs"],
)


StatementTypeQuery = Literal["income-statement", "balance-sheet", "cash-flow"]


def _row_to_response(db: Session, row: StatementChartConfig) -> ChartSlotResponse:
    updated_by_email: str | None = None
    if row.updated_by_user_id is not None:
        u = db.get(User, row.updated_by_user_id)
        if u is not None:
            updated_by_email = u.email
    return ChartSlotResponse(
        chart_instance_id=row.chart_instance_id,
        slot_index=row.slot_index,
        version=row.version,
        config=ChartConfigPayload.model_validate(row.config_json),
        updated_by_user_email=updated_by_email,
        updated_at=row.updated_at,
    )


def _seed_default_slot(
    db: Session,
    company_id: uuid.UUID,
    statement_type: str,
    user: User,
) -> StatementChartConfig:
    cfg = seed_default_chart_config(statement_type)  # type: ignore[arg-type]
    row = StatementChartConfig(
        company_id=company_id,
        statement_type=statement_type,
        chart_instance_id="default",
        slot_index=0,
        version=1,
        config_json=cfg,
        updated_by_user_id=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("", response_model=ChartSlotListResponse)
def list_chart_slots(
    company_id: uuid.UUID,
    statement_type: StatementTypeQuery = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_company_access(db, current_user, company_id)
    rows = (
        db.query(StatementChartConfig)
        .filter(
            StatementChartConfig.company_id == company_id,
            StatementChartConfig.statement_type == statement_type,
        )
        .order_by(StatementChartConfig.slot_index.asc())
        .all()
    )
    if not rows:
        seeded = _seed_default_slot(db, company_id, statement_type, current_user)
        rows = [seeded]
    return ChartSlotListResponse(
        slots=[_row_to_response(db, r) for r in rows]
    )
```

- [ ] **Step 4: Register the router**

Edit `backend/app/main.py`. Find the import block around line 33-50 and add `statement_chart_configs` to the alphabetical list. Find the `app.include_router(...)` block near line 168-184 and add:

```python
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
    statement_chart_configs,   # <-- new
    statement_structures,
    suppliers,
    trial_balance,
)
```

```python
app.include_router(statement_structures.router)
app.include_router(statement_chart_configs.router)   # <-- new line
app.include_router(financial_statements.router)
```

(Place the include after `statement_structures` to keep statement-related routers grouped.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_statement_chart_configs.py -v`
Expected: 6 PASSED.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/statement_chart_configs.py \
        backend/tests/test_statement_chart_configs.py \
        backend/app/main.py
git commit -m "feat(api): GET statement chart configs with auto-seed"
```

---

### Task 5: POST endpoint (create new slot)

**Files:**
- Modify: `backend/app/routers/statement_chart_configs.py`
- Modify: `backend/tests/test_statement_chart_configs.py`

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_statement_chart_configs.py`:

```python
# --- POST create new slot ---


def test_post_creates_additional_slot_after_default(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    # First seed the default
    client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=income-statement",
        headers=auth_headers,
    )
    response = client.post(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=income-statement",
        headers=auth_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["chart_instance_id"] != "default"
    assert body["slot_index"] == 1
    assert body["version"] == 1
    assert body["config"]["chartTitle"] == "Performance financière"


def test_post_seeds_default_first_if_empty(client, auth_headers):
    """POST on a fresh dashboard creates BOTH the default and a second slot."""
    company_id = _create_company(client, auth_headers)
    response = client.post(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=balance-sheet",
        headers=auth_headers,
    )
    assert response.status_code == 201
    listed = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=balance-sheet",
        headers=auth_headers,
    ).json()
    assert len(listed["slots"]) == 2
    assert listed["slots"][0]["chart_instance_id"] == "default"
    assert listed["slots"][1]["slot_index"] == 1


def test_post_third_slot_uses_next_index(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=cash-flow",
        headers=auth_headers,
    )
    client.post(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=cash-flow",
        headers=auth_headers,
    )
    response = client.post(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=cash-flow",
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["slot_index"] == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_statement_chart_configs.py::test_post_creates_additional_slot_after_default -v`
Expected: FAIL with `405 Method Not Allowed`.

- [ ] **Step 3: Add the POST handler**

Append to `backend/app/routers/statement_chart_configs.py`:

```python
@router.post("", response_model=ChartSlotResponse, status_code=201)
def add_chart_slot(
    company_id: uuid.UUID,
    statement_type: StatementTypeQuery = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_company_access(db, current_user, company_id)

    # Ensure default slot exists first so slot_index numbering is contiguous.
    existing = (
        db.query(StatementChartConfig)
        .filter(
            StatementChartConfig.company_id == company_id,
            StatementChartConfig.statement_type == statement_type,
        )
        .order_by(StatementChartConfig.slot_index.desc())
        .all()
    )
    if not existing:
        _seed_default_slot(db, company_id, statement_type, current_user)
        next_index = 1
    else:
        next_index = existing[0].slot_index + 1

    new_id = str(uuid.uuid4())
    row = StatementChartConfig(
        company_id=company_id,
        statement_type=statement_type,
        chart_instance_id=new_id,
        slot_index=next_index,
        version=1,
        config_json=seed_default_chart_config(statement_type),  # type: ignore[arg-type]
        updated_by_user_id=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _row_to_response(db, row)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_statement_chart_configs.py -v`
Expected: 9 PASSED (6 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/statement_chart_configs.py \
        backend/tests/test_statement_chart_configs.py
git commit -m "feat(api): POST creates new statement chart slot"
```

---

### Task 6: PUT endpoint (save with stale-version check)

**Files:**
- Modify: `backend/app/routers/statement_chart_configs.py`
- Modify: `backend/tests/test_statement_chart_configs.py`

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_statement_chart_configs.py`:

```python
# --- PUT (save) ---


def _default_slot(client, auth_headers, company_id, stype="income-statement"):
    response = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type={stype}",
        headers=auth_headers,
    )
    return response.json()["slots"][0]


def test_put_bumps_version_and_persists(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    slot = _default_slot(client, auth_headers, company_id)
    edited = dict(slot["config"])
    edited["chartTitle"] = "Mes revenus"

    response = client.put(
        f"/api/companies/{company_id}/statement-chart-configs/{slot['chart_instance_id']}?statement_type=income-statement",
        json={"version": slot["version"], "config": edited},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["version"] == slot["version"] + 1
    assert body["config"]["chartTitle"] == "Mes revenus"

    # Re-read confirms persistence
    re_read = _default_slot(client, auth_headers, company_id)
    assert re_read["config"]["chartTitle"] == "Mes revenus"
    assert re_read["version"] == slot["version"] + 1


def test_put_stale_version_returns_409_with_current_state(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    slot = _default_slot(client, auth_headers, company_id)

    # First save bumps version to 2
    first = dict(slot["config"])
    first["chartTitle"] = "First save"
    r1 = client.put(
        f"/api/companies/{company_id}/statement-chart-configs/{slot['chart_instance_id']}?statement_type=income-statement",
        json={"version": slot["version"], "config": first},
        headers=auth_headers,
    )
    assert r1.status_code == 200

    # Second save with stale (original) version
    second = dict(slot["config"])
    second["chartTitle"] = "Stale save"
    r2 = client.put(
        f"/api/companies/{company_id}/statement-chart-configs/{slot['chart_instance_id']}?statement_type=income-statement",
        json={"version": slot["version"], "config": second},
        headers=auth_headers,
    )
    assert r2.status_code == 409
    body = r2.json()
    assert body["detail"]["detail"] == "stale_version"
    assert body["detail"]["current_version"] == 2
    assert body["detail"]["current_config"]["chartTitle"] == "First save"


def test_put_unknown_slot_returns_404(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _default_slot(client, auth_headers, company_id)  # seeds default
    bogus = str(uuid.uuid4())
    response = client.put(
        f"/api/companies/{company_id}/statement-chart-configs/{bogus}?statement_type=income-statement",
        json={
            "version": 1,
            "config": {"version": 2, "chartTitle": "x", "series": []},
        },
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_put_invalid_config_returns_422(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    slot = _default_slot(client, auth_headers, company_id)
    response = client.put(
        f"/api/companies/{company_id}/statement-chart-configs/{slot['chart_instance_id']}?statement_type=income-statement",
        json={"version": slot["version"], "config": {"version": 1, "chartTitle": "x", "series": []}},
        # version must be 2 — Literal mismatch
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_put_updates_audit_user(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    slot = _default_slot(client, auth_headers, company_id)
    edited = dict(slot["config"])
    edited["chartTitle"] = "Edited"
    response = client.put(
        f"/api/companies/{company_id}/statement-chart-configs/{slot['chart_instance_id']}?statement_type=income-statement",
        json={"version": slot["version"], "config": edited},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["updated_by_user_email"] == "test@example.com"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_statement_chart_configs.py -k put -v`
Expected: 405 errors (no PUT handler).

- [ ] **Step 3: Add the PUT handler**

Append to `backend/app/routers/statement_chart_configs.py`:

```python
from app.schemas.statement_chart_config import (  # extend existing import block
    ChartSlotConflictResponse,
    ChartSlotUpdateRequest,
)

# ...

@router.put("/{chart_instance_id}", response_model=ChartSlotResponse)
def update_chart_slot(
    company_id: uuid.UUID,
    chart_instance_id: str,
    payload: ChartSlotUpdateRequest,
    statement_type: StatementTypeQuery = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_company_access(db, current_user, company_id)
    row = (
        db.query(StatementChartConfig)
        .filter(
            StatementChartConfig.company_id == company_id,
            StatementChartConfig.statement_type == statement_type,
            StatementChartConfig.chart_instance_id == chart_instance_id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Chart slot not found")

    if payload.version != row.version:
        # Stale write — return current state so the client can react.
        current_email: str | None = None
        if row.updated_by_user_id is not None:
            u = db.get(User, row.updated_by_user_id)
            if u is not None:
                current_email = u.email
        conflict = ChartSlotConflictResponse(
            current_version=row.version,
            current_config=ChartConfigPayload.model_validate(row.config_json),
            updated_by_user_email=current_email,
            updated_at=row.updated_at,
        )
        raise HTTPException(status_code=409, detail=conflict.model_dump(mode="json"))

    row.config_json = payload.config.model_dump(mode="json")
    row.version = row.version + 1
    row.updated_by_user_id = current_user.id
    db.commit()
    db.refresh(row)
    return _row_to_response(db, row)
```

(The two new schema imports go into the existing import block at the top of the file — fold them in alphabetically; don't duplicate the import statement.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_statement_chart_configs.py -v`
Expected: 14 PASSED (9 + 5 new).

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/statement_chart_configs.py \
        backend/tests/test_statement_chart_configs.py
git commit -m "feat(api): PUT chart slot with stale-version check"
```

---

### Task 7: DELETE endpoint

**Files:**
- Modify: `backend/app/routers/statement_chart_configs.py`
- Modify: `backend/tests/test_statement_chart_configs.py`

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_statement_chart_configs.py`:

```python
# --- DELETE ---


def test_delete_non_default_slot(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _default_slot(client, auth_headers, company_id)
    new_slot = client.post(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=income-statement",
        headers=auth_headers,
    ).json()
    response = client.delete(
        f"/api/companies/{company_id}/statement-chart-configs/{new_slot['chart_instance_id']}?statement_type=income-statement",
        headers=auth_headers,
    )
    assert response.status_code == 204

    listed = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=income-statement",
        headers=auth_headers,
    ).json()
    assert len(listed["slots"]) == 1
    assert listed["slots"][0]["chart_instance_id"] == "default"


def test_delete_default_slot_returns_400(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _default_slot(client, auth_headers, company_id)
    response = client.delete(
        f"/api/companies/{company_id}/statement-chart-configs/default?statement_type=income-statement",
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_delete_unknown_slot_returns_404(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _default_slot(client, auth_headers, company_id)
    bogus = str(uuid.uuid4())
    response = client.delete(
        f"/api/companies/{company_id}/statement-chart-configs/{bogus}?statement_type=income-statement",
        headers=auth_headers,
    )
    assert response.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_statement_chart_configs.py -k delete -v`
Expected: FAIL with 405 (no DELETE handler).

- [ ] **Step 3: Add the DELETE handler**

Append to `backend/app/routers/statement_chart_configs.py`:

```python
from fastapi import Response


@router.delete("/{chart_instance_id}", status_code=204)
def delete_chart_slot(
    company_id: uuid.UUID,
    chart_instance_id: str,
    statement_type: StatementTypeQuery = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_company_access(db, current_user, company_id)

    if chart_instance_id == "default":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the default chart slot",
        )

    row = (
        db.query(StatementChartConfig)
        .filter(
            StatementChartConfig.company_id == company_id,
            StatementChartConfig.statement_type == statement_type,
            StatementChartConfig.chart_instance_id == chart_instance_id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Chart slot not found")

    db.delete(row)
    db.commit()
    return Response(status_code=204)
```

(The `from fastapi import Response` line should be folded into the existing `from fastapi import APIRouter, Depends, HTTPException, Query` import at the top — don't duplicate.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_statement_chart_configs.py -v`
Expected: 17 PASSED.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/statement_chart_configs.py \
        backend/tests/test_statement_chart_configs.py
git commit -m "feat(api): DELETE statement chart slot (reject default)"
```

---

### Task 8: Org-scoping (multi-tenant isolation) tests

**Files:**
- Modify: `backend/tests/test_statement_chart_configs.py`

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_statement_chart_configs.py`:

```python
# --- Multi-tenant isolation ---


def _register_user(client, email="other@example.com", org_name="Other Org"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "TestPassword123",
            "full_name": "Other User",
            "organization_name": org_name,
        },
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_other_org_cannot_read_chart_configs(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _default_slot(client, auth_headers, company_id)

    other_headers = _register_user(client)
    response = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=income-statement",
        headers=other_headers,
    )
    assert response.status_code == 404  # verify_company_access raises 404


def test_other_org_cannot_write_chart_configs(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    slot = _default_slot(client, auth_headers, company_id)
    other_headers = _register_user(client)

    edited = dict(slot["config"])
    edited["chartTitle"] = "Hijack attempt"
    response = client.put(
        f"/api/companies/{company_id}/statement-chart-configs/{slot['chart_instance_id']}?statement_type=income-statement",
        json={"version": slot["version"], "config": edited},
        headers=other_headers,
    )
    assert response.status_code == 404
```

- [ ] **Step 2: Run tests to verify they pass**

(They should already pass — `verify_company_access` raises 404 for cross-org access today.)

Run: `cd backend && python -m pytest tests/test_statement_chart_configs.py -k other_org -v`
Expected: 2 PASSED.

- [ ] **Step 3: Run full test suite**

Run: `cd backend && python -m pytest tests/test_statement_chart_configs.py tests/test_statement_chart_defaults.py -v`
Expected: 25 PASSED.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_statement_chart_configs.py
git commit -m "test(api): cross-org isolation for statement chart configs"
```

---

## Phase B — Frontend shared module

### Task 9: Statement chart config types module

**Files:**
- Create: `frontend/lib/statement-chart-config.ts`

This module replaces `frontend/lib/performance-chart-config.ts`. It defines the V2 series types and a `StatementType` union, but contains no storage code — slots are loaded via API (next task).

- [ ] **Step 1: Create the file**

Write `frontend/lib/statement-chart-config.ts`:

```ts
/**
 * Statement-agnostic chart config types (V2).
 *
 * Used by the Tableau de bord on all three financial-statement pages.
 * Storage is server-side (see lib/api.ts); this module is types + helpers only.
 */

export type StatementType = "income-statement" | "balance-sheet" | "cash-flow"

export type ChartMetricSpec =
  | { type: "single"; code: string }
  | { type: "sum"; codes: string[] }
  | { type: "difference"; numeratorCodes: string[]; denominatorCodes: string[] }
  | {
      type: "ratio"
      numeratorCodes: string[]
      denominatorCodes: string[]
      /** If true: 1 − (num ÷ denom) instead of num ÷ denom. */
      complement?: boolean
    }
  /** (gross profit ÷ revenue of a referenced bar series) × 100. */
  | {
      type: "derivedMargin"
      revenueSeriesId: string
      grossProfitFromSpec: ChartMetricSpec
    }

export type ChartValueFormat = "currency" | "ratio"

export interface StatementChartSeries {
  id: string
  kind: "bar" | "line"
  label: string
  spec: ChartMetricSpec
  yAxis: "left" | "right"
  valueFormat: ChartValueFormat
  showOnChart: boolean
  showInSidePanel: boolean
  color?: string
  /** Bars sharing the same stackGroup are stacked together. */
  stackGroup?: string
}

export interface StatementChartConfig {
  version: 2
  chartTitle: string
  series: StatementChartSeries[]
}

export interface ChartSlot {
  chartInstanceId: string
  slotIndex: number
  version: number
  config: StatementChartConfig
  updatedByUserEmail?: string | null
  updatedAt: string
}

export const DEFAULT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
]

export function newSeriesId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function defaultChartCardTitle(statementType: StatementType): string {
  if (statementType === "income-statement") return "Performance financière"
  if (statementType === "balance-sheet") return "Bilan"
  return "Flux de trésorerie"
}

const EMPTY_CONFIG: StatementChartConfig = {
  version: 2,
  chartTitle: "",
  series: [],
}

/** Migration / normalization for a raw spec object coming back from the API. */
export function normalizeMetricSpec(raw: unknown): ChartMetricSpec {
  if (!raw || typeof raw !== "object") return { type: "single", code: "" }
  const x = raw as Record<string, unknown>
  const t = x.type
  if (t === "single") return { type: "single", code: String(x.code ?? "").trim() }
  if (t === "sum") {
    return { type: "sum", codes: Array.isArray(x.codes) ? x.codes.map(String) : [] }
  }
  if (t === "difference") {
    return {
      type: "difference",
      numeratorCodes: Array.isArray(x.numeratorCodes) ? x.numeratorCodes.map(String) : [],
      denominatorCodes: Array.isArray(x.denominatorCodes) ? x.denominatorCodes.map(String) : [],
    }
  }
  if (t === "ratio") {
    return {
      type: "ratio",
      numeratorCodes: Array.isArray(x.numeratorCodes) ? x.numeratorCodes.map(String) : [],
      denominatorCodes: Array.isArray(x.denominatorCodes) ? x.denominatorCodes.map(String) : [],
      complement: x.complement === true,
    }
  }
  if (t === "derivedMargin") {
    return {
      type: "derivedMargin",
      revenueSeriesId: String(x.revenueSeriesId ?? ""),
      grossProfitFromSpec: normalizeMetricSpec(x.grossProfitFromSpec),
    }
  }
  return { type: "single", code: "" }
}

export function normalizeChartConfig(raw: unknown): StatementChartConfig {
  if (!raw || typeof raw !== "object") return { ...EMPTY_CONFIG }
  const r = raw as Partial<StatementChartConfig> & { series?: unknown }
  const seriesIn = Array.isArray(r.series) ? r.series : []
  const series: StatementChartSeries[] = seriesIn.map((s, i) => {
    const o = s as Record<string, unknown>
    return {
      id: typeof o.id === "string" && o.id.trim() ? o.id : newSeriesId(),
      kind: o.kind === "line" ? "line" : "bar",
      label: typeof o.label === "string" ? o.label : `Série ${i + 1}`,
      spec: normalizeMetricSpec(o.spec),
      yAxis: o.yAxis === "right" ? "right" : "left",
      valueFormat: o.valueFormat === "ratio" ? "ratio" : "currency",
      showOnChart: o.showOnChart !== false,
      showInSidePanel: o.showInSidePanel !== false,
      color: typeof o.color === "string" && o.color.trim()
        ? o.color
        : DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      stackGroup: typeof o.stackGroup === "string" && o.stackGroup.trim() ? o.stackGroup : undefined,
    }
  })
  return {
    version: 2,
    chartTitle: typeof r.chartTitle === "string" ? r.chartTitle : "",
    series,
  }
}
```

- [ ] **Step 2: Type-check the file**

Run: `cd frontend && npx tsc --noEmit lib/statement-chart-config.ts`
Expected: no errors. (If your tsconfig requires the full project, run `npx tsc --noEmit` instead; expect existing pre-port errors elsewhere but no new errors from this file.)

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/statement-chart-config.ts
git commit -m "feat(reporting): statement-agnostic chart config types"
```

---

### Task 10: API client wrappers + StaleVersionError

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Find the end of `api.ts`**

Run: `wc -l frontend/lib/api.ts` to see total line count. Append the new code at the bottom of the file (after the last export).

- [ ] **Step 2: Append wrappers**

Append to `frontend/lib/api.ts`:

```ts
// --- Statement chart configs ------------------------------------------------

import {
  normalizeChartConfig,
  type ChartSlot,
  type StatementChartConfig,
  type StatementType,
} from "@/lib/statement-chart-config"

export class StaleVersionError extends Error {
  constructor(
    public currentVersion: number,
    public currentConfig: StatementChartConfig,
    public updatedByUserEmail: string | null,
    public updatedAt: string,
  ) {
    super("stale_version")
    this.name = "StaleVersionError"
  }
}

interface RawChartSlot {
  chart_instance_id: string
  slot_index: number
  version: number
  config: unknown
  updated_by_user_email: string | null
  updated_at: string
}

function rawSlotToChartSlot(raw: RawChartSlot): ChartSlot {
  return {
    chartInstanceId: raw.chart_instance_id,
    slotIndex: raw.slot_index,
    version: raw.version,
    config: normalizeChartConfig(raw.config),
    updatedByUserEmail: raw.updated_by_user_email,
    updatedAt: raw.updated_at,
  }
}

export async function listStatementChartSlots(
  companyId: string,
  statementType: StatementType,
): Promise<ChartSlot[]> {
  const data = await apiFetch<{ slots: RawChartSlot[] }>(
    `/api/companies/${companyId}/statement-chart-configs?statement_type=${statementType}`,
  )
  return data.slots.map(rawSlotToChartSlot)
}

export async function addStatementChartSlot(
  companyId: string,
  statementType: StatementType,
): Promise<ChartSlot> {
  const raw = await apiFetch<RawChartSlot>(
    `/api/companies/${companyId}/statement-chart-configs?statement_type=${statementType}`,
    { method: "POST" },
  )
  return rawSlotToChartSlot(raw)
}

export async function removeStatementChartSlot(
  companyId: string,
  statementType: StatementType,
  chartInstanceId: string,
): Promise<void> {
  await apiFetch<void>(
    `/api/companies/${companyId}/statement-chart-configs/${encodeURIComponent(
      chartInstanceId,
    )}?statement_type=${statementType}`,
    { method: "DELETE" },
  )
}

export async function saveStatementChartSlot(
  companyId: string,
  statementType: StatementType,
  chartInstanceId: string,
  payload: { version: number; config: StatementChartConfig },
): Promise<ChartSlot> {
  try {
    const raw = await apiFetch<RawChartSlot>(
      `/api/companies/${companyId}/statement-chart-configs/${encodeURIComponent(
        chartInstanceId,
      )}?statement_type=${statementType}`,
      { method: "PUT", body: payload },
    )
    return rawSlotToChartSlot(raw)
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      // FastAPI wraps the detail under `detail` when raising HTTPException.
      try {
        const parsed = JSON.parse(err.detail) as {
          detail?: string
          current_version?: number
          current_config?: unknown
          updated_by_user_email?: string | null
          updated_at?: string
        }
        if (
          parsed.detail === "stale_version" &&
          typeof parsed.current_version === "number" &&
          typeof parsed.updated_at === "string"
        ) {
          throw new StaleVersionError(
            parsed.current_version,
            normalizeChartConfig(parsed.current_config),
            parsed.updated_by_user_email ?? null,
            parsed.updated_at,
          )
        }
      } catch (parseErr) {
        if (parseErr instanceof StaleVersionError) throw parseErr
        // fall through to rethrow original ApiError
      }
    }
    throw err
  }
}
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors from `lib/api.ts`.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(reporting): API client for statement chart configs"
```

---

### Task 11: useStatementChartSlots hook

**Files:**
- Create: `frontend/hooks/use-statement-chart-slots.ts`

- [ ] **Step 1: Write the hook**

Write `frontend/hooks/use-statement-chart-slots.ts`:

```ts
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  addStatementChartSlot,
  listStatementChartSlots,
  removeStatementChartSlot,
} from "@/lib/api"
import type { ChartSlot, StatementType } from "@/lib/statement-chart-config"

export interface UseStatementChartSlotsReturn {
  slots: ChartSlot[]
  activeSlotId: string
  setActiveSlotId: (id: string) => void
  addSlot: () => Promise<void>
  removeSlot: (chartInstanceId: string) => Promise<void>
  refresh: () => Promise<void>
  loading: boolean
  error: string | null
}

export function useStatementChartSlots(
  companyId: string | null | undefined,
  statementType: StatementType,
): UseStatementChartSlotsReturn {
  const [slots, setSlots] = useState<ChartSlot[]>([])
  const [activeSlotId, setActiveSlotId] = useState<string>("default")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSlots = useCallback(async () => {
    if (!companyId) {
      setSlots([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const fetched = await listStatementChartSlots(companyId, statementType)
      setSlots(fetched)
      setActiveSlotId((prev) =>
        fetched.some((s) => s.chartInstanceId === prev)
          ? prev
          : fetched[0]?.chartInstanceId ?? "default",
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load chart configs"
      setError(msg)
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [companyId, statementType])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  const addSlot = useCallback(async () => {
    if (!companyId) return
    const created = await addStatementChartSlot(companyId, statementType)
    await fetchSlots()
    setActiveSlotId(created.chartInstanceId)
  }, [companyId, statementType, fetchSlots])

  const removeSlot = useCallback(
    async (chartInstanceId: string) => {
      if (!companyId) return
      if (chartInstanceId === "default") return
      await removeStatementChartSlot(companyId, statementType, chartInstanceId)
      await fetchSlots()
    },
    [companyId, statementType, fetchSlots],
  )

  return useMemo(
    () => ({
      slots,
      activeSlotId,
      setActiveSlotId,
      addSlot,
      removeSlot,
      refresh: fetchSlots,
      loading,
      error,
    }),
    [slots, activeSlotId, addSlot, removeSlot, fetchSlots, loading, error],
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/hooks/use-statement-chart-slots.ts
git commit -m "feat(reporting): hook for managing chart slots per statement"
```

---

### Task 12: StatementChart component (port)

**Files:**
- Create: `frontend/components/statement-chart.tsx` (by copying and adapting `income-statement-chart.tsx`)
- (Old `income-statement-chart.tsx` is **not** deleted here — Task 19 cleans up.)

This is a large file port (~1000 lines). The strategy: copy, then make targeted edits. The behavior stays identical for income-statement; non-income statement types just don't render the narrative panel.

- [ ] **Step 1: Copy the existing file**

Run (PowerShell): `Copy-Item frontend/components/income-statement-chart.tsx frontend/components/statement-chart.tsx`

- [ ] **Step 2: Update imports — switch config module + add statement type**

Edit `frontend/components/statement-chart.tsx`:

Replace the import block:

```tsx
import {
  DEFAULT_PERFORMANCE_CHART_CONFIG,
  DEFAULT_PERFORMANCE_CHART_CARD_TITLE,
  loadPerformanceChartConfig,
  type ChartValueFormat,
  type PerformanceChartConfigV2,
} from "@/lib/performance-chart-config"
```

with:

```tsx
import {
  defaultChartCardTitle,
  normalizeChartConfig,
  type ChartSlot,
  type ChartValueFormat,
  type StatementChartConfig,
  type StatementType,
} from "@/lib/statement-chart-config"
```

- [ ] **Step 3: Replace the props interface**

Find `interface IncomeStatementChartProps {` and replace the entire interface with:

```tsx
interface StatementChartProps {
  statementType: StatementType
  period: "monthly" | "quarterly" | "annual"
  view: "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
  fiscalYear?: number
  referenceMonth?: number
  loading?: boolean
  structureVersion?: number
  /** The slot's config + version is passed in by the parent hook. */
  slot: ChartSlot
  /** Optional: shown as "n / N" when multiple slots exist. */
  chartSlotNumber?: number
  chartSlotCount?: number
  /** Slot-selector dropdown options (omit when there's only one slot). */
  chartInstanceOptions?: Array<{ id: string; label: string }>
  onChartInstanceChange?: (id: string) => void
  /** Called after a settings save so the parent can refetch slots. */
  onChartConfigSaved?: () => void
  /** Only set on additional (non-default) slots. */
  onRemoveChart?: () => void
}
```

- [ ] **Step 4: Replace the function signature and config-loading logic**

Find the function declaration `export function IncomeStatementChart({` and rename to `export function StatementChart({`. Update destructured props to match the new interface — add `statementType` and `slot`, remove `chartData` and `chartInstanceId`.

Replace this block near the top of the function body:

```tsx
const [perfConfig, setPerfConfig] = useState<PerformanceChartConfigV2>(DEFAULT_PERFORMANCE_CHART_CONFIG)
const [settingsOpen, setSettingsOpen] = useState(false)
const [visibleSeriesIds, setVisibleSeriesIds] = useState<Record<string, boolean>>(() =>
  Object.fromEntries(DEFAULT_PERFORMANCE_CHART_CONFIG.series.map((s) => [s.id, s.showOnChart]))
)
```

with:

```tsx
const perfConfig: StatementChartConfig = slot.config
const [settingsOpen, setSettingsOpen] = useState(false)
const [visibleSeriesIds, setVisibleSeriesIds] = useState<Record<string, boolean>>(() =>
  Object.fromEntries(slot.config.series.map((s) => [s.id, s.showOnChart])),
)
```

And remove the entire `useEffect` block that calls `loadPerformanceChartConfig(...)`:

```tsx
useEffect(() => {
  const cfg = loadPerformanceChartConfig(companyId ?? null, chartInstanceId)
  setPerfConfig(cfg)
  setVisibleSeriesIds(Object.fromEntries(cfg.series.map((s) => [s.id, s.showOnChart])))
}, [companyId, chartInstanceId])
```

Replace it with a sync-on-slot-change effect:

```tsx
useEffect(() => {
  setVisibleSeriesIds(Object.fromEntries(slot.config.series.map((s) => [s.id, s.showOnChart])))
}, [slot.chartInstanceId, slot.version])
```

- [ ] **Step 5: Replace the `useFinancialStatementSeries` `statementType` literal with the prop**

Find the call:

```tsx
const { rows: seriesRows, periods: seriesPeriods, loading: seriesLoading } = useFinancialStatementSeries({
  companyId: companyId || null,
  statementType: "income-statement",
  ...
})
```

Change `statementType: "income-statement"` to `statementType,` (use the prop).

- [ ] **Step 6: Gate the narrative computation and renderer on statementType**

The original income-statement-chart.tsx has two `buildIncomePerformanceNarrative(...)` call sites (the legacy `chartData` path and the dynamic-series path) plus a `mapDynamicChartToNarrativePoints(...)` call. After Step 9 removes the legacy path, only the dynamic-series narrative remains.

Find the remaining narrative computation — typically a `useMemo` like:

```tsx
const narrative = useMemo(() => {
  if (!dynamicPoints || !seriesMeta.length) return null
  const mapped = mapDynamicChartToNarrativePoints(dynamicPoints, seriesMeta)
  return buildIncomePerformanceNarrative(mapped, view)
}, [dynamicPoints, seriesMeta, view])
```

Add an early-return guard on `statementType`:

```tsx
const narrative = useMemo(() => {
  if (statementType !== "income-statement") return null
  if (!dynamicPoints || !seriesMeta.length) return null
  const mapped = mapDynamicChartToNarrativePoints(dynamicPoints, seriesMeta)
  return buildIncomePerformanceNarrative(mapped, view)
}, [statementType, dynamicPoints, seriesMeta, view])
```

Find the render: `{narrative && <IncomePerformanceNarrativeSection narrative={narrative} />}`. No change needed — the gated `narrative` will already be `null` for non-income statements, so the render short-circuits.

- [ ] **Step 7: Update the settings dialog import + invocation**

Replace:

```tsx
import { PerformanceChartSettingsDialog } from "@/components/performance-chart-settings-dialog"
```

with:

```tsx
import { StatementChartSettingsDialog } from "@/components/statement-chart-settings-dialog"
```

And update the JSX usage from `<PerformanceChartSettingsDialog ...>` to `<StatementChartSettingsDialog ...>`. Pass `statementType={statementType}`, `slot={slot}`, and an `onSaved={onChartConfigSaved}` callback. **The settings dialog itself doesn't exist yet** — Task 14 creates it. This will be a temporary type error until that task lands.

- [ ] **Step 8: Add stackGroup support to bar rendering**

Find the `<Bar ... />` render block inside the chart. Add a `stackId={s.stackGroup}` prop on the `<Bar>` element. Recharts ignores `stackId` when the value is `undefined`.

Example (the exact context will be a `.map(...)` over series):

```tsx
{barSeries.map((s) => (
  <Bar
    key={s.id}
    dataKey={s.id}
    fill={s.color}
    stackId={s.stackGroup}     // <-- added line
    /* ...other existing props */
  />
))}
```

- [ ] **Step 9: Remove the legacy `chartData` prop wiring**

The new component only renders via `useFinancialStatementSeries`. Remove these blocks:

```tsx
const effectiveChartData: IncomeStatementChartDataPoint[] | DynamicChartPoint[] | null =
  chartData ?? dynamicPoints

// ...elsewhere
function isLegacyPoint(row: unknown): row is IncomeStatementChartDataPoint { ... }
```

Replace `effectiveChartData` references with `dynamicPoints`. Remove the `IncomeStatementChartDataPoint` interface and any code paths that branch on `isLegacyPoint`. (These paths existed to support an obsolete static-data mode; the chart is purely series-driven now.)

- [ ] **Step 10: Update the card title fallback**

Find any reference to `DEFAULT_PERFORMANCE_CHART_CARD_TITLE` and replace with `defaultChartCardTitle(statementType)`.

- [ ] **Step 11: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: errors about `@/components/statement-chart-settings-dialog` (created in Task 14). No other new errors. If there are other new errors, fix them inline before committing.

- [ ] **Step 12: Commit**

```bash
git add frontend/components/statement-chart.tsx
git commit -m "feat(reporting): StatementChart component (port from IncomeStatementChart)"
```

---

### Task 13: StatementChartSettingsDialog (port + audit + stale flow)

**Files:**
- Create: `frontend/components/statement-chart-settings-dialog.tsx` (port from `performance-chart-settings-dialog.tsx`)

- [ ] **Step 1: Copy the existing dialog**

Run (PowerShell): `Copy-Item frontend/components/performance-chart-settings-dialog.tsx frontend/components/statement-chart-settings-dialog.tsx`

- [ ] **Step 2: Replace imports**

Edit `frontend/components/statement-chart-settings-dialog.tsx`. Replace:

```tsx
import {
  collectDistinctLinkCodesFromStructure,
  normalizeCodeList,
} from "@/lib/income-statement-structure-utils"
import type {
  ChartValueFormat,
  PerformanceChartConfigV2,
  PerformanceChartSeriesV2,
  PerformanceMetricSpec,
} from "@/lib/performance-chart-config"
import {
  DEFAULT_PERFORMANCE_CHART_CONFIG,
  DEFAULT_COLORS,
  DEFAULT_PERFORMANCE_CHART_CARD_TITLE,
  newSeriesId,
  loadPerformanceChartConfig,
  savePerformanceChartConfig,
} from "@/lib/performance-chart-config"
```

with:

```tsx
import {
  collectDistinctLinkCodesFromStructure,
  normalizeCodeList,
} from "@/lib/income-statement-structure-utils"
import {
  DEFAULT_COLORS,
  defaultChartCardTitle,
  newSeriesId,
  type ChartMetricSpec,
  type ChartSlot,
  type ChartValueFormat,
  type StatementChartConfig,
  type StatementChartSeries,
  type StatementType,
} from "@/lib/statement-chart-config"
import { saveStatementChartSlot, StaleVersionError } from "@/lib/api"
```

- [ ] **Step 3: Globally rename type references inside the file**

Do these find/replace passes (Edit tool with `replace_all: true`) — order matters: do the longer names first.

| Find | Replace |
|---|---|
| `PerformanceChartConfigV2` | `StatementChartConfig` |
| `PerformanceChartSeriesV2` | `StatementChartSeries` |
| `PerformanceMetricSpec` | `ChartMetricSpec` |
| `DEFAULT_PERFORMANCE_CHART_CARD_TITLE` | `defaultChartCardTitle(statementType)` |

Don't replace `DEFAULT_PERFORMANCE_CHART_CONFIG` globally — Steps 5 and 6 handle its two specific uses individually.

- [ ] **Step 4: Replace the props interface and component signature**

Find the existing props interface (look for the export of `PerformanceChartSettingsDialog`) and replace with:

```tsx
interface StatementChartSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  statementType: StatementType
  companyId: string
  slot: ChartSlot
  /** Called after the parent should refetch slots (e.g., title change rename). */
  onSaved: () => void
}

export function StatementChartSettingsDialog({
  open,
  onOpenChange,
  statementType,
  companyId,
  slot,
  onSaved,
}: StatementChartSettingsDialogProps) {
```

(Keep the body of the component below; the existing local-state and JSX still work.)

- [ ] **Step 5: Rename `draft` → `localConfig` and replace localStorage I/O with API calls**

Inside the component body the existing dialog uses `const [draft, setDraft] = useState(DEFAULT_PERFORMANCE_CHART_CONFIG)`. Rename it everywhere in the file using Edit with `replace_all: true`:

| Find | Replace |
|---|---|
| `setDraft(` | `setLocalConfig(` |
| `draft.` | `localConfig.` |
| `draft,` | `localConfig,` |
| `draft)` | `localConfig)` |
| `draft }` | `localConfig }` |
| `[draft` | `[localConfig` |

Then replace the `useState` declaration itself:

```tsx
const [draft, setDraft] = useState<PerformanceChartConfigV2>(DEFAULT_PERFORMANCE_CHART_CONFIG)
```

→ (already aligned with the new state block defined below)

Find every `savePerformanceChartConfig(companyId, nextConfig, chartInstanceId)` call (in a `handleSave`-like function and inside the existing `reset` function — the reset call goes away in Step 6). Replace the save call site:

```tsx
async function handleSave() {
  setSaving(true)
  setStaleConflict(null)
  try {
    await saveStatementChartSlot(companyId, statementType, slot.chartInstanceId, {
      version: slot.version,
      config: localConfig,
    })
    onSaved()
    onOpenChange(false)
  } catch (e) {
    if (e instanceof StaleVersionError) {
      setStaleConflict({
        currentVersion: e.currentVersion,
        currentConfig: e.currentConfig,
        updatedByUserEmail: e.updatedByUserEmail,
        updatedAt: e.updatedAt,
      })
    } else {
      setSaveError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
    }
  } finally {
    setSaving(false)
  }
}
```

Declare the new state at the top of the component (replacing the old `const [draft, setDraft] = useState(DEFAULT_PERFORMANCE_CHART_CONFIG)` line):

```tsx
const [saving, setSaving] = useState(false)
const [saveError, setSaveError] = useState<string | null>(null)
const [staleConflict, setStaleConflict] = useState<{
  currentVersion: number
  currentConfig: StatementChartConfig
  updatedByUserEmail: string | null
  updatedAt: string
} | null>(null)
const [localConfig, setLocalConfig] = useState<StatementChartConfig>(slot.config)

useEffect(() => {
  setLocalConfig(slot.config)
  setStaleConflict(null)
  setSaveError(null)
}, [slot.chartInstanceId, slot.version, open])
```

Also **remove the existing `reset` function and its button**. The old dialog has `const reset = () => { setDraft(DEFAULT_PERFORMANCE_CHART_CONFIG); if (companyId) savePerformanceChartConfig(companyId, DEFAULT_PERFORMANCE_CHART_CONFIG, chartInstanceId) }` and a `<Button ... onClick={reset}>` in the footer. The spec explicitly excludes a reset UI ("YAGNI for a reset button until someone asks"). Delete both the function and its button.

- [ ] **Step 6: Add the stale-conflict banner JSX**

Inside the dialog content, just below `<DialogHeader>...</DialogHeader>` (or wherever feels visually correct above the form), insert:

```tsx
{staleConflict && (
  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
    <p className="font-medium">
      Quelqu'un d'autre a modifié ce graphique pendant que vous l'éditiez
      {staleConflict.updatedByUserEmail ? ` (${staleConflict.updatedByUserEmail})` : ""}
      . Vos modifications n'ont pas été enregistrées.
    </p>
    <div className="mt-3 flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setLocalConfig(staleConflict.currentConfig)
          setStaleConflict(null)
        }}
      >
        Recharger
      </Button>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={async () => {
          setSaving(true)
          try {
            await saveStatementChartSlot(
              companyId,
              statementType,
              slot.chartInstanceId,
              { version: staleConflict.currentVersion, config: localConfig },
            )
            onSaved()
            onOpenChange(false)
          } catch (e) {
            if (e instanceof StaleVersionError) {
              setStaleConflict({
                currentVersion: e.currentVersion,
                currentConfig: e.currentConfig,
                updatedByUserEmail: e.updatedByUserEmail,
                updatedAt: e.updatedAt,
              })
            } else {
              setSaveError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
            }
          } finally {
            setSaving(false)
          }
        }}
      >
        Écraser quand même
      </Button>
    </div>
  </div>
)}
```

- [ ] **Step 7: Add the audit-display line at the bottom of the dialog**

Just inside the `<DialogFooter>` or just above it, add:

```tsx
{slot.updatedByUserEmail && (
  <p className="text-xs text-slate-400">
    Modifié par {slot.updatedByUserEmail} • {new Date(slot.updatedAt).toLocaleString("fr-CA")}
  </p>
)}
```

- [ ] **Step 8: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: zero errors related to chart-config or chart components. (Pages that still import the OLD names will error — they're rewired in Tasks 14–16. That's fine for this commit.)

If errors persist that aren't from the page files, fix them inline now.

- [ ] **Step 9: Commit**

```bash
git add frontend/components/statement-chart-settings-dialog.tsx
git commit -m "feat(reporting): StatementChartSettingsDialog with stale-version flow"
```

---

## Phase C — Page wiring

### Task 14: Wire income-statement page to the new module

**Files:**
- Modify: `frontend/app/financial-statements/income-statement/page.tsx`

- [ ] **Step 1: Replace performance-chart-config imports**

Edit `frontend/app/financial-statements/income-statement/page.tsx`. Remove this entire import block:

```tsx
import {
  appendPerformanceChartSlot,
  DEFAULT_PERFORMANCE_CHART_CARD_TITLE,
  loadPerformanceChartSlotIds,
  loadPerformanceChartConfig,
  removePerformanceChartSlot,
} from "@/lib/performance-chart-config"
```

Add:

```tsx
import { defaultChartCardTitle } from "@/lib/statement-chart-config"
import { useStatementChartSlots } from "@/hooks/use-statement-chart-slots"
```

And update the `IncomeStatementChart` import:

```tsx
import { StatementChart } from "@/components/statement-chart"
```

(Remove the old `import { IncomeStatementChart } from "@/components/income-statement-chart"`.)

- [ ] **Step 2: Replace slot-management state**

Remove these state declarations and `useEffect` blocks:

```tsx
const [performanceChartSlotIds, setPerformanceChartSlotIds] = useState<string[]>(["default"])
const [activePerformanceChartSlotId, setActivePerformanceChartSlotId] = useState<string>("default")
const [chartConfigVersion, setChartConfigVersion] = useState(0)

const performanceChartSlotOptions = useMemo(() => {
  // ...
}, [effectiveCompanyId, performanceChartSlotIds, chartConfigVersion])

useEffect(() => {
  if (!effectiveCompanyId) {
    setPerformanceChartSlotIds(["default"])
    setActivePerformanceChartSlotId("default")
    return
  }
  const ids = loadPerformanceChartSlotIds(effectiveCompanyId)
  setPerformanceChartSlotIds(ids)
  setActivePerformanceChartSlotId((prev) => (ids.includes(prev) ? prev : ids[0] ?? "default"))
}, [effectiveCompanyId])

const handleAddPerformanceChart = () => { ... }
const handleRemovePerformanceChart = (slotId: string) => { ... }
```

Replace with the hook:

```tsx
const {
  slots: chartSlots,
  activeSlotId,
  setActiveSlotId,
  addSlot: addChartSlot,
  removeSlot: removeChartSlot,
  refresh: refreshChartSlots,
} = useStatementChartSlots(effectiveCompanyId, "income-statement")

const chartInstanceOptions = useMemo(() => {
  return chartSlots.map((s, i) => {
    const title = s.config.chartTitle.trim()
    const label = title || defaultChartCardTitle("income-statement") || `Graphique ${i + 1}`
    return { id: s.chartInstanceId, label }
  })
}, [chartSlots])

const activeSlot = chartSlots.find((s) => s.chartInstanceId === activeSlotId) ?? chartSlots[0]
```

- [ ] **Step 3: Replace the IncomeStatementChart render block**

Find the existing `<IncomeStatementChart ... />` render and replace with:

```tsx
{activeSlot ? (
  <StatementChart
    statementType="income-statement"
    key={activeSlot.chartInstanceId}
    slot={activeSlot}
    chartSlotNumber={chartSlots.findIndex((s) => s.chartInstanceId === activeSlotId) + 1}
    chartSlotCount={chartSlots.length}
    chartInstanceOptions={chartInstanceOptions}
    onChartInstanceChange={setActiveSlotId}
    onChartConfigSaved={refreshChartSlots}
    onRemoveChart={
      activeSlot.chartInstanceId !== "default" && chartSlots.length > 1
        ? () => removeChartSlot(activeSlot.chartInstanceId)
        : undefined
    }
    period={period}
    view={view}
    companyId={effectiveCompanyId}
    divisionId={selectedDivisionId}
    subDivisionId={selectedSubDivisionId}
    companies={companies}
    comparisonType={comparisonType}
    selectedBudgetId={comparisonType === "budget" ? selectedBudgetId : null}
    selectedBudgetName={
      comparisonType === "budget" && selectedBudgetId
        ? budgets.find((b) => b.id === selectedBudgetId)?.name || null
        : null
    }
    fiscalYear={selectedYear}
    referenceMonth={selectedMonth}
    structureVersion={structureVersion}
  />
) : null}
```

And update the "Ajouter un graphique" button:

```tsx
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => addChartSlot()}
  className="gap-1.5 border-slate-200 bg-white/90 text-slate-800 shadow-sm hover:bg-white"
>
  <Plus className="h-4 w-4" aria-hidden />
  Ajouter un graphique
</Button>
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors related to this file. (Balance sheet / cash-flow pages still use old imports; they're addressed in the next tasks.)

- [ ] **Step 5: Smoke-test in dev**

Run: `cd frontend && pnpm dev`

In a browser open http://localhost:3000/financial-statements/income-statement. Click Tableau de bord. The default chart card should render. Open settings, change the chart title, save. Reload the page — the title persists. Click "Ajouter un graphique" — a second card appears. Switch between slots via the dropdown. Delete the second slot.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/financial-statements/income-statement/page.tsx
git commit -m "feat(reporting): income-statement page uses StatementChart"
```

---

### Task 15: Wire balance-sheet page to multi-slot dashboard

**Files:**
- Modify: `frontend/app/financial-statements/balance-sheet/page.tsx`

- [ ] **Step 1: Add imports**

Edit `frontend/app/financial-statements/balance-sheet/page.tsx`. Add at the top of the import section:

```tsx
import { Plus } from "lucide-react"
import { StatementChart } from "@/components/statement-chart"
import { useStatementChartSlots } from "@/hooks/use-statement-chart-slots"
import { defaultChartCardTitle } from "@/lib/statement-chart-config"
```

Remove:

```tsx
import { BalanceSheetChart } from "@/components/balance-sheet-chart"
```

- [ ] **Step 2: Add slot-management hook**

In the component body, just below the existing state declarations (after `const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(null)`), add:

```tsx
const effectiveCompanyId = selectedCompanyId || resolvedCompanyId

const {
  slots: chartSlots,
  activeSlotId,
  setActiveSlotId,
  addSlot: addChartSlot,
  removeSlot: removeChartSlot,
  refresh: refreshChartSlots,
} = useStatementChartSlots(effectiveCompanyId, "balance-sheet")

const chartInstanceOptions = useMemo(() => {
  return chartSlots.map((s, i) => {
    const title = s.config.chartTitle.trim()
    const label = title || defaultChartCardTitle("balance-sheet") || `Graphique ${i + 1}`
    return { id: s.chartInstanceId, label }
  })
}, [chartSlots])

const activeSlot = chartSlots.find((s) => s.chartInstanceId === activeSlotId) ?? chartSlots[0]
```

- [ ] **Step 3: Replace the dashboard block**

Find the existing dashboard render block:

```tsx
{section === "dashboard" && (
  <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
    <div className="relative -mt-32">
      <BalanceSheetChart ... />
    </div>
  </main>
)}
```

Replace with:

```tsx
{section === "dashboard" && (
  <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
    <div className="relative -mt-32 space-y-6">
      {effectiveCompanyId ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addChartSlot()}
            className="gap-1.5 border-slate-200 bg-white/90 text-slate-800 shadow-sm hover:bg-white"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter un graphique
          </Button>
        </div>
      ) : null}
      {activeSlot ? (
        <StatementChart
          statementType="balance-sheet"
          key={activeSlot.chartInstanceId}
          slot={activeSlot}
          chartSlotNumber={chartSlots.findIndex((s) => s.chartInstanceId === activeSlotId) + 1}
          chartSlotCount={chartSlots.length}
          chartInstanceOptions={chartInstanceOptions}
          onChartInstanceChange={setActiveSlotId}
          onChartConfigSaved={refreshChartSlots}
          onRemoveChart={
            activeSlot.chartInstanceId !== "default" && chartSlots.length > 1
              ? () => removeChartSlot(activeSlot.chartInstanceId)
              : undefined
          }
          period={period}
          view={view}
          companyId={effectiveCompanyId}
          divisionId={selectedDivisionId}
          subDivisionId={selectedSubDivisionId}
          companies={companies}
          fiscalYear={selectedYear}
          structureVersion={structureVersion}
        />
      ) : null}
    </div>
  </main>
)}
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors in balance-sheet page.

- [ ] **Step 5: Smoke-test in dev**

Open http://localhost:3000/financial-statements/balance-sheet → Tableau de bord. The default chart renders. Add a second chart. Open settings, edit the title, save. Switch slots. Delete second slot.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/financial-statements/balance-sheet/page.tsx
git commit -m "feat(reporting): balance-sheet dashboard uses multi-slot StatementChart"
```

---

### Task 16: Wire cash-flow page (add dashboard section)

**Files:**
- Modify: `frontend/app/financial-statements/cash-flow/page.tsx`

- [ ] **Step 1: Add imports**

Edit `frontend/app/financial-statements/cash-flow/page.tsx`. Add:

```tsx
import { Plus } from "lucide-react"
import { StatementChart } from "@/components/statement-chart"
import { useStatementChartSlots } from "@/hooks/use-statement-chart-slots"
import { defaultChartCardTitle } from "@/lib/statement-chart-config"
```

Remove:

```tsx
import { CashFlowChart } from "@/components/cash-flow-chart"
```

- [ ] **Step 2: Expand the Section union**

Find:

```tsx
type Section = "summary" | "detail"
```

Replace with:

```tsx
type Section = "dashboard" | "summary" | "detail"
```

- [ ] **Step 3: Change the default section to dashboard**

Find:

```tsx
const [section, setSection] = useState<Section>("summary")
```

Replace with:

```tsx
const [section, setSection] = useState<Section>("dashboard")
```

- [ ] **Step 4: Add a Tableau de bord button to the section toggle**

Find the section-toggle `<div>` that contains the two existing buttons (Sommaire / Détail). Add a new button **above** the Sommaire button:

```tsx
<Button
  variant="ghost"
  onClick={() => setSection("dashboard")}
  className={`h-8 text-xs px-3 transition-all ${
    section === "dashboard"
      ? "bg-[#E0742D] text-white font-medium shadow-sm hover:bg-[#c96526]"
      : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
  }`}
>
  Tableau de bord
</Button>
```

- [ ] **Step 5: Add the slot-management hook**

Add this block right after `const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(null)` (around the other state declarations):

```tsx
const effectiveCompanyId = selectedCompanyId || resolvedCompanyId

const {
  slots: chartSlots,
  activeSlotId,
  setActiveSlotId,
  addSlot: addChartSlot,
  removeSlot: removeChartSlot,
  refresh: refreshChartSlots,
} = useStatementChartSlots(effectiveCompanyId, "cash-flow")

const chartInstanceOptions = useMemo(() => {
  return chartSlots.map((s, i) => {
    const title = s.config.chartTitle.trim()
    const label = title || defaultChartCardTitle("cash-flow") || `Graphique ${i + 1}`
    return { id: s.chartInstanceId, label }
  })
}, [chartSlots])

const activeSlot = chartSlots.find((s) => s.chartInstanceId === activeSlotId) ?? chartSlots[0]
```

- [ ] **Step 6: Move the inline chart and Top-3 band so they only render in summary/detail**

Find the existing JSX that lives between the dark header band and the summary/detail render:

```tsx
<main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
  <div className="relative -mt-32">
    <CashFlowChart ... />
  </div>
</main>

{/* Dark Section between Chart and Summary/Detail */}
<div className="relative w-full pt-12 pb-32 overflow-hidden">
  {/* ...Top 3 variations band... */}
</div>

<main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
  <div className="relative -mt-32">
    {section === "summary" ? <CashFlowSummary ... /> : <CashFlowDetail ... />}
  </div>
</main>
```

Wrap the inline chart `<main>...CashFlowChart...</main>` AND the entire Top-3 dark band `<div>...</div>` in `{section !== "dashboard" && ( ... )}`.

Replace `<CashFlowChart ... />` inside the wrapped block — leave the chart it shows in Summary/Detail mode as a smaller inline preview. **Actually, on second thought:** the spec says "the current standalone chart block + Top-3 variations dark band move inside the Sommaire/Détail render path." The simplest correct expression: keep the inline `CashFlowChart` only when not in dashboard mode. Since CashFlowChart is being deleted in Task 19, use `StatementChart` here too — but with a fixed default slot (we don't want it user-customizable in Summary/Detail). Easier: just keep showing the active dashboard slot here as well, but use the `default` slot. That preserves the visual without adding another customization surface.

Replacement for the inner chart block (inside the new `section !== "dashboard"` wrapper):

```tsx
{chartSlots[0] ? (
  <StatementChart
    statementType="cash-flow"
    slot={chartSlots[0]}
    period={period}
    view={view}
    companyId={effectiveCompanyId}
    divisionId={selectedDivisionId}
    subDivisionId={selectedSubDivisionId}
    companies={companies}
    fiscalYear={selectedYear}
  />
) : null}
```

(No slot selector, no add button, no remove button — it reads the dashboard's `default` slot for display only. The Top-3 band logic above doesn't change.)

- [ ] **Step 7: Add the dashboard section render block**

Just above the existing `<main className="w-full py-8 px-6 max-w-[1920px] mx-auto">` that now wraps the summary/detail chart preview, add:

```tsx
{section === "dashboard" && (
  <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
    <div className="relative -mt-32 space-y-6">
      {effectiveCompanyId ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addChartSlot()}
            className="gap-1.5 border-slate-200 bg-white/90 text-slate-800 shadow-sm hover:bg-white"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter un graphique
          </Button>
        </div>
      ) : null}
      {activeSlot ? (
        <StatementChart
          statementType="cash-flow"
          key={activeSlot.chartInstanceId}
          slot={activeSlot}
          chartSlotNumber={chartSlots.findIndex((s) => s.chartInstanceId === activeSlotId) + 1}
          chartSlotCount={chartSlots.length}
          chartInstanceOptions={chartInstanceOptions}
          onChartInstanceChange={setActiveSlotId}
          onChartConfigSaved={refreshChartSlots}
          onRemoveChart={
            activeSlot.chartInstanceId !== "default" && chartSlots.length > 1
              ? () => removeChartSlot(activeSlot.chartInstanceId)
              : undefined
          }
          period={period}
          view={view}
          companyId={effectiveCompanyId}
          divisionId={selectedDivisionId}
          subDivisionId={selectedSubDivisionId}
          companies={companies}
          fiscalYear={selectedYear}
        />
      ) : null}
    </div>
  </main>
)}
```

- [ ] **Step 8: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors. (Old `CashFlowChart` import is gone.)

- [ ] **Step 9: Smoke-test in dev**

Open http://localhost:3000/financial-statements/cash-flow. The new "Tableau de bord" button appears alongside Sommaire/Détail. Dashboard mode shows the default chart (Op/Inv/Fin stacked + net line — empty bars until link codes are set in settings). Switch to Sommaire — the inline chart + Top-3 band still appears above the table. Switch to Détail — same.

- [ ] **Step 10: Commit**

```bash
git add frontend/app/financial-statements/cash-flow/page.tsx
git commit -m "feat(reporting): cash-flow page gains Tableau de bord section"
```

---

### Task 17: Delete old files

**Files:**
- Delete: `frontend/lib/performance-chart-config.ts`
- Delete: `frontend/components/income-statement-chart.tsx`
- Delete: `frontend/components/performance-chart-settings-dialog.tsx`
- Delete: `frontend/components/balance-sheet-chart.tsx`
- Delete: `frontend/components/cash-flow-chart.tsx`

- [ ] **Step 1: Confirm no remaining imports**

Run (PowerShell):

```powershell
Select-String -Path frontend\app\**\*.tsx,frontend\components\**\*.tsx,frontend\lib\**\*.ts,frontend\hooks\**\*.ts `
  -Pattern "performance-chart-config|income-statement-chart|performance-chart-settings-dialog|balance-sheet-chart|cash-flow-chart"
```

Expected: no matches.

If matches exist, fix the importing file (replace with the new names) before deleting.

- [ ] **Step 2: Delete the files**

Run (PowerShell):

```powershell
Remove-Item frontend\lib\performance-chart-config.ts
Remove-Item frontend\components\income-statement-chart.tsx
Remove-Item frontend\components\performance-chart-settings-dialog.tsx
Remove-Item frontend\components\balance-sheet-chart.tsx
Remove-Item frontend\components\cash-flow-chart.tsx
```

- [ ] **Step 3: Build to confirm no broken references**

Run: `cd frontend && pnpm build`
Expected: build completes without errors.

- [ ] **Step 4: Commit**

```bash
git add -A frontend/lib/performance-chart-config.ts \
          frontend/components/income-statement-chart.tsx \
          frontend/components/performance-chart-settings-dialog.tsx \
          frontend/components/balance-sheet-chart.tsx \
          frontend/components/cash-flow-chart.tsx
git commit -m "chore(reporting): remove superseded chart files"
```

---

## Phase D — E2E tests

### Task 18: E2E for income-statement dashboard (regression)

**Files:**
- Create: `frontend/e2e/dashboard-income-statement.spec.ts`

- [ ] **Step 1: Write the spec**

Write `frontend/e2e/dashboard-income-statement.spec.ts`:

```ts
import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

async function setupAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([
    { name: "has_session", value: "1", url: "http://localhost:3000" },
  ])
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "u1", email: "u@e.com", full_name: "Test", is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin" }],
      }),
    }),
  )
  await page.route("**/api/companies", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify([{ id: COMPANY_ID, name: "Test Co", divisions: [] }]),
    }),
  )
}

async function mockSlotList(page: Page, slots: unknown[]) {
  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-chart-configs*`,
    (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({ slots }),
        })
      }
      return route.continue()
    },
  )
}

function defaultIncomeSlot() {
  return {
    chart_instance_id: "default",
    slot_index: 0,
    version: 1,
    config: {
      version: 2,
      chartTitle: "Performance financière",
      series: [
        { id: "r", kind: "bar", label: "Revenus", spec: { type: "single", code: "" },
          yAxis: "left", valueFormat: "currency", showOnChart: true, showInSidePanel: true, color: "#3b82f6" },
        { id: "e", kind: "bar", label: "BAIIA", spec: { type: "single", code: "" },
          yAxis: "left", valueFormat: "currency", showOnChart: true, showInSidePanel: true, color: "#10b981" },
        { id: "m", kind: "line", label: "Marge brute (%)",
          spec: { type: "derivedMargin", revenueSeriesId: "r", grossProfitFromSpec: { type: "single", code: "" } },
          yAxis: "right", valueFormat: "ratio", showOnChart: true, showInSidePanel: true, color: "#f59e0b" },
      ],
    },
    updated_by_user_email: "u@e.com",
    updated_at: "2026-05-18T00:00:00Z",
  }
}

test.describe("Income statement dashboard", () => {
  test("default chart renders with three series", async ({ page }) => {
    await setupAuth(page)
    await mockSlotList(page, [defaultIncomeSlot()])

    await page.goto(`/financial-statements/income-statement?companyId=${COMPANY_ID}`)
    await page.getByRole("button", { name: /tableau de bord/i }).click()
    await expect(page.getByText("Performance financière")).toBeVisible({ timeout: 15000 })
  })

  test("add chart → new slot appears in selector", async ({ page }) => {
    await setupAuth(page)
    let slots = [defaultIncomeSlot()]
    await page.route(
      `**/api/companies/${COMPANY_ID}/statement-chart-configs*`,
      (route) => {
        const method = route.request().method()
        if (method === "GET") {
          return route.fulfill({
            status: 200, contentType: "application/json",
            body: JSON.stringify({ slots }),
          })
        }
        if (method === "POST") {
          const next = { ...defaultIncomeSlot(), chart_instance_id: "new-1", slot_index: 1 }
          slots = [...slots, next]
          return route.fulfill({
            status: 201, contentType: "application/json",
            body: JSON.stringify(next),
          })
        }
        return route.continue()
      },
    )

    await page.goto(`/financial-statements/income-statement?companyId=${COMPANY_ID}`)
    await page.getByRole("button", { name: /tableau de bord/i }).click()
    await page.getByRole("button", { name: /ajouter un graphique/i }).click()
    // Slot selector becomes visible once chart count > 1
    await expect(page.getByText(/graphique 2/i)).toBeVisible({ timeout: 10000 })
  })
})
```

- [ ] **Step 2: Run**

Run: `cd frontend && pnpm test:e2e dashboard-income-statement.spec.ts`
Expected: 2 PASSED.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/dashboard-income-statement.spec.ts
git commit -m "test(e2e): income-statement dashboard regression"
```

---

### Task 19: E2E for balance-sheet dashboard

**Files:**
- Create: `frontend/e2e/dashboard-balance-sheet.spec.ts`

- [ ] **Step 1: Write the spec**

Write `frontend/e2e/dashboard-balance-sheet.spec.ts`:

```ts
import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

async function setupAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([
    { name: "has_session", value: "1", url: "http://localhost:3000" },
  ])
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", email: "u@e.com", full_name: "Test", is_active: true, created_at: "2026-01-01T00:00:00Z" },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin" }],
      }),
    }),
  )
  await page.route("**/api/companies", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify([{ id: COMPANY_ID, name: "Test Co", divisions: [] }]),
    }),
  )
}

function defaultBalanceSheetSlot() {
  return {
    chart_instance_id: "default",
    slot_index: 0,
    version: 1,
    config: {
      version: 2,
      chartTitle: "Bilan",
      series: [
        { id: "a", kind: "bar", label: "Actifs", spec: { type: "single", code: "" },
          yAxis: "left", valueFormat: "currency", showOnChart: true, showInSidePanel: true, color: "#3b82f6" },
        { id: "l", kind: "bar", label: "Passifs", spec: { type: "single", code: "" },
          yAxis: "left", valueFormat: "currency", showOnChart: true, showInSidePanel: true, color: "#10b981" },
        { id: "e", kind: "bar", label: "Capitaux propres", spec: { type: "single", code: "" },
          yAxis: "left", valueFormat: "currency", showOnChart: true, showInSidePanel: true, color: "#f59e0b" },
      ],
    },
    updated_by_user_email: "u@e.com",
    updated_at: "2026-05-18T00:00:00Z",
  }
}

test.describe("Balance sheet dashboard", () => {
  test("renders default chart and supports adding a slot", async ({ page }) => {
    await setupAuth(page)
    let slots = [defaultBalanceSheetSlot()]
    await page.route(
      `**/api/companies/${COMPANY_ID}/statement-chart-configs*`,
      (route) => {
        const method = route.request().method()
        if (method === "GET") {
          return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ slots }) })
        }
        if (method === "POST") {
          const next = { ...defaultBalanceSheetSlot(), chart_instance_id: "bs-extra", slot_index: 1 }
          slots = [...slots, next]
          return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(next) })
        }
        return route.continue()
      },
    )

    await page.goto(`/financial-statements/balance-sheet?companyId=${COMPANY_ID}`)
    await page.getByRole("button", { name: /tableau de bord/i }).click()
    await expect(page.getByText("Bilan").first()).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: /ajouter un graphique/i }).click()
    await expect(page.getByText(/graphique 2/i)).toBeVisible({ timeout: 10000 })
  })
})
```

- [ ] **Step 2: Run**

Run: `cd frontend && pnpm test:e2e dashboard-balance-sheet.spec.ts`
Expected: 1 PASSED.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/dashboard-balance-sheet.spec.ts
git commit -m "test(e2e): balance-sheet dashboard multi-slot flow"
```

---

### Task 20: E2E for cash-flow dashboard (new section)

**Files:**
- Create: `frontend/e2e/dashboard-cash-flow.spec.ts`

- [ ] **Step 1: Write the spec**

Write `frontend/e2e/dashboard-cash-flow.spec.ts`:

```ts
import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

async function setupAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([
    { name: "has_session", value: "1", url: "http://localhost:3000" },
  ])
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", email: "u@e.com", full_name: "Test", is_active: true, created_at: "2026-01-01T00:00:00Z" },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin" }],
      }),
    }),
  )
  await page.route("**/api/companies", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify([{ id: COMPANY_ID, name: "Test Co", divisions: [] }]),
    }),
  )
}

function defaultCashFlowSlot() {
  return {
    chart_instance_id: "default",
    slot_index: 0,
    version: 1,
    config: {
      version: 2,
      chartTitle: "Flux de trésorerie",
      series: [
        { id: "op", kind: "bar", label: "Exploitation", spec: { type: "single", code: "" },
          yAxis: "left", valueFormat: "currency", showOnChart: true, showInSidePanel: true, color: "#3b82f6", stackGroup: "cf" },
        { id: "inv", kind: "bar", label: "Investissement", spec: { type: "single", code: "" },
          yAxis: "left", valueFormat: "currency", showOnChart: true, showInSidePanel: true, color: "#8b5cf6", stackGroup: "cf" },
        { id: "fin", kind: "bar", label: "Financement", spec: { type: "single", code: "" },
          yAxis: "left", valueFormat: "currency", showOnChart: true, showInSidePanel: true, color: "#ec4899", stackGroup: "cf" },
        { id: "net", kind: "line", label: "Flux net", spec: { type: "single", code: "" },
          yAxis: "left", valueFormat: "currency", showOnChart: true, showInSidePanel: true, color: "#10b981" },
      ],
    },
    updated_by_user_email: "u@e.com",
    updated_at: "2026-05-18T00:00:00Z",
  }
}

test.describe("Cash flow dashboard", () => {
  test("section toggle has 3 buttons; dashboard mode renders default chart", async ({ page }) => {
    await setupAuth(page)
    await page.route(
      `**/api/companies/${COMPANY_ID}/statement-chart-configs*`,
      (route) => route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ slots: [defaultCashFlowSlot()] }),
      }),
    )

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)
    await expect(page.getByRole("button", { name: /tableau de bord/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("button", { name: /^sommaire$/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /^détail$/i })).toBeVisible()
    await expect(page.getByText("Flux de trésorerie")).toBeVisible()
  })

  test("Top-3 variations band visible only in Sommaire/Détail", async ({ page }) => {
    await setupAuth(page)
    await page.route(
      `**/api/companies/${COMPANY_ID}/statement-chart-configs*`,
      (route) => route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ slots: [defaultCashFlowSlot()] }),
      }),
    )

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)

    // Dashboard mode: no Top-3 band heading.
    await expect(page.getByText(/compréhension des flux de trésorerie/i)).not.toBeVisible()

    // Switch to Sommaire — Top-3 band appears.
    await page.getByRole("button", { name: /^sommaire$/i }).click()
    await expect(page.getByText(/compréhension des flux de trésorerie/i)).toBeVisible({ timeout: 10000 })
  })
})
```

- [ ] **Step 2: Run**

Run: `cd frontend && pnpm test:e2e dashboard-cash-flow.spec.ts`
Expected: 2 PASSED.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/dashboard-cash-flow.spec.ts
git commit -m "test(e2e): cash-flow dashboard section and Top-3 placement"
```

---

### Task 21: E2E for stale-version conflict flow

**Files:**
- Create: `frontend/e2e/dashboard-stale-config.spec.ts`

- [ ] **Step 1: Write the spec**

Write `frontend/e2e/dashboard-stale-config.spec.ts`:

```ts
import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

async function setupAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([
    { name: "has_session", value: "1", url: "http://localhost:3000" },
  ])
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", email: "u@e.com", full_name: "Test", is_active: true, created_at: "2026-01-01T00:00:00Z" },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin" }],
      }),
    }),
  )
  await page.route("**/api/companies", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify([{ id: COMPANY_ID, name: "Test Co", divisions: [] }]),
    }),
  )
  await page.route("**/api/companies/*/statement-structure*", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ structure: { rows: [] } }),
    }),
  )
}

test.describe("Stale chart-config flow", () => {
  test("409 on save shows banner with Recharger + Écraser quand même", async ({ page }) => {
    await setupAuth(page)
    const initial = {
      chart_instance_id: "default",
      slot_index: 0,
      version: 1,
      config: {
        version: 2,
        chartTitle: "Performance financière",
        series: [
          { id: "r", kind: "bar", label: "Revenus", spec: { type: "single", code: "" },
            yAxis: "left", valueFormat: "currency", showOnChart: true, showInSidePanel: true, color: "#3b82f6" },
        ],
      },
      updated_by_user_email: "u@e.com",
      updated_at: "2026-05-18T00:00:00Z",
    }

    await page.route(
      `**/api/companies/${COMPANY_ID}/statement-chart-configs*`,
      (route) => {
        const method = route.request().method()
        if (method === "GET") {
          return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ slots: [initial] }) })
        }
        if (method === "PUT") {
          return route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              detail: {
                detail: "stale_version",
                current_version: 5,
                current_config: { ...initial.config, chartTitle: "Edited elsewhere" },
                updated_by_user_email: "other@example.com",
                updated_at: "2026-05-18T01:00:00Z",
              },
            }),
          })
        }
        return route.continue()
      },
    )

    await page.goto(`/financial-statements/income-statement?companyId=${COMPANY_ID}`)
    await page.getByRole("button", { name: /tableau de bord/i }).click()

    // Open settings dialog (the gear button — adjust selector if needed).
    await page.getByRole("button", { name: /paramètres du graphique/i }).click({ timeout: 15000 }).catch(async () => {
      // Fallback: target the icon button by aria-label that lives on the chart card.
      await page.locator('[aria-label*="paramètre" i]').first().click()
    })

    // Trigger save (the Enregistrer button inside the dialog).
    await page.getByRole("button", { name: /enregistrer/i }).click()

    await expect(page.getByText(/quelqu'un d'autre a modifié ce graphique/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("button", { name: /recharger/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /écraser quand même/i })).toBeVisible()
  })
})
```

- [ ] **Step 2: Run**

Run: `cd frontend && pnpm test:e2e dashboard-stale-config.spec.ts`
Expected: 1 PASSED.

If the dialog open button selector doesn't match (the existing `IncomeStatementChart` may use a different aria-label), inspect the rendered settings button in `frontend/components/statement-chart.tsx` for its exact `aria-label` or `name` text and update the test selector accordingly. Then re-run.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/dashboard-stale-config.spec.ts
git commit -m "test(e2e): stale chart-config 409 flow"
```

---

## Final verification

- [ ] **Step 1: Run the full backend test suite**

Run: `cd backend && python -m pytest`
Expected: all green, with 25+ new tests for chart configs.

- [ ] **Step 2: Run the full frontend build**

Run: `cd frontend && pnpm build`
Expected: clean build.

- [ ] **Step 3: Run the full e2e suite**

Run: `cd frontend && pnpm test:e2e`
Expected: existing e2e specs continue to pass; 4 new dashboard specs pass.

- [ ] **Step 4: Manual smoke test of all three statement pages**

Open in browser:
1. `/financial-statements/income-statement` — Tableau de bord renders the default Performance financière chart. Add/remove slot works. Open settings, change title, save.
2. `/financial-statements/balance-sheet` — same flow on Bilan default.
3. `/financial-statements/cash-flow` — 3-button section toggle (Tableau de bord / Sommaire / Détail). Dashboard mode shows the stacked Op/Inv/Fin chart. Sommaire shows the inline chart + Top-3 band above the table.

If anything looks wrong, fix it before moving on. Note: with empty link codes, the charts render flat zero bars — that's expected behavior until a user sets link codes via settings.
