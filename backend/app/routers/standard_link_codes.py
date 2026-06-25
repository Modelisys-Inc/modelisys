from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_superadmin
from app.models.coa_version import CoaVersion
from app.models.standard_link_code import StandardLinkCode
from app.models.user import User
from app.schemas.standard_link_code import (
    StandardLinkCodeCreate,
    StandardLinkCodeFamilyGroup,
    StandardLinkCodeResponse,
    StandardLinkCodeSyncResponse,
    StandardLinkCodeUpdate,
)
from app.scripts.seed_standard_link_codes import next_coa_version
from app.services import coa_admin
from app.services.standard_link_code_utils import (
    NET_INCOME_BALANCE_LINK_CODE,
    is_bilan_cdr_family,
    is_cash_flow_family,
)
from app.services.statement_template import (
    propagate_standard_link_code_label_to_structures,
    sort_codes_hierarchically,
    sync_all_companies_from_standard,
)

router = APIRouter(prefix="/api/standard-link-codes", tags=["standard-link-codes"])

# Family display order (Balance Sheet first, then Income Statement)
_FAMILY_ORDER = [
    "ACT", "ALT", "PCT", "PLT", "CAP",
    "REV", "CMV", "EXP", "ADM", "VNT", "FIN", "AUT", "IMP",
    "TEX", "TIN", "TFI",
]

_ALLOWED_FT_CATEGORIES = frozenset()  # ft_category on Bilan/CDR is deprecated


def _sort_codes_hierarchically(codes: list[StandardLinkCode]) -> list[StandardLinkCode]:
    return sort_codes_hierarchically(codes)


def _subtree_max_sort_order(codes: list[StandardLinkCode], root_code: str) -> int:
    by_code = {c.code: c for c in codes}
    children: dict[str | None, list[StandardLinkCode]] = defaultdict(list)
    for c in codes:
        parent = c.parent_code if c.parent_code in by_code else None
        children[parent].append(c)

    root = by_code.get(root_code)
    if not root:
        return 0

    max_order = root.sort_order
    stack = [root_code]
    while stack:
        current = stack.pop()
        for child in children.get(current, []):
            max_order = max(max_order, child.sort_order)
            stack.append(child.code)
    return max_order


def _compute_insert_sort_order(
    db: Session,
    family: str,
    parent_code: str | None,
) -> int:
    family_codes = db.query(StandardLinkCode).filter(StandardLinkCode.family == family).all()

    if parent_code:
        return _subtree_max_sort_order(family_codes, parent_code) + 1

    roots = [c for c in family_codes if not c.parent_code]
    if roots:
        return max(c.sort_order for c in roots) + 1

    if family_codes:
        return max(c.sort_order for c in family_codes) + 1
    return 1


def _shift_sort_orders_from(db: Session, family: str, from_order: int) -> None:
    records = (
        db.query(StandardLinkCode)
        .filter(
            StandardLinkCode.family == family,
            StandardLinkCode.sort_order >= from_order,
        )
        .order_by(StandardLinkCode.sort_order.desc())
        .all()
    )
    for record in records:
        record.sort_order += 1


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
        query = query.filter(StandardLinkCode.code != NET_INCOME_BALANCE_LINK_CODE)
    codes = query.order_by(StandardLinkCode.sort_order).all()

    family_map: dict[str, list[StandardLinkCode]] = defaultdict(list)
    for c in codes:
        family_map[c.family].append(c)

    groups: list[StandardLinkCodeFamilyGroup] = []
    seen_families = set(family_map.keys())

    for family in _FAMILY_ORDER:
        if family not in seen_families:
            continue
        family_codes = _sort_codes_hierarchically(family_map[family])
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
            family_codes = _sort_codes_hierarchically(family_codes)
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
        query = query.filter(StandardLinkCode.code != NET_INCOME_BALANCE_LINK_CODE)
    if family:
        query = query.filter(StandardLinkCode.family == family.upper())
    codes = query.order_by(StandardLinkCode.sort_order).all()
    return [StandardLinkCodeResponse.model_validate(c) for c in codes]


