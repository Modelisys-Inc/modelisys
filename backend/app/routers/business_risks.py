import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.business_risk import BusinessRisk
from app.models.company import Company
from app.models.user import User, UserOrganization
from app.schemas.business_risk import (
    BusinessRiskCreate,
    BusinessRiskListResponse,
    BusinessRiskResponse,
    BusinessRiskUpdate,
)

router = APIRouter(prefix="/api/companies/{company_id}/business-risks", tags=["business-risks"])


def _verify_company_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    memberships = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    org_ids = {m.organization_id for m in memberships}

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or company.organization_id not in org_ids:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("", response_model=BusinessRiskListResponse)
def list_business_risks(
    company_id: uuid.UUID,
    category: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    query = db.query(BusinessRisk).filter(
        BusinessRisk.organization_id == company.organization_id,
        BusinessRisk.company_id == company_id,
    )
    if category:
        query = query.filter(BusinessRisk.category == category)
    risks = query.order_by(BusinessRisk.category, BusinessRisk.name).all()
    return BusinessRiskListResponse(risks=risks)


@router.post("", response_model=BusinessRiskResponse, status_code=status.HTTP_201_CREATED)
def create_business_risk(
    company_id: uuid.UUID,
    request: BusinessRiskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    risk = BusinessRisk(
        organization_id=company.organization_id,
        company_id=company_id,
        risk_id=request.risk_id,
        category=request.category,
        name=request.name,
        description=request.description,
        impact=request.impact,
        recommendation=request.recommendation,
        level=request.level,
        note=request.note,
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)
    return risk


@router.put("", response_model=BusinessRiskListResponse)
def bulk_upsert_business_risks(
    company_id: uuid.UUID,
    risks: list[BusinessRiskCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk upsert business risks. Matches on risk_id within the company."""
    company = _verify_company_access(db, current_user, company_id)

    existing = (
        db.query(BusinessRisk)
        .filter(
            BusinessRisk.organization_id == company.organization_id,
            BusinessRisk.company_id == company_id,
        )
        .all()
    )
    existing_map = {r.risk_id: r for r in existing}

    for risk_data in risks:
        existing_risk = existing_map.get(risk_data.risk_id)
        if existing_risk:
            existing_risk.category = risk_data.category
            existing_risk.name = risk_data.name
            existing_risk.description = risk_data.description
            existing_risk.impact = risk_data.impact
            existing_risk.recommendation = risk_data.recommendation
            existing_risk.level = risk_data.level
            existing_risk.note = risk_data.note
        else:
            db.add(BusinessRisk(
                organization_id=company.organization_id,
                company_id=company_id,
                risk_id=risk_data.risk_id,
                category=risk_data.category,
                name=risk_data.name,
                description=risk_data.description,
                impact=risk_data.impact,
                recommendation=risk_data.recommendation,
                level=risk_data.level,
                note=risk_data.note,
            ))

    db.commit()

    all_risks = (
        db.query(BusinessRisk)
        .filter(
            BusinessRisk.organization_id == company.organization_id,
            BusinessRisk.company_id == company_id,
        )
        .order_by(BusinessRisk.category, BusinessRisk.name)
        .all()
    )
    return BusinessRiskListResponse(risks=all_risks)


@router.patch("/{risk_id}", response_model=BusinessRiskResponse)
def update_business_risk(
    company_id: uuid.UUID,
    risk_id: uuid.UUID,
    request: BusinessRiskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    risk = (
        db.query(BusinessRisk)
        .filter(
            BusinessRisk.id == risk_id,
            BusinessRisk.organization_id == company.organization_id,
            BusinessRisk.company_id == company_id,
        )
        .first()
    )
    if not risk:
        raise HTTPException(status_code=404, detail="Business risk not found")

    if request.level is not None:
        risk.level = request.level
    if request.note is not None:
        risk.note = request.note
    if request.description is not None:
        risk.description = request.description
    if request.impact is not None:
        risk.impact = request.impact
    if request.recommendation is not None:
        risk.recommendation = request.recommendation

    db.commit()
    db.refresh(risk)
    return risk


@router.delete("/{risk_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_business_risk(
    company_id: uuid.UUID,
    risk_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    risk = (
        db.query(BusinessRisk)
        .filter(
            BusinessRisk.id == risk_id,
            BusinessRisk.organization_id == company.organization_id,
            BusinessRisk.company_id == company_id,
        )
        .first()
    )
    if not risk:
        raise HTTPException(status_code=404, detail="Business risk not found")
    db.delete(risk)
    db.commit()
