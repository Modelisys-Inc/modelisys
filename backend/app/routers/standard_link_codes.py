from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.standard_link_code import StandardLinkCode
from app.schemas.standard_link_code import StandardLinkCodeFamilyGroup, StandardLinkCodeResponse

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
