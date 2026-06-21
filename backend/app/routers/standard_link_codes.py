from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_superadmin
from app.models.standard_link_code import StandardLinkCode
from app.models.user import User
from app.schemas.standard_link_code import (
    StandardLinkCodeCreate,
    StandardLinkCodeFamilyGroup,
    StandardLinkCodeResponse,
    StandardLinkCodeUpdate,
)
from app.services import coa_admin

router = APIRouter(prefix="/api/standard-link-codes", tags=["standard-link-codes"])

# Family display order (Balance Sheet first, then Income Statement)
_FAMILY_ORDER = ["ACT", "ALT", "PCT", "PLT", "CAP", "REV", "CMV", "EXP", "ADM", "VNT", "FIN", "AUT", "IMP"]


@router.get("", response_model=list[StandardLinkCodeFamilyGroup])
def list_standard_link_codes(
    leaf_only: bool = False,
    db: Session = Depends(get_db),
):
    """Return all standard link codes grouped by family.

    Pass ?leaf_only=true to return only assignable (leaf) codes.
    No authentication required — codes are global reference data.
    """
    query = db.query(StandardLinkCode)
    if leaf_only:
        query = query.filter(StandardLinkCode.is_leaf.is_(True))
    codes = query.order_by(StandardLinkCode.sort_order).all()

    family_map: dict[str, list[StandardLinkCode]] = defaultdict(list)
    for c in codes:
        family_map[c.family].append(c)

    groups: list[StandardLinkCodeFamilyGroup] = []
    seen_families = set(family_map.keys())

    for family in _FAMILY_ORDER:
        if family not in seen_families:
            continue
        family_codes = family_map[family]
        account_type = next((c.account_type for c in family_codes if c.account_type), None)
        groups.append(
            StandardLinkCodeFamilyGroup(
                family=family,
                account_type=account_type,
                codes=[StandardLinkCodeResponse.model_validate(c) for c in family_codes],
            )
        )

    # Any families not in the predefined order go at the end
    for family, family_codes in family_map.items():
        if family not in _FAMILY_ORDER:
            account_type = next((c.account_type for c in family_codes if c.account_type), None)
            groups.append(
                StandardLinkCodeFamilyGroup(
                    family=family,
                    account_type=account_type,
                    codes=[StandardLinkCodeResponse.model_validate(c) for c in family_codes],
                )
            )

    return groups


@router.get("/flat", response_model=list[StandardLinkCodeResponse])
def list_standard_link_codes_flat(
    leaf_only: bool = False,
    family: str | None = None,
    db: Session = Depends(get_db),
):
    """Return all standard link codes as a flat list (useful for dropdowns)."""
    query = db.query(StandardLinkCode)
    if leaf_only:
        query = query.filter(StandardLinkCode.is_leaf.is_(True))
    if family:
        query = query.filter(StandardLinkCode.family == family.upper())
    codes = query.order_by(StandardLinkCode.sort_order).all()
    return [StandardLinkCodeResponse.model_validate(c) for c in codes]


@router.get("/{code}", response_model=StandardLinkCodeResponse)
def get_standard_link_code(code: str, db: Session = Depends(get_db)):
    """Return a single standard link code by its code string."""
    from fastapi import HTTPException

    record = db.query(StandardLinkCode).filter(StandardLinkCode.code == code.upper()).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Code '{code}' not found")
    return StandardLinkCodeResponse.model_validate(record)


# --- Superadmin global-code administration -----------------------------------

@router.post("", response_model=StandardLinkCodeResponse, status_code=status.HTTP_201_CREATED)
def create_standard_link_code(
    payload: StandardLinkCodeCreate,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Publish a new global code (superadmin only). Additive + versioned."""
    try:
        record = coa_admin.create_standard_code(db, **payload.model_dump())
    except coa_admin.CoaAdminError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    db.commit()
    db.refresh(record)
    return StandardLinkCodeResponse.model_validate(record)


@router.patch("/{code}", response_model=StandardLinkCodeResponse)
def update_standard_link_code(
    code: str,
    payload: StandardLinkCodeUpdate,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Edit a global code's metadata in place (superadmin only)."""
    try:
        record = coa_admin.update_standard_code(db, code, **payload.model_dump())
    except coa_admin.CoaAdminError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    db.commit()
    db.refresh(record)
    return StandardLinkCodeResponse.model_validate(record)


@router.delete("/{code}", response_model=StandardLinkCodeResponse)
def deprecate_standard_link_code(
    code: str,
    reactivate: bool = False,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Deprecate (tombstone) a global code, or reactivate with ?reactivate=true.
    Never hard-deletes, so historical references stay resolvable."""
    try:
        if reactivate:
            record = coa_admin.reactivate_standard_code(db, code)
        else:
            record = coa_admin.deprecate_standard_code(db, code)
    except coa_admin.CoaAdminError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    db.commit()
    db.refresh(record)
    return StandardLinkCodeResponse.model_validate(record)
