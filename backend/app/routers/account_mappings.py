import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.account_mapping import AccountMapping, Product
from app.models.company import Company
from app.models.user import User, UserOrganization
from app.schemas.account_mapping import (
    AccountMappingListResponse,
    AccountMappingResponse,
    AccountMappingUpsert,
    ProductCreate,
    ProductListResponse,
    ProductResponse,
)

router = APIRouter(prefix="/api/companies/{company_id}", tags=["account-mappings"])


def _verify_company_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    memberships = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    org_ids = {m.organization_id for m in memberships}

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or company.organization_id not in org_ids:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


# --- Account Mappings ---

@router.get("/account-mappings", response_model=AccountMappingListResponse)
def list_account_mappings(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_company_access(db, current_user, company_id)
    mappings = (
        db.query(AccountMapping)
        .filter(AccountMapping.company_id == company_id)
        .order_by(AccountMapping.account_number)
        .all()
    )
    return AccountMappingListResponse(mappings=mappings)


@router.put("/account-mappings", response_model=AccountMappingListResponse)
def upsert_account_mappings(
    company_id: uuid.UUID,
    entries: list[AccountMappingUpsert],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk upsert account mappings. Matches on account_number."""
    _verify_company_access(db, current_user, company_id)

    # Get existing mappings indexed by account_number
    existing = (
        db.query(AccountMapping)
        .filter(AccountMapping.company_id == company_id)
        .all()
    )
    existing_map = {m.account_number: m for m in existing}

    for entry in entries:
        mapping = existing_map.get(entry.account_number)
        interco_id = uuid.UUID(entry.interco_company_id) if entry.interco_company_id else None

        if mapping:
            mapping.description = entry.description
            mapping.link_code = entry.link_code
            mapping.summary_ef = entry.summary_ef
            mapping.detail_ef = entry.detail_ef
            mapping.divisions = entry.divisions
            mapping.sub_divisions = entry.sub_divisions
            mapping.fdrhc = entry.fdrhc
            mapping.interests = entry.interests
            mapping.amortization = entry.amortization
            mapping.variable_costs = entry.variable_costs
            mapping.fixed_costs = entry.fixed_costs
            mapping.product = entry.product
            mapping.customer = entry.customer
            mapping.supplier = entry.supplier
            mapping.interco_company_id = interco_id
        else:
            mapping = AccountMapping(
                company_id=company_id,
                account_number=entry.account_number,
                description=entry.description,
                link_code=entry.link_code,
                summary_ef=entry.summary_ef,
                detail_ef=entry.detail_ef,
                divisions=entry.divisions,
                sub_divisions=entry.sub_divisions,
                fdrhc=entry.fdrhc,
                interests=entry.interests,
                amortization=entry.amortization,
                variable_costs=entry.variable_costs,
                fixed_costs=entry.fixed_costs,
                product=entry.product,
                customer=entry.customer,
                supplier=entry.supplier,
                interco_company_id=interco_id,
            )
            db.add(mapping)

    db.commit()

    # Return updated list
    mappings = (
        db.query(AccountMapping)
        .filter(AccountMapping.company_id == company_id)
        .order_by(AccountMapping.account_number)
        .all()
    )
    return AccountMappingListResponse(mappings=mappings)


# --- Products ---

@router.get("/products", response_model=ProductListResponse)
def list_products(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_company_access(db, current_user, company_id)
    products = (
        db.query(Product)
        .filter(Product.company_id == company_id)
        .order_by(Product.sort_order, Product.name)
        .all()
    )
    return ProductListResponse(products=products)


@router.put("/products", response_model=ProductListResponse)
def upsert_products(
    company_id: uuid.UUID,
    names: list[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Replace all products for a company with the given list."""
    _verify_company_access(db, current_user, company_id)

    # Delete existing products
    db.query(Product).filter(Product.company_id == company_id).delete()

    # Create new products
    for i, name in enumerate(names):
        product = Product(company_id=company_id, name=name, sort_order=i)
        db.add(product)

    db.commit()

    products = (
        db.query(Product)
        .filter(Product.company_id == company_id)
        .order_by(Product.sort_order, Product.name)
        .all()
    )
    return ProductListResponse(products=products)


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    company_id: uuid.UUID,
    request: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_company_access(db, current_user, company_id)

    # Get max sort_order
    max_order = (
        db.query(Product.sort_order)
        .filter(Product.company_id == company_id)
        .order_by(Product.sort_order.desc())
        .first()
    )
    next_order = (max_order[0] or 0) + 1 if max_order else 0

    product = Product(company_id=company_id, name=request.name, sort_order=next_order)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product
