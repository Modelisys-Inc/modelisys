import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.projection import Loan, Projection, ProjectionAdjustment
from app.models.user import User, UserOrganization
from app.schemas.projection import (
    LoanCreate,
    LoanResponse,
    ProjectionAdjustmentCreate,
    ProjectionAdjustmentResponse,
    ProjectionCreate,
    ProjectionComputeResult,
    ProjectionListResponse,
    ProjectionUpdate,
    ProjectionWithDetailsResponse,
)
from app.services.projection_compute import ProjectionComputeService

router = APIRouter(prefix="/api/companies/{company_id}/projections", tags=["projections"])


def _verify_company_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    memberships = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    org_ids = {m.organization_id for m in memberships}

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or company.organization_id not in org_ids:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


def _get_projection_or_404(
    db: Session, company: Company, projection_id: uuid.UUID,
) -> Projection:
    projection = (
        db.query(Projection)
        .filter(
            Projection.id == projection_id,
            Projection.organization_id == company.organization_id,
            Projection.company_id == company.id,
        )
        .first()
    )
    if not projection:
        raise HTTPException(status_code=404, detail="Projection not found")
    return projection


# --- Projections ---

@router.get("", response_model=ProjectionListResponse)
def list_projections(
    company_id: uuid.UUID,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    query = db.query(Projection).filter(
        Projection.organization_id == company.organization_id,
        Projection.company_id == company_id,
    )
    total = query.count()
    projections = query.order_by(Projection.created_at.desc()).offset(offset).limit(limit).all()
    return ProjectionListResponse(
        projections=projections,
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(projections) < total,
    )


@router.post("", response_model=ProjectionWithDetailsResponse, status_code=status.HTTP_201_CREATED)
def create_projection(
    company_id: uuid.UUID,
    request: ProjectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    projection = Projection(
        organization_id=company.organization_id,
        company_id=company_id,
        division_id=request.division_id,
        sub_division_id=request.sub_division_id,
        name=request.name,
        projection_years=request.projection_years,
        projection_mode=request.projection_mode,
        projection_horizon=request.projection_horizon,
        start_year=request.start_year,
        start_month=request.start_month,
        created_by_id=current_user.id,
    )
    db.add(projection)
    db.commit()
    db.refresh(projection)
    return projection


@router.get("/{projection_id}", response_model=ProjectionWithDetailsResponse)
def get_projection(
    company_id: uuid.UUID,
    projection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    return _get_projection_or_404(db, company, projection_id)


@router.patch("/{projection_id}", response_model=ProjectionWithDetailsResponse)
def update_projection(
    company_id: uuid.UUID,
    projection_id: uuid.UUID,
    request: ProjectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    projection = _get_projection_or_404(db, company, projection_id)

    if request.name is not None:
        projection.name = request.name
    if request.projection_years is not None:
        projection.projection_years = request.projection_years
    if request.projection_mode is not None:
        projection.projection_mode = request.projection_mode
    if request.projection_horizon is not None:
        projection.projection_horizon = request.projection_horizon
    if request.start_year is not None:
        projection.start_year = request.start_year
    if request.start_month is not None:
        projection.start_month = request.start_month

    db.commit()
    db.refresh(projection)
    return projection


@router.delete("/{projection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_projection(
    company_id: uuid.UUID,
    projection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    projection = _get_projection_or_404(db, company, projection_id)
    db.delete(projection)
    db.commit()


@router.get("/{projection_id}/compute", response_model=ProjectionComputeResult)
def compute_projection(
    company_id: uuid.UUID,
    projection_id: uuid.UUID,
    base_fiscal_year: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Compute projected summary metrics for all years of a projection."""
    company = _verify_company_access(db, current_user, company_id)
    projection = _get_projection_or_404(db, company, projection_id)

    if base_fiscal_year is None:
        base_fiscal_year = date.today().year - 1

    result = ProjectionComputeService.compute(db, company, projection, base_fiscal_year)
    return result


# --- Adjustments ---

@router.post(
    "/{projection_id}/adjustments",
    response_model=ProjectionAdjustmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_adjustment(
    company_id: uuid.UUID,
    projection_id: uuid.UUID,
    request: ProjectionAdjustmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    _get_projection_or_404(db, company, projection_id)

    adjustment = ProjectionAdjustment(
        projection_id=projection_id,
        module=request.module,
        row_id=request.row_id,
        year_index=request.year_index,
        type=request.type,
        value=request.value,
        is_recurring=request.is_recurring,
        note=request.note,
    )
    db.add(adjustment)
    db.commit()
    db.refresh(adjustment)
    return adjustment


@router.put(
    "/{projection_id}/adjustments",
    response_model=ProjectionWithDetailsResponse,
)
def bulk_upsert_adjustments(
    company_id: uuid.UUID,
    projection_id: uuid.UUID,
    adjustments: list[ProjectionAdjustmentCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Replace all adjustments for a projection."""
    company = _verify_company_access(db, current_user, company_id)
    projection = _get_projection_or_404(db, company, projection_id)

    # Delete existing adjustments
    db.query(ProjectionAdjustment).filter(
        ProjectionAdjustment.projection_id == projection_id,
    ).delete()

    for adj in adjustments:
        db.add(ProjectionAdjustment(
            projection_id=projection_id,
            module=adj.module,
            row_id=adj.row_id,
            year_index=adj.year_index,
            type=adj.type,
            value=adj.value,
            is_recurring=adj.is_recurring,
            note=adj.note,
        ))

    db.commit()
    db.refresh(projection)
    return projection


@router.delete(
    "/{projection_id}/adjustments/{adjustment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_adjustment(
    company_id: uuid.UUID,
    projection_id: uuid.UUID,
    adjustment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    _get_projection_or_404(db, company, projection_id)

    adjustment = (
        db.query(ProjectionAdjustment)
        .filter(
            ProjectionAdjustment.id == adjustment_id,
            ProjectionAdjustment.projection_id == projection_id,
        )
        .first()
    )
    if not adjustment:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    db.delete(adjustment)
    db.commit()


# --- Loans ---

@router.post(
    "/{projection_id}/loans",
    response_model=LoanResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_loan(
    company_id: uuid.UUID,
    projection_id: uuid.UUID,
    request: LoanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    _get_projection_or_404(db, company, projection_id)

    loan = Loan(
        projection_id=projection_id,
        name=request.name,
        principal=request.principal,
        interest_rate=request.interest_rate,
        remaining_payments=request.remaining_payments,
        payment_amount=request.payment_amount,
        start_month=request.start_month,
        notes=request.notes,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan


@router.put(
    "/{projection_id}/loans",
    response_model=ProjectionWithDetailsResponse,
)
def bulk_upsert_loans(
    company_id: uuid.UUID,
    projection_id: uuid.UUID,
    loans: list[LoanCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Replace all loans for a projection."""
    company = _verify_company_access(db, current_user, company_id)
    projection = _get_projection_or_404(db, company, projection_id)

    db.query(Loan).filter(Loan.projection_id == projection_id).delete()

    for loan_data in loans:
        db.add(Loan(
            projection_id=projection_id,
            name=loan_data.name,
            principal=loan_data.principal,
            interest_rate=loan_data.interest_rate,
            remaining_payments=loan_data.remaining_payments,
            payment_amount=loan_data.payment_amount,
            start_month=loan_data.start_month,
            notes=loan_data.notes,
        ))

    db.commit()
    db.refresh(projection)
    return projection


@router.delete(
    "/{projection_id}/loans/{loan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_loan(
    company_id: uuid.UUID,
    projection_id: uuid.UUID,
    loan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    _get_projection_or_404(db, company, projection_id)

    loan = (
        db.query(Loan)
        .filter(Loan.id == loan_id, Loan.projection_id == projection_id)
        .first()
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    db.delete(loan)
    db.commit()
