"""Superadmin CRUD over the global chart of accounts (standard_link_codes).

Mirrors the Phase 3 versioning/tombstone rules so direct admin edits behave like
the seed and the promotion path:
  - create publishes a new code additively under a fresh CoaVersion,
  - deprecate tombstones (is_active=False) — never hard-deletes,
  - metadata edits are in-place (existing companies use their own snapshot, so a
    label fix does not rewrite history).
This lets a superadmin manage the chart in-app and retire the MO.xlsx spreadsheet.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.coa_version import CoaVersion
from app.models.standard_link_code import StandardLinkCode
from app.scripts.seed_standard_link_codes import next_coa_version


class CoaAdminError(Exception):
    """Invalid global-code admin operation (e.g. duplicate code)."""


_EDITABLE_FIELDS = (
    "parent_code",
    "label_account",
    "label_sub_account",
    "account_type",
    "account_sub_type",
    "variable_or_fixed",
    "ft_category",
    "ft_line_item",
    "projections",
    "sort_order",
)


def create_standard_code(db: Session, *, code: str, family: str, **fields) -> StandardLinkCode:
    """Publish a new global code as a fresh COA version (additive)."""
    code = code.strip().upper()
    family = family.strip().upper()
    if not code or not family:
        raise CoaAdminError("code et family sont requis")
    if db.query(StandardLinkCode.id).filter(StandardLinkCode.code == code).first() is not None:
        raise CoaAdminError(f"Le code {code} existe déjà")

    version = next_coa_version(db)
    db.add(
        CoaVersion(
            id=uuid.uuid4(),
            version=version,
            source="admin",
            note=f"Admin created {code}",
            code_count=1,
        )
    )
    record = StandardLinkCode(
        id=uuid.uuid4(),
        code=code,
        family=family,
        is_leaf=True,
        is_active=True,
        coa_version=version,
        **{k: fields.get(k) for k in _EDITABLE_FIELDS if k in fields},
    )
    db.add(record)
    db.flush()
    return record


def _get_or_404(db: Session, code: str) -> StandardLinkCode:
    record = db.query(StandardLinkCode).filter(StandardLinkCode.code == code.upper()).first()
    if record is None:
        raise CoaAdminError(f"Code {code} introuvable")
    return record


def update_standard_code(db: Session, code: str, **fields) -> StandardLinkCode:
    """In-place metadata update of an existing global code."""
    record = _get_or_404(db, code)
    for key in _EDITABLE_FIELDS:
        if key in fields and fields[key] is not None:
            setattr(record, key, fields[key])
    db.flush()
    return record


def deprecate_standard_code(db: Session, code: str) -> StandardLinkCode:
    """Tombstone a global code (is_active=False); never hard-delete."""
    record = _get_or_404(db, code)
    record.is_active = False
    record.deprecated_at = datetime.now(timezone.utc)
    db.flush()
    return record


def reactivate_standard_code(db: Session, code: str) -> StandardLinkCode:
    record = _get_or_404(db, code)
    record.is_active = True
    record.deprecated_at = None
    db.flush()
    return record
