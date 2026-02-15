import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.note import Note
from app.models.user import User, UserOrganization
from app.schemas.note import (
    NoteCreate,
    NoteListResponse,
    NoteResponse,
    NoteUpdate,
)

router = APIRouter(prefix="/api/companies/{company_id}/notes", tags=["notes"])


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
    total = query.count()
    notes = query.order_by(Note.created_at.desc()).offset(offset).limit(limit).all()
    return NoteListResponse(
        notes=notes,
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
        created_by_id=current_user.id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


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

    db.commit()
    db.refresh(note)
    return note


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
