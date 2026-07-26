"""Unified resolution of link codes across the global registry and per-company overlay.

A company's assignable link codes are the union of:
  - global leaf codes in ``standard_link_codes`` (shared chart from MO.xlsx), and
  - that company's tenant-local leaf codes in ``company_link_codes``.

Custom codes are validated never to collide with a global code, so the union is
unambiguous. This module is the single source of truth used by every validation
gate (manual mapping upsert, QuickBooks commit) and every picker, so the rules
stay consistent.
"""

import uuid
from collections.abc import Iterable

from sqlalchemy.orm import Session

from app.models.company_link_code import CompanyLinkCode
from app.models.standard_link_code import StandardLinkCode
from app.services.standard_link_code_utils import is_mappable_standard_link_code


def valid_leaf_codes(
    db: Session, company_id: uuid.UUID, requested: Iterable[str]
) -> set[str]:
    """Return the subset of ``requested`` codes that are assignable for this company.

    A code is assignable if it is a leaf in the global registry OR a leaf in the
    company's own overlay. Global leaves additionally must be *mappable* — the
    computed net-income code (CAP-C.1) and the Trésorerie/cash-flow families are
    excluded from GL mapping (see ``is_mappable_standard_link_code``). Empty/None
    entries are ignored.
    """
    requested_set = {c for c in requested if c}
    if not requested_set:
        return set()

    global_codes = {
        row.code
        for row in db.query(
            StandardLinkCode.code,
            StandardLinkCode.is_leaf,
            StandardLinkCode.family,
        )
        .filter(
            StandardLinkCode.code.in_(requested_set),
            StandardLinkCode.is_leaf.is_(True),
            StandardLinkCode.is_active.is_(True),
        )
        .all()
        if is_mappable_standard_link_code(row.code, row.is_leaf, row.family)
    }

    overlay_codes = {
        row.code
        for row in db.query(CompanyLinkCode.code)
        .filter(
            CompanyLinkCode.company_id == company_id,
            CompanyLinkCode.code.in_(requested_set),
            CompanyLinkCode.is_leaf.is_(True),
        )
        .all()
    }

    return global_codes | overlay_codes


def invalid_leaf_codes(
    db: Session, company_id: uuid.UUID, requested: Iterable[str]
) -> list[str]:
    """Return the sorted list of requested codes that are NOT assignable."""
    requested_set = {c for c in requested if c}
    valid = valid_leaf_codes(db, company_id, requested_set)
    return sorted(requested_set - valid)


def code_exists_globally(db: Session, code: str) -> bool:
    """True if ``code`` already exists in the global registry (any node)."""
    return (
        db.query(StandardLinkCode.id)
        .filter(StandardLinkCode.code == code)
        .first()
        is not None
    )


def code_exists_for_company(db: Session, company_id: uuid.UUID, code: str) -> bool:
    """True if ``code`` already exists in this company's overlay (any node)."""
    return (
        db.query(CompanyLinkCode.id)
        .filter(
            CompanyLinkCode.company_id == company_id,
            CompanyLinkCode.code == code,
        )
        .first()
        is not None
    )
