import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.financial_statement_mapping import CompanyStatementStructure
from app.models.user import User, UserOrganization
from app.schemas.statement_structure import (
    StatementStructureListResponse,
    StatementStructureResponse,
    StatementStructureUpsert,
)

router = APIRouter(prefix="/api/companies/{company_id}", tags=["statement-structures"])

VALID_STATEMENT_TYPES = {"income-statement", "balance-sheet", "capex", "baiia"}


def _verify_company_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    memberships = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    org_ids = {m.organization_id for m in memberships}

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or company.organization_id not in org_ids:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("/statement-structures", response_model=StatementStructureListResponse)
def list_statement_structures(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_company_access(db, current_user, company_id)
    structures = (
        db.query(CompanyStatementStructure)
        .filter(CompanyStatementStructure.company_id == company_id)
        .order_by(CompanyStatementStructure.statement_type)
        .all()
    )
    return StatementStructureListResponse(structures=structures)


@router.get("/statement-structures/{statement_type}", response_model=StatementStructureResponse)
def get_statement_structure(
    company_id: uuid.UUID,
    statement_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if statement_type not in VALID_STATEMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid statement type: {statement_type}")

    _verify_company_access(db, current_user, company_id)

    structure = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company_id,
            CompanyStatementStructure.statement_type == statement_type,
        )
        .first()
    )
    if not structure:
        raise HTTPException(status_code=404, detail="Statement structure not found")
    return structure


@router.put("/statement-structures/{statement_type}", response_model=StatementStructureResponse)
def upsert_statement_structure(
    company_id: uuid.UUID,
    statement_type: str,
    request: StatementStructureUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if statement_type not in VALID_STATEMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid statement type: {statement_type}")

    _verify_company_access(db, current_user, company_id)

    structure = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company_id,
            CompanyStatementStructure.statement_type == statement_type,
        )
        .first()
    )

    if structure:
        structure.structure = request.structure
    else:
        structure = CompanyStatementStructure(
            company_id=company_id,
            statement_type=statement_type,
            structure=request.structure,
        )
        db.add(structure)

    db.commit()
    db.refresh(structure)
    return structure
