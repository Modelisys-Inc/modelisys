"""Curated promotion of tenant-local custom codes into the global registry (Phase 4).

A custom `CompanyLinkCode` is a *promotion candidate*. A curator either:
  - links it to an existing global code (no new code created), or
  - promotes it to a NEW global code (published additively as a new COA version).

Promotion never auto-shares: it is an explicit, reviewed action. Duplicate
detection is by **rollup signature** (family + ft_category + account_type), not
by label, so "Deferred Revenue" / "Unearned Income" converge instead of
duplicating.
"""

import uuid

from sqlalchemy.orm import Session

from app.models.coa_version import CoaVersion
from app.models.company_link_code import CompanyLinkCode
from app.models.standard_link_code import StandardLinkCode
from app.scripts.seed_standard_link_codes import next_coa_version


class PromotionError(Exception):
    """Raised when a promotion request is invalid (e.g. code collision)."""


def suggest_global_match(db: Session, custom: CompanyLinkCode) -> StandardLinkCode | None:
    """Return an active global leaf code with the same rollup signature, if any.

    Signature = (family, ft_category, account_type). Surfaced to the curator as a
    "this probably already exists — link instead of duplicating" hint.
    """
    return (
        db.query(StandardLinkCode)
        .filter(
            StandardLinkCode.is_active.is_(True),
            StandardLinkCode.is_leaf.is_(True),
            StandardLinkCode.family == custom.family,
            StandardLinkCode.ft_category == custom.ft_category,
            StandardLinkCode.account_type == custom.account_type,
        )
        .order_by(StandardLinkCode.sort_order)
        .first()
    )


def link_to_existing(db: Session, custom: CompanyLinkCode, target_code: str) -> CompanyLinkCode:
    """Mark a candidate as promoted by linking it to an existing global code."""
    target = (
        db.query(StandardLinkCode)
        .filter(StandardLinkCode.code == target_code, StandardLinkCode.is_leaf.is_(True))
        .first()
    )
    if target is None:
        raise PromotionError(f"Code global cible introuvable ou non-feuille : {target_code}")

    custom.promoted_to_standard_code = target.code
    custom.promotion_status = "promoted"
    db.flush()
    return custom


def promote_to_new_code(
    db: Session,
    custom: CompanyLinkCode,
    *,
    code: str | None = None,
    label_account: str | None = None,
    label_sub_account: str | None = None,
) -> StandardLinkCode:
    """Publish a NEW global code from a custom code as a fresh COA version.

    Additive only: bumps the version, inserts the single new code stamped with
    that version (does not touch other codes), and marks the candidate promoted.
    """
    new_code = (code or custom.code).strip().upper()

    if db.query(StandardLinkCode.id).filter(StandardLinkCode.code == new_code).first() is not None:
        raise PromotionError(f"Le code global {new_code} existe déjà")

    version = next_coa_version(db)
    db.add(
        CoaVersion(
            id=uuid.uuid4(),
            version=version,
            source="promotion",
            note=f"Promotion of {custom.code} from company {custom.company_id}",
            code_count=1,
        )
    )

    created = StandardLinkCode(
        id=uuid.uuid4(),
        code=new_code,
        parent_code=None,
        family=custom.family,
        label_account=label_account if label_account is not None else custom.label_account,
        label_sub_account=label_sub_account if label_sub_account is not None else custom.label_sub_account,
        account_type=custom.account_type,
        account_sub_type=custom.account_sub_type,
        variable_or_fixed=custom.variable_or_fixed,
        ft_category=custom.ft_category,
        ft_line_item=custom.ft_line_item,
        projections=custom.projections,
        is_leaf=True,
        sort_order=0,
        is_active=True,
        coa_version=version,
    )
    db.add(created)

    custom.promoted_to_standard_code = new_code
    custom.promotion_status = "promoted"
    db.flush()
    return created


def reject_candidate(db: Session, custom: CompanyLinkCode) -> CompanyLinkCode:
    """Mark a candidate as company-specific (won't appear in the queue again)."""
    custom.promotion_status = "rejected"
    db.flush()
    return custom
