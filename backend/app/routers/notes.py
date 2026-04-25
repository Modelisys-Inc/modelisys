import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.note import Note
from app.models.user import User, UserOrganization
from app.schemas.note import (
    NoteAttachmentResponse,
    NoteCreate,
    NoteListResponse,
    NoteResponse,
    NoteUpdate,
)
from app.utils.fiscal_year import fiscal_year_label

router = APIRouter(prefix="/api/companies/{company_id}/notes", tags=["notes"])


def _note_to_response(db: Session, note: Note) -> NoteResponse:
    """Construit la réponse API avec le nom du créateur (relation ou requête)."""
    created_by_name = "—"
    if getattr(note, "created_by_user", None) is not None:
        created_by_name = note.created_by_user.full_name
    else:
        u = db.get(User, note.created_by_id)
        if u is not None:
            created_by_name = u.full_name
    attachments_raw = note.attachments or []
    attachments: list[NoteAttachmentResponse] = []
    for item in attachments_raw:
        if isinstance(item, dict):
            attachments.append(NoteAttachmentResponse(**item))
        else:
            attachments.append(NoteAttachmentResponse.model_validate(item))
    return NoteResponse(
        id=note.id,
        company_id=note.company_id,
        division_id=note.division_id,
        sub_division_id=note.sub_division_id,
        row_id=note.row_id,
        row_label=note.row_label,
        page=note.page,
        period=note.period,
        view=note.view,
        current_amount=note.current_amount,
        prior_amount=note.prior_amount,
        variation_percent=note.variation_percent,
        variation_amount=note.variation_amount,
        content=note.content,
        attachments=attachments,
        reference_month=note.reference_month,
        reference_year=note.reference_year,
        fiscal_year=note.fiscal_year,
        created_by_id=note.created_by_id,
        created_by_name=created_by_name,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


def _verify_company_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    memberships = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    org_ids = {m.organization_id for m in memberships}

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or company.organization_id not in org_ids:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("", response_model=NoteListResponse)
def list_notes(
    company_id: uuid.UUID,
    page: str | None = Query(default=None),
    row_id: str | None = Query(default=None),
    period: str | None = Query(default=None),
    view: str | None = Query(default=None),
    fiscal_year: int | None = Query(default=None),
    reference_month: int | None = Query(default=None, ge=1, le=12),
    reference_year: int | None = Query(default=None, ge=1990, le=2100),
    created_by_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    query = db.query(Note).filter(
        Note.organization_id == company.organization_id,
        Note.company_id == company_id,
    )
    if page:
        query = query.filter(Note.page == page)
    if row_id:
        query = query.filter(Note.row_id == row_id)
    if period:
        query = query.filter(Note.period == period)
    if view:
        query = query.filter(Note.view == view)
    if fiscal_year is not None:
        query = query.filter(Note.fiscal_year == fiscal_year)
    if reference_month is not None:
        query = query.filter(Note.reference_month == reference_month)
    if reference_year is not None:
        query = query.filter(Note.reference_year == reference_year)
    if created_by_id is not None:
        query = query.filter(Note.created_by_id == created_by_id)
    total = query.count()
    notes = (
        query.options(joinedload(Note.created_by_user))
        .order_by(Note.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return NoteListResponse(
        notes=[_note_to_response(db, n) for n in notes],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(notes) < total,
    )


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    company_id: uuid.UUID,
    request: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    ref_m, ref_y, fy_val = request.reference_month, request.reference_year, None
    if ref_m is not None and ref_y is not None:
        fy_val = fiscal_year_label(ref_m, ref_y, company.fiscal_year_end)
    note = Note(
        organization_id=company.organization_id,
        company_id=company_id,
        division_id=request.division_id,
        sub_division_id=request.sub_division_id,
        row_id=request.row_id,
        row_label=request.row_label,
        page=request.page,
        period=request.period,
        view=request.view,
        current_amount=request.current_amount,
        prior_amount=request.prior_amount,
        variation_percent=request.variation_percent,
        variation_amount=request.variation_amount,
        content=request.content,
        attachments=[a.model_dump() for a in request.attachments],
        reference_month=ref_m,
        reference_year=ref_y,
        fiscal_year=fy_val,
        created_by_id=current_user.id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    note = (
        db.query(Note)
        .options(joinedload(Note.created_by_user))
        .filter(Note.id == note.id)
        .first()
    )
    assert note is not None
    return _note_to_response(db, note)


@router.patch("/{note_id}", response_model=NoteResponse)
def update_note(
    company_id: uuid.UUID,
    note_id: uuid.UUID,
    request: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    note = (
        db.query(Note)
        .filter(
            Note.id == note_id,
            Note.organization_id == company.organization_id,
            Note.company_id == company_id,
        )
        .first()
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if request.content is not None:
        note.content = request.content
    if request.current_amount is not None:
        note.current_amount = request.current_amount
    if request.prior_amount is not None:
        note.prior_amount = request.prior_amount
    if request.variation_percent is not None:
        note.variation_percent = request.variation_percent
    if request.variation_amount is not None:
        note.variation_amount = request.variation_amount
    if request.attachments is not None:
        note.attachments = [a.model_dump() for a in request.attachments]
    if request.reference_month is not None and request.reference_year is not None:
        note.reference_month = request.reference_month
        note.reference_year = request.reference_year
        note.fiscal_year = fiscal_year_label(
            request.reference_month, request.reference_year, company.fiscal_year_end
        )

    db.commit()
    db.refresh(note)
    note = (
        db.query(Note)
        .options(joinedload(Note.created_by_user))
        .filter(Note.id == note.id)
        .first()
    )
    assert note is not None
    return _note_to_response(db, note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    company_id: uuid.UUID,
    note_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    note = (
        db.query(Note)
        .filter(
            Note.id == note_id,
            Note.organization_id == company.organization_id,
            Note.company_id == company_id,
        )
        .first()
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
