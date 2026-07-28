import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import (
    get_current_user,
    get_membership,
    require_org_admin,
    verify_company_access,
)
from app.models.coa_version import CoaVersion
from app.models.company import Company, Division, SubDivision
from app.models.financial_statement_mapping import CompanyStatementStructure
from app.models.note import Note
from app.models.trial_balance import TrialBalanceEntry
import copy

from app.models.user import User, UserCompanyAccess, UserOrganization, UserRole
from app.services.statement_structure_defaults import DEFAULT_STRUCTURES
from app.schemas.company import (
    CompanyCreate,
    CompanyListResponse,
    CompanyPortalSummaryResponse,
    CompanyResponse,
    CompanyUpdate,
    DivisionCreate,
    DivisionResponse,
    NoteLastActivity,
    SubDivisionCreate,
    SubDivisionResponse,
    TrialBalanceLastPeriod,
)

router = APIRouter(prefix="/api/companies", tags=["companies"])


def _get_user_org_id(user: User, db: Session, org_id: uuid.UUID | None = None) -> uuid.UUID:
    """Get the organization ID for the current user. If org_id is provided, verify membership."""
    memberships = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    if not memberships:
        raise HTTPException(status_code=403, detail="User has no organization memberships")

    if org_id:
        for m in memberships:
            if m.organization_id == org_id:
                return org_id
        raise HTTPException(status_code=403, detail="User is not a member of this organization")

    # Default to first org
    return memberships[0].organization_id


