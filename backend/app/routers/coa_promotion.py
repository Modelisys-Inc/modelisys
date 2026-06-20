import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.company_link_code import CompanyLinkCode
from app.models.user import User, UserOrganization
from app.schemas.coa_promotion import (
    GlobalMatchSuggestion,
    PromoteRequest,
    PromoteResponse,
    PromotionCandidate,
    PromotionCandidateList,
)
from app.services import coa_promotion

router = APIRouter(prefix="/api/coa/promotion-candidates", tags=["coa-promotion"])


def _get_candidate_for_user(db: Session, user: User, candidate_id: uuid.UUID) -> CompanyLinkCode:
    """Fetch a custom code the user may curate (its company is in the user's org)."""
    candidate = (
        db.query(CompanyLinkCode)
        .join(Company, Company.id == CompanyLinkCode.company_id)
        .join(UserOrganization, UserOrganization.organization_id == Company.organization_id)
        .filter(
            CompanyLinkCode.id == candidate_id,
            UserOrganization.user_id == user.id,
        )
        .first()
    )
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidat de promotion introuvable")
    return candidate


@router.get("", response_model=PromotionCandidateList)
def list_promotion_candidates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List pending tenant-local codes (across the user's org) awaiting curation,
    each with a duplicate-suggestion by rollup signature."""
    rows = (
        db.query(CompanyLinkCode, Company.name)
        .join(Company, Company.id == CompanyLinkCode.company_id)
        .join(UserOrganization, UserOrganization.organization_id == Company.organization_id)
        .filter(
            UserOrganization.user_id == current_user.id,
            CompanyLinkCode.promotion_status == "pending",
        )
        .order_by(CompanyLinkCode.family, CompanyLinkCode.code)
        .all()
    )

    candidates: list[PromotionCandidate] = []
    for custom, company_name in rows:
        match = coa_promotion.suggest_global_match(db, custom)
        candidates.append(
            PromotionCandidate(
                id=custom.id,
                company_id=custom.company_id,
                company_name=company_name,
                code=custom.code,
                family=custom.family,
                label=custom.label,
                account_type=custom.account_type,
                ft_category=custom.ft_category,
                promotion_status=custom.promotion_status,
                suggested_match=(
                    GlobalMatchSuggestion(
                        code=match.code,
                        label=match.label_sub_account or match.label_account or match.code,
                        family=match.family,
                    )
                    if match
                    else None
                ),
            )
        )
    return PromotionCandidateList(candidates=candidates)


@router.post("/{candidate_id}/promote", response_model=PromoteResponse)
def promote_candidate(
    candidate_id: uuid.UUID,
    payload: PromoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Promote a candidate: link it to an existing global code, or publish a new one."""
    candidate = _get_candidate_for_user(db, current_user, candidate_id)
    if candidate.promotion_status == "promoted":
        raise HTTPException(status_code=409, detail="Ce code a déjà été promu")

    try:
        if payload.link_to_existing_code:
            coa_promotion.link_to_existing(db, candidate, payload.link_to_existing_code.strip().upper())
            created_new = False
        else:
            coa_promotion.promote_to_new_code(
                db,
                candidate,
                code=payload.code,
                label_account=payload.label_account,
                label_sub_account=payload.label_sub_account,
            )
            created_new = True
    except coa_promotion.PromotionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    db.commit()
    db.refresh(candidate)
    return PromoteResponse(
        company_link_code_id=candidate.id,
        promoted_to_standard_code=candidate.promoted_to_standard_code,
        created_new_code=created_new,
    )


@router.post("/{candidate_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
def reject_promotion_candidate(
    candidate_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a candidate as company-specific so it leaves the curation queue."""
    candidate = _get_candidate_for_user(db, current_user, candidate_id)
    coa_promotion.reject_candidate(db, candidate)
    db.commit()
