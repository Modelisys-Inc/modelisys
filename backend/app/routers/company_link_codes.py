import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, verify_company_access
from app.models.company_link_code import CompanyLinkCode
from app.models.financial_statement_mapping import CompanyStatementStructure
from app.models.user import User
from app.schemas.company_link_code import CompanyLinkCodeCreate, CompanyLinkCodeResponse
from app.services.link_code_resolver import code_exists_for_company, code_exists_globally

router = APIRouter(prefix="/api/companies/{company_id}", tags=["company-link-codes"])

# Balance-sheet families render in the balance-sheet structure; everything else
# is income-statement. Mirrors statement_template / the QBO picker split.
_BALANCE_SHEET_FAMILIES = {"ACT", "ALT", "PCT", "PLT", "CAP"}

# Reserved letter for tenant-local custom codes so they never collide with the
# lettered global codes (e.g. ACT-B, ACT-B.1). Custom codes look like ACT-Z1.
_CUSTOM_LETTER = "Z"


def _statement_type_for_family(family: str) -> str:
    return "balance-sheet" if family.upper() in _BALANCE_SHEET_FAMILIES else "income-statement"


def _generate_custom_code(db: Session, company_id: uuid.UUID, family: str) -> str:
    """Return a collision-free custom code in the reserved namespace for a family."""
    family = family.upper()
    n = 1
    while True:
        candidate = f"{family}-{_CUSTOM_LETTER}{n}"
        if not code_exists_globally(db, candidate) and not code_exists_for_company(
            db, company_id, candidate
        ):
            return candidate
        n += 1


def _append_leaf_to_structure(
    db: Session, company_id: uuid.UUID, statement_type: str, code: str, label: str
) -> None:
    """Append an assignable leaf row to the company's statement structure so the
    custom code renders in reports. No-op if a row for this code already exists."""
    structure = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company_id,
            CompanyStatementStructure.statement_type == statement_type,
        )
        .first()
    )

    new_row = {"label": label, "linkCode": code, "indent": True, "isCustom": True}

    if structure is None:
        structure = CompanyStatementStructure(
            company_id=company_id,
            statement_type=statement_type,
            structure=[new_row],
        )
        db.add(structure)
        return

    rows = list(structure.structure or [])
    if any(isinstance(r, dict) and r.get("linkCode") == code for r in rows):
        return
    rows.append(new_row)
    # Reassign so SQLAlchemy detects the JSON change.
    structure.structure = rows


@router.get("/custom-link-codes", response_model=list[CompanyLinkCodeResponse])
def list_custom_link_codes(
    company_id: uuid.UUID,
    leaf_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List this company's tenant-local custom link codes."""
    verify_company_access(db, current_user, company_id)
    query = db.query(CompanyLinkCode).filter(CompanyLinkCode.company_id == company_id)
    if leaf_only:
        query = query.filter(CompanyLinkCode.is_leaf.is_(True))
    codes = query.order_by(CompanyLinkCode.family, CompanyLinkCode.sort_order).all()
    return [CompanyLinkCodeResponse.model_validate(c) for c in codes]


@router.post(
    "/custom-link-codes",
    response_model=CompanyLinkCodeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_custom_link_code(
    company_id: uuid.UUID,
    payload: CompanyLinkCodeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a tenant-local custom link code for an accounting-complex client.

    The code stays private to this company. It is also appended as an assignable
    leaf to the company's statement structure so it renders in reports.
    """
    verify_company_access(db, current_user, company_id)

    family = (payload.family or "").strip().upper()
    if not family:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="family est requis",
        )

    # Resolve the code: explicit (validated collision-free) or auto-generated.
    if payload.code:
        code = payload.code.strip().upper()
        if code_exists_globally(db, code):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"message": "Ce code existe déjà dans le chart global", "code": code},
            )
        if code_exists_for_company(db, company_id, code):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"message": "Ce code personnalisé existe déjà", "code": code},
            )
    else:
        code = _generate_custom_code(db, company_id, family)

    # Next sort_order for this company's overlay.
    max_order = (
        db.query(CompanyLinkCode.sort_order)
        .filter(CompanyLinkCode.company_id == company_id)
        .order_by(CompanyLinkCode.sort_order.desc())
        .first()
    )
    next_order = (max_order[0] + 1) if max_order else 0

    record = CompanyLinkCode(
        company_id=company_id,
        code=code,
        parent_code=payload.parent_code,
        family=family,
        label_account=payload.label_account,
        label_sub_account=payload.label_sub_account,
        account_type=payload.account_type,
        account_sub_type=payload.account_sub_type,
        variable_or_fixed=payload.variable_or_fixed,
        ft_category=payload.ft_category,
        ft_line_item=payload.ft_line_item,
        projections=payload.projections,
        is_leaf=True,
        sort_order=next_order,
    )
    db.add(record)

    statement_type = payload.statement_type or _statement_type_for_family(family)
    _append_leaf_to_structure(db, company_id, statement_type, code, record.label)

    db.commit()
    db.refresh(record)
    return CompanyLinkCodeResponse.model_validate(record)


@router.delete("/custom-link-codes/{code_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_link_code(
    company_id: uuid.UUID,
    code_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a tenant-local custom code. Does not remove existing mappings that
    reference it (they will simply fail validation on next save)."""
    verify_company_access(db, current_user, company_id)
    record = (
        db.query(CompanyLinkCode)
        .filter(
            CompanyLinkCode.id == code_id,
            CompanyLinkCode.company_id == company_id,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Code personnalisé introuvable")
    db.delete(record)
    db.commit()