@router.get("/{code}", response_model=StandardLinkCodeResponse)
def get_standard_link_code(code: str, db: Session = Depends(get_db)):
    """Return a single standard link code by its code string."""
    record = db.query(StandardLinkCode).filter(StandardLinkCode.code == code).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Code '{code}' not found")
    return StandardLinkCodeResponse.model_validate(record)


# --- Superadmin global-code administration -----------------------------------


def _validate_parent_code(db: Session, parent_code: str | None) -> None:
    if parent_code is None:
        return
    parent = db.query(StandardLinkCode).filter(StandardLinkCode.code == parent_code).first()
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Parent code '{parent_code}' not found",
        )


def _validate_ft_category(
    ft_category: str | None,
    family: str,
) -> None:
    if ft_category:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "La section Trésorerie sur les codes Bilan / Compte de résultat n'est plus "
                "utilisée. Créez un code dans une famille Trésorerie (TEX, TIN, TFI) et "
                "associez-y des codes Bilan ou Compte de résultat."
            ),
        )


def _normalize_attached_link_codes(raw: list[str] | None) -> list[str]:
    if not raw:
        return []
    seen: set[str] = set()
    normalized: list[str] = []
    for item in raw:
        code = str(item or "").strip()
        if not code or code in seen:
            continue
        seen.add(code)
        normalized.append(code)
    return normalized


def _validate_attached_link_codes(
    db: Session,
    family: str,
    attached_link_codes: list[str],
    *,
    require_non_empty: bool,
) -> list[str]:
    normalized = _normalize_attached_link_codes(attached_link_codes)
    if is_cash_flow_family(family):
        if require_non_empty and not normalized:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Au moins un code de liaison Bilan ou Compte de résultat doit être "
                    "associé à un code Trésorerie."
                ),
            )
        for code in normalized:
            record = db.query(StandardLinkCode).filter(StandardLinkCode.code == code).first()
            if not record:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Code de liaison associé introuvable : '{code}'",
                )
            if not is_bilan_cdr_family(record.family):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"Le code '{code}' n'appartient pas au Bilan ni au Compte de résultat."
                    ),
                )
        return normalized

    if normalized:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Seuls les codes Trésorerie (TEX, TIN, TFI) peuvent avoir des codes associés.",
        )
    return []


def _validate_leaf_status(db: Session, code: str, is_leaf: bool) -> None:
    if is_leaf:
        has_children = (
            db.query(StandardLinkCode.id)
            .filter(StandardLinkCode.parent_code == code)
            .first()
        )
        if has_children:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Code '{code}' has child codes and cannot be marked as a leaf",
            )


