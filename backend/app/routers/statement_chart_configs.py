import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, verify_company_access
from app.models.statement_chart_config import StatementChartConfig
from app.models.user import User
from app.schemas.statement_chart_config import (
    ChartConfigPayload,
    ChartSlotConflictResponse,
    ChartSlotListResponse,
    ChartSlotResponse,
    ChartSlotUpdateRequest,
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
