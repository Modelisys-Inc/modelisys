import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, verify_company_access
from app.models.company import Company
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.supplier import (
    SupplierCreate,
    SupplierListResponse,
    SupplierResponse,
)

router = APIRouter(prefix="/api/companies/{company_id}/suppliers", tags=["suppliers"])


@router.get("", response_model=SupplierListResponse)
def list_suppliers(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = verify_company_access(db, current_user, company_id)
    suppliers = (
        db.query(Supplier)
        .filter(Supplier.company_id == company.id)
        .order_by(Supplier.sort_order, Supplier.name)
        .all()
    )
    return SupplierListResponse(suppliers=suppliers)


@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(
    company_id: uuid.UUID,
    data: SupplierCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = verify_company_access(db, current_user, company_id)
    supplier = Supplier(
        organization_id=company.organization_id,
        company_id=company.id,
        name=data.name,
        sort_order=data.sort_order,
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.put("", response_model=SupplierListResponse)
def bulk_upsert_suppliers(
    company_id: uuid.UUID,
    suppliers: list[SupplierCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Replace all suppliers for this company."""
    company = verify_company_access(db, current_user, company_id)
    db.query(Supplier).filter(Supplier.company_id == company.id).delete()
    new_suppliers = []
    for s in suppliers:
        supplier = Supplier(
            organization_id=company.organization_id,
            company_id=company.id,
            name=s.name,
            sort_order=s.sort_order,
        )
        db.add(supplier)
        new_suppliers.append(supplier)
    db.commit()
    for s in new_suppliers:
        db.refresh(s)
    return SupplierListResponse(suppliers=new_suppliers)


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(
    company_id: uuid.UUID,
    supplier_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = verify_company_access(db, current_user, company_id)
    supplier = (
        db.query(Supplier)
        .filter(Supplier.id == supplier_id, Supplier.company_id == company.id)
        .first()
    )
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.delete(supplier)
    db.commit()
