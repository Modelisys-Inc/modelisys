import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.forecast_config import EbitdaMultipleNote, ForecastConfig
from app.models.user import User, UserOrganization
from app.schemas.forecast_config import (
    EbitdaMultipleNoteListResponse,
    EbitdaMultipleNoteUpsert,
    ForecastConfigListResponse,
    ForecastConfigResponse,
    ForecastConfigUpsert,
)

router = APIRouter(prefix="/api/companies/{company_id}", tags=["forecast-configs"])


def _verify_company_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    memberships = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    org_ids = {m.organization_id for m in memberships}

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or company.organization_id not in org_ids:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


# --- Forecast Configs ---

@router.get("/forecast-configs", response_model=ForecastConfigListResponse)
def list_forecast_configs(
    company_id: uuid.UUID,
    config_type: str | None = Query(default=None),
    division_id: uuid.UUID | None = Query(default=None),
    sub_division_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    query = db.query(ForecastConfig).filter(
        ForecastConfig.organization_id == company.organization_id,
        ForecastConfig.company_id == company_id,
    )
    if config_type:
        query = query.filter(ForecastConfig.config_type == config_type)
    if division_id:
        query = query.filter(ForecastConfig.division_id == division_id)
    if sub_division_id:
        query = query.filter(ForecastConfig.sub_division_id == sub_division_id)
    configs = query.order_by(ForecastConfig.config_type).all()
    return ForecastConfigListResponse(configs=configs)


@router.put("/forecast-configs", response_model=ForecastConfigResponse)
def upsert_forecast_config(
    company_id: uuid.UUID,
    request: ForecastConfigUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upsert a forecast config. Matches on config_type + company + division + sub_division."""
    company = _verify_company_access(db, current_user, company_id)

    existing = (
        db.query(ForecastConfig)
        .filter(
            ForecastConfig.organization_id == company.organization_id,
            ForecastConfig.company_id == company_id,
            ForecastConfig.config_type == request.config_type,
            ForecastConfig.division_id == request.division_id,
            ForecastConfig.sub_division_id == request.sub_division_id,
        )
        .first()
    )

    if existing:
        existing.data = request.data
        db.commit()
        db.refresh(existing)
        return existing
    else:
        config = ForecastConfig(
            organization_id=company.organization_id,
            company_id=company_id,
            division_id=request.division_id,
            sub_division_id=request.sub_division_id,
            config_type=request.config_type,
            data=request.data,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        return config


@router.delete("/forecast-configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_forecast_config(
    company_id: uuid.UUID,
    config_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    config = (
        db.query(ForecastConfig)
        .filter(
            ForecastConfig.id == config_id,
            ForecastConfig.organization_id == company.organization_id,
            ForecastConfig.company_id == company_id,
        )
        .first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="Forecast config not found")
    db.delete(config)
    db.commit()


# --- EBITDA Multiple Notes ---

@router.get("/ebitda-notes", response_model=EbitdaMultipleNoteListResponse)
def list_ebitda_notes(
    company_id: uuid.UUID,
    note_type: str | None = Query(default=None),
    division_id: uuid.UUID | None = Query(default=None),
    sub_division_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    query = db.query(EbitdaMultipleNote).filter(
        EbitdaMultipleNote.organization_id == company.organization_id,
        EbitdaMultipleNote.company_id == company_id,
    )
    if note_type:
        query = query.filter(EbitdaMultipleNote.note_type == note_type)
    if division_id:
        query = query.filter(EbitdaMultipleNote.division_id == division_id)
    if sub_division_id:
        query = query.filter(EbitdaMultipleNote.sub_division_id == sub_division_id)
    notes = query.order_by(EbitdaMultipleNote.note_type).all()
    return EbitdaMultipleNoteListResponse(notes=notes)


@router.put("/ebitda-notes", response_model=EbitdaMultipleNoteListResponse)
def upsert_ebitda_note(
    company_id: uuid.UUID,
    request: EbitdaMultipleNoteUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upsert an EBITDA multiple note. Matches on note_type + company + division + sub_division."""
    company = _verify_company_access(db, current_user, company_id)

    existing = (
        db.query(EbitdaMultipleNote)
        .filter(
            EbitdaMultipleNote.organization_id == company.organization_id,
            EbitdaMultipleNote.company_id == company_id,
            EbitdaMultipleNote.note_type == request.note_type,
            EbitdaMultipleNote.division_id == request.division_id,
            EbitdaMultipleNote.sub_division_id == request.sub_division_id,
        )
        .first()
    )

    if existing:
        existing.data = request.data
    else:
        db.add(EbitdaMultipleNote(
            organization_id=company.organization_id,
            company_id=company_id,
            division_id=request.division_id,
            sub_division_id=request.sub_division_id,
            note_type=request.note_type,
            data=request.data,
        ))

    db.commit()

    notes = (
        db.query(EbitdaMultipleNote)
        .filter(
            EbitdaMultipleNote.organization_id == company.organization_id,
            EbitdaMultipleNote.company_id == company_id,
        )
        .order_by(EbitdaMultipleNote.note_type)
        .all()
    )
    return EbitdaMultipleNoteListResponse(notes=notes)
