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
from sqlalchemy.orm.attributes import flag_modified

from app.models.account_mapping import AccountMapping
from app.models.coa_version import CoaVersion
from app.models.company_link_code import CompanyLinkCode
from app.models.standard_link_code import StandardLinkCode
from app.scripts.seed_standard_link_codes import next_coa_version
from app.services.standard_link_code_utils import is_computed_net_income_link_code


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


_STRUCTURE_CODE_LIST_KEYS = (
    "liaisonSumCodes",
    "liaisonNumeratorCodes",
    "liaisonDenominatorCodes",
)


def _replace_link_code_in_structure_row(row: dict, old: str, new: str) -> bool:
    changed = False
    for key in ("linkCode", "link_code"):
        if str(row.get(key) or "").strip() == old:
            row[key] = new
            changed = True
    for key in _STRUCTURE_CODE_LIST_KEYS:
        val = row.get(key)
        if not isinstance(val, list):
            continue
        replaced = [new if str(x).strip() == old else x for x in val]
        if replaced != val:
            row[key] = replaced
            changed = True
    for child_key in ("children", "detailRows"):
        children = row.get(child_key)
        if not isinstance(children, list):
            continue
        for child in children:
            if isinstance(child, dict) and _replace_link_code_in_structure_row(child, old, new):
                changed = True
    return changed


def propagate_standard_link_code_rename_to_structures(db: Session, old_code: str, new_code: str) -> int:
    """Rewrite link-code references in every company statement structure."""
    from app.models.financial_statement_mapping import CompanyStatementStructure

    old = old_code.strip()
    new = new_code.strip()
    if not old or not new or old == new:
        return 0

    structures_updated = 0
    for rec in db.query(CompanyStatementStructure).all():
        structure = rec.structure
        if not isinstance(structure, list):
            continue
        changed = False
        for row in structure:
            if not isinstance(row, dict):
                continue
            if _replace_link_code_in_structure_row(row, old, new):
                changed = True
        if changed:
            rec.structure = structure
            flag_modified(rec, "structure")
            rec.updated_at = datetime.now(timezone.utc)
            structures_updated += 1
    return structures_updated


def _replace_attached_link_codes(db: Session, old: str, new: str) -> None:
    for rec in db.query(StandardLinkCode).all():
        attached = rec.attached_link_codes or []
        if old not in attached:
            continue
        rec.attached_link_codes = [new if c == old else c for c in attached]


def rename_standard_code(db: Session, old_code: str, new_code: str) -> StandardLinkCode:
    """Rename a global code and cascade references (mappings, children, structures)."""
    record = _get_or_404(db, old_code)
    old = record.code.strip()
    new = new_code.strip().upper()
    if not new:
        raise CoaAdminError("Le nouveau code est requis")
    if new == old:
        return record
    if is_computed_net_income_link_code(old):
        raise CoaAdminError("Ce code calculé ne peut pas être renommé")
    if db.query(StandardLinkCode.id).filter(StandardLinkCode.code == new).first() is not None:
        raise CoaAdminError(f"Le code {new} existe déjà")

    version = next_coa_version(db)
    db.add(
        CoaVersion(
            id=uuid.uuid4(),
            version=version,
            source="admin",
            note=f"Admin renamed {old} → {new}",
            code_count=1,
        )
    )
    record.code = new
    record.coa_version = version

    db.query(StandardLinkCode).filter(StandardLinkCode.parent_code == old).update(
        {StandardLinkCode.parent_code: new},
        synchronize_session=False,
    )
    _replace_attached_link_codes(db, old, new)

    db.query(AccountMapping).filter(AccountMapping.link_code == old).update(
        {AccountMapping.link_code: new},
        synchronize_session=False,
    )
    db.query(AccountMapping).filter(AccountMapping.variable_cost_revenue_link_code == old).update(
        {AccountMapping.variable_cost_revenue_link_code: new},
        synchronize_session=False,
    )
    db.query(CompanyLinkCode).filter(CompanyLinkCode.parent_code == old).update(
        {CompanyLinkCode.parent_code: new},
        synchronize_session=False,
    )
    db.query(CompanyLinkCode).filter(CompanyLinkCode.promoted_to_standard_code == old).update(
        {CompanyLinkCode.promoted_to_standard_code: new},
        synchronize_session=False,
    )

    propagate_standard_link_code_rename_to_structures(db, old, new)
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