def _get_company_or_404(db: Session, company_id: uuid.UUID, org_id: uuid.UUID) -> Company:
    company = (
        db.query(Company)
        .options(joinedload(Company.divisions).joinedload(Division.sub_divisions))
        .filter(Company.id == company_id, Company.organization_id == org_id)
        .first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("", response_model=CompanyListResponse)
def list_companies(
    org_id: uuid.UUID | None = None,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    organization_id = _get_user_org_id(current_user, db, org_id)
    base_query = db.query(Company).filter(Company.organization_id == organization_id)

    # Role-aware scoping: superadmin / org-admin / all_companies see every company
    # in the org; members & viewers see only the companies granted to them.
    if not current_user.is_superadmin:
        membership = get_membership(db, current_user, organization_id)
        is_org_admin = membership is not None and membership.role == UserRole.ADMIN
        has_all = membership is not None and membership.all_companies
        if not (is_org_admin or has_all):
            granted = db.query(UserCompanyAccess.company_id).filter(
                UserCompanyAccess.user_id == current_user.id
            )
            base_query = base_query.filter(Company.id.in_(granted))

    total = base_query.count()
    companies = (
        base_query
        .options(joinedload(Company.divisions).joinedload(Division.sub_divisions))
        .order_by(Company.created_at)
        .offset(offset)
        .limit(limit)
        .all()
    )
    # Deduplicate due to joinedload
    seen = set()
    unique = []
    for c in companies:
        if c.id not in seen:
            seen.add(c.id)
            unique.append(c)
    return CompanyListResponse(
        companies=unique,
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(unique) < total,
    )


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    request: CompanyCreate,
    org_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    organization_id = _get_user_org_id(current_user, db, org_id)
    require_org_admin(db, current_user, organization_id)

    # Stamp the company with the current global chart-of-accounts version, so the
    # cohort its statement-structure snapshot was seeded from is traceable.
    current_coa_version = db.query(func.max(CoaVersion.version)).scalar()

    company = Company(
        organization_id=organization_id,
        name=request.name,
        fiscal_year_end=request.fiscal_year_end,
        currency=request.currency,
        is_cumulative_tb=request.is_cumulative_tb,
        coa_version=current_coa_version,
    )
    db.add(company)
    db.flush()

    # Seed canonical default structures (same in Paramètres and computed views).
    for stmt_type, structure in DEFAULT_STRUCTURES.items():
        db.add(CompanyStatementStructure(
            company_id=company.id,
            statement_type=stmt_type,
            structure=copy.deepcopy(structure),
        ))

    for div_data in request.divisions:
        division = Division(company_id=company.id, name=div_data.name)
        db.add(division)
        db.flush()
        for sub_data in div_data.sub_divisions:
            sub = SubDivision(division_id=division.id, name=sub_data.name)
            db.add(sub)

    db.commit()
    db.refresh(company)
    return _get_company_or_404(db, company.id, organization_id)


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = verify_company_access(db, current_user, company_id)
    return _get_company_or_404(db, company_id, company.organization_id)


@router.get("/{company_id}/portal-summary", response_model=CompanyPortalSummaryResponse)
def get_company_portal_summary(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Données agrégées pour le panneau « Mes sociétés » (BV, notes, fiche société)."""
    company = verify_company_access(db, current_user, company_id)
    company = _get_company_or_404(db, company_id, company.organization_id)

    tb_row = (
        db.query(TrialBalanceEntry)
        .filter(TrialBalanceEntry.company_id == company_id)
        .order_by(desc(TrialBalanceEntry.fiscal_year), desc(TrialBalanceEntry.month))
        .first()
    )
    tb_last: TrialBalanceLastPeriod | None = None
    if tb_row is not None:
        tb_last = TrialBalanceLastPeriod(fiscal_year=tb_row.fiscal_year, month=tb_row.month)

    note_row = (
        db.query(Note)
        .options(joinedload(Note.created_by_user))
        .filter(Note.company_id == company_id)
        .order_by(desc(Note.updated_at))
        .first()
    )
    note_last: NoteLastActivity | None = None
    if note_row is not None:
        author = ""
        if note_row.created_by_user is not None:
            author = note_row.created_by_user.full_name or ""
        note_last = NoteLastActivity(
            updated_at=note_row.updated_at,
            created_by_name=author,
            row_label=note_row.row_label,
            page=note_row.page,
        )

    return CompanyPortalSummaryResponse(
        fiscal_year_end=company.fiscal_year_end,
        currency=company.currency,
        company_updated_at=company.updated_at,
        trial_balance_last_period=tb_last,
        note_last_activity=note_last,
    )


@router.patch("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: uuid.UUID,
    request: CompanyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = verify_company_access(db, current_user, company_id)
    require_org_admin(db, current_user, company.organization_id)
    org_id = company.organization_id
    company = _get_company_or_404(db, company_id, org_id)

    if request.name is not None:
        company.name = request.name
    if request.fiscal_year_end is not None:
        company.fiscal_year_end = request.fiscal_year_end
    if request.currency is not None:
        company.currency = request.currency
    if request.is_cumulative_tb is not None:
        company.is_cumulative_tb = request.is_cumulative_tb

    db.commit()
    return _get_company_or_404(db, company_id, org_id)


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = verify_company_access(db, current_user, company_id)
    require_org_admin(db, current_user, company.organization_id)
    company = _get_company_or_404(db, company_id, company.organization_id)
    db.delete(company)
    db.commit()


# --- Division endpoints ---

@router.post("/{company_id}/divisions", response_model=DivisionResponse, status_code=status.HTTP_201_CREATED)
def create_division(
    company_id: uuid.UUID,
    request: DivisionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_user_org_id(current_user, db)
    require_org_admin(db, current_user, org_id)
    _get_company_or_404(db, company_id, org_id)

    division = Division(company_id=company_id, name=request.name)
    db.add(division)
    db.flush()

    for sub_data in request.sub_divisions:
        sub = SubDivision(division_id=division.id, name=sub_data.name)
        db.add(sub)

    db.commit()
    db.refresh(division)
    return division


@router.patch("/divisions/{division_id}", response_model=DivisionResponse)
def update_division(
    division_id: uuid.UUID,
    request: DivisionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_user_org_id(current_user, db)
    division = db.query(Division).filter(Division.id == division_id).first()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    _get_company_or_404(db, division.company_id, org_id)
    require_org_admin(db, current_user, org_id)

    division.name = request.name
    db.commit()
    db.refresh(division)
    return division


@router.delete("/divisions/{division_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_division(
    division_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_user_org_id(current_user, db)
    division = db.query(Division).filter(Division.id == division_id).first()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    _get_company_or_404(db, division.company_id, org_id)
    require_org_admin(db, current_user, org_id)

    db.delete(division)
    db.commit()


# --- Sub-Division endpoints ---

@router.post("/divisions/{division_id}/sub-divisions", response_model=SubDivisionResponse, status_code=status.HTTP_201_CREATED)
def create_sub_division(
    division_id: uuid.UUID,
    request: SubDivisionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_user_org_id(current_user, db)
    division = db.query(Division).filter(Division.id == division_id).first()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    _get_company_or_404(db, division.company_id, org_id)
    require_org_admin(db, current_user, org_id)

    sub = SubDivision(division_id=division_id, name=request.name)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.patch("/sub-divisions/{sub_division_id}", response_model=SubDivisionResponse)
def update_sub_division(
    sub_division_id: uuid.UUID,
    request: SubDivisionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_user_org_id(current_user, db)
    sub = db.query(SubDivision).filter(SubDivision.id == sub_division_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-division not found")
    division = db.query(Division).filter(Division.id == sub.division_id).first()
    _get_company_or_404(db, division.company_id, org_id)
    require_org_admin(db, current_user, org_id)

    sub.name = request.name
    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/sub-divisions/{sub_division_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sub_division(
    sub_division_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_user_org_id(current_user, db)
    sub = db.query(SubDivision).filter(SubDivision.id == sub_division_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-division not found")
    division = db.query(Division).filter(Division.id == sub.division_id).first()
    _get_company_or_404(db, division.company_id, org_id)
    require_org_admin(db, current_user, org_id)

    db.delete(sub)
    db.commit()