@router.post("", response_model=StandardLinkCodeResponse, status_code=status.HTTP_201_CREATED)
def create_standard_link_code(
    payload: StandardLinkCodeCreate,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Publish a new standard link code in the global chart (superadmin only).

    Additive + versioned: each publish bumps the COA version. Full domain
    validation (Trésorerie/cash-flow families, attached codes, leaf status,
    sort order) is enforced here.
    """
    code = payload.code.strip()
    if not code:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Code is required")

    existing = db.query(StandardLinkCode).filter(StandardLinkCode.code == code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Code '{code}' already exists",
        )

    family = payload.family.strip().upper()
    if not family:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Family is required")

    parent_code = payload.parent_code.strip() if payload.parent_code else None
    _validate_parent_code(db, parent_code)
    _validate_ft_category(payload.ft_category, family)

    if is_cash_flow_family(family):
        if parent_code:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Les codes Trésorerie ne peuvent pas avoir de code parent.",
            )
        is_leaf = False
        attached = _validate_attached_link_codes(
            db, family, payload.attached_link_codes, require_non_empty=True
        )
    else:
        is_leaf = payload.is_leaf
        _validate_leaf_status(db, code, is_leaf)
        attached = _validate_attached_link_codes(
            db, family, payload.attached_link_codes, require_non_empty=False
        )

    if payload.sort_order is not None:
        sort_order = payload.sort_order
    else:
        sort_order = _compute_insert_sort_order(db, family, parent_code)
        if parent_code is not None:
            _shift_sort_orders_from(db, family, sort_order)

    # Additive + versioned publish: bump the COA version and stamp the new code
    # (mirrors coa_admin.create_standard_code / the seed contract).
    version = next_coa_version(db)
    db.add(
        CoaVersion(
            version=version,
            source="admin",
            note=f"Admin created {code}",
            code_count=1,
        )
    )

    record = StandardLinkCode(
        code=code,
        family=family,
        parent_code=parent_code,
        label_account=payload.label_account,
        label_sub_account=payload.label_sub_account,
        account_type=payload.account_type,
        account_sub_type=payload.account_sub_type,
        variable_or_fixed=payload.variable_or_fixed,
        ft_category=None,
        attached_link_codes=attached,
        ft_line_item=payload.ft_line_item,
        projections=payload.projections,
        is_leaf=is_leaf,
        is_active=True,
        coa_version=version,
        sort_order=sort_order,
    )
    db.add(record)
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
    """Edit a global code in place (superadmin only).

    Metadata edits don't rewrite history (existing companies use their own
    snapshot); full domain validation is enforced.
    """
    record = db.query(StandardLinkCode).filter(StandardLinkCode.code == code).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Code '{code}' not found")

    updates = payload.model_dump(exclude_unset=True)

    if is_cash_flow_family(record.family):
        if "parent_code" in updates and updates["parent_code"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Les codes Trésorerie ne peuvent pas avoir de code parent.",
            )
        if "is_leaf" in updates and updates["is_leaf"] is True:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Les codes Trésorerie ne peuvent pas être des codes feuilles mappables.",
            )
        record.is_leaf = False
        record.parent_code = None
        record.ft_category = None
    elif "parent_code" in updates:
        parent_code = updates["parent_code"].strip() if updates["parent_code"] else None
        if parent_code == record.code:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A code cannot be its own parent",
            )
        _validate_parent_code(db, parent_code)
        if parent_code != record.parent_code:
            new_sort_order = _compute_insert_sort_order(db, record.family, parent_code)
            if parent_code is not None:
                _shift_sort_orders_from(db, record.family, new_sort_order)
            record.sort_order = new_sort_order
        record.parent_code = parent_code

    if not is_cash_flow_family(record.family) and "is_leaf" in updates and updates["is_leaf"] is not None:
        _validate_leaf_status(db, record.code, updates["is_leaf"])
        record.is_leaf = updates["is_leaf"]

    if "ft_category" in updates:
        _validate_ft_category(updates["ft_category"], record.family)
        record.ft_category = None

    if "attached_link_codes" in updates:
        record.attached_link_codes = _validate_attached_link_codes(
            db,
            record.family,
            updates["attached_link_codes"] or [],
            require_non_empty=is_cash_flow_family(record.family),
        )

    label_fields_changed = "label_account" in updates or "label_sub_account" in updates

    for field in (
        "label_account",
        "label_sub_account",
        "account_type",
        "account_sub_type",
        "variable_or_fixed",
        "ft_line_item",
        "projections",
        "sort_order",
    ):
        if field in updates:
            setattr(record, field, updates[field])

    if label_fields_changed:
        propagate_standard_link_code_label_to_structures(db, record)

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


@router.post("/sync-companies", response_model=StandardLinkCodeSyncResponse)
def sync_standard_codes_to_companies(
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Apply the current global standard link codes chart to all companies.

    Updates each company's income-statement and balance-sheet structures so
    every client uses the same link-code base. Superadmin-only.
    """
    companies_updated = sync_all_companies_from_standard(db)
    return StandardLinkCodeSyncResponse(companies_updated=companies_updated)
