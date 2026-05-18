import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.exc import IntegrityError
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
    try:
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError:
        # Concurrent GET inserted the default slot first; fetch the winning row.
        db.rollback()
        existing = (
            db.query(StatementChartConfig)
            .filter(
                StatementChartConfig.company_id == company_id,
                StatementChartConfig.statement_type == statement_type,
                StatementChartConfig.chart_instance_id == "default",
            )
            .one()
        )
        return existing


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
