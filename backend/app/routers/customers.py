import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.customer import Customer
from app.models.user import User, UserOrganization
from app.schemas.customer import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
)

router = APIRouter(prefix="/api/companies/{company_id}/customers", tags=["customers"])


def _verify_company_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    memberships = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    org_ids = {m.organization_id for m in memberships}

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or company.organization_id not in org_ids:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("", response_model=CustomerListResponse)
def list_customers(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    customers = (
        db.query(Customer)
        .filter(Customer.company_id == company.id)
        .order_by(Customer.sort_order, Customer.name)
        .all()
    )
    return CustomerListResponse(customers=customers)


@router.post("", response_model=CustomerResponse, status_code=201)
def create_customer(
    company_id: uuid.UUID,
    data: CustomerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    customer = Customer(
        organization_id=company.organization_id,
        company_id=company.id,
        name=data.name,
        sort_order=data.sort_order,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("", response_model=CustomerListResponse)
def bulk_upsert_customers(
    company_id: uuid.UUID,
    customers: list[CustomerCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Replace all customers for this company."""
    company = _verify_company_access(db, current_user, company_id)
    db.query(Customer).filter(Customer.company_id == company.id).delete()
    new_customers = []
    for c in customers:
        customer = Customer(
            organization_id=company.organization_id,
            company_id=company.id,
            name=c.name,
            sort_order=c.sort_order,
        )
        db.add(customer)
        new_customers.append(customer)
    db.commit()
    for c in new_customers:
        db.refresh(c)
    return CustomerListResponse(customers=new_customers)


@router.delete("/{customer_id}", status_code=204)
def delete_customer(
    company_id: uuid.UUID,
    customer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _verify_company_access(db, current_user, company_id)
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.company_id == company.id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
