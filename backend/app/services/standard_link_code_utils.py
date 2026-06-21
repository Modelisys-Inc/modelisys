"""Shared rules for special standard link codes (computed net income, etc.)."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

NET_INCOME_BALANCE_LINK_CODE = "CAP-C.1"
NET_INCOME_SUM_FAMILIES = frozenset({"REV", "CMV", "EXP", "ADM", "VNT", "FIN", "AUT", "IMP"})
BALANCE_SHEET_FAMILIES = frozenset({"ACT", "ALT", "PCT", "PLT", "CAP"})
CASH_FLOW_FAMILIES = frozenset({"TEX", "TIN", "TFI"})
BILAN_CDR_FAMILIES = BALANCE_SHEET_FAMILIES | NET_INCOME_SUM_FAMILIES
_CAP_C_CASH_FLOW_ROOT = "CAP-C"
CASH_FLOW_VIRTUAL_FAMILIES = CASH_FLOW_FAMILIES
_FT_CATEGORY_ORDER = ("Exploitation", "Investissement", "Financement")
VIRTUAL_FAMILY_TO_FT_CATEGORY: dict[str, str] = {
    "TEX": "Exploitation",
    "TIN": "Investissement",
    "TFI": "Financement",
}
FT_CATEGORY_TO_VIRTUAL_FAMILY: dict[str, str] = {
    v: k for k, v in VIRTUAL_FAMILY_TO_FT_CATEGORY.items()
}


def is_income_statement_family(family: str | None) -> bool:
    return str(family or "").strip().upper() in NET_INCOME_SUM_FAMILIES


def is_balance_sheet_family(family: str | None) -> bool:
    return str(family or "").strip().upper() in BALANCE_SHEET_FAMILIES


def is_cash_flow_family(family: str | None) -> bool:
    return str(family or "").strip().upper() in CASH_FLOW_FAMILIES


def is_bilan_cdr_family(family: str | None) -> bool:
    return str(family or "").strip().upper() in BILAN_CDR_FAMILIES


def is_cap_c_cash_flow_eligible(code: str, parent_code: str | None, db: "Session") -> bool:
    """True when code belongs to the CAP-C subtree (CAP-C, CAP-C.1, CAP-C.2, …)."""
    normalized = code.strip()
    if normalized == _CAP_C_CASH_FLOW_ROOT or normalized.startswith(f"{_CAP_C_CASH_FLOW_ROOT}."):
        return True

    from app.models.standard_link_code import StandardLinkCode

    current = parent_code.strip() if parent_code else None
    while current:
        if current == _CAP_C_CASH_FLOW_ROOT or current.startswith(f"{_CAP_C_CASH_FLOW_ROOT}."):
            return True
        parent = db.query(StandardLinkCode).filter(StandardLinkCode.code == current).first()
        if not parent:
            return False
        current = parent.parent_code
    return False


def is_cash_flow_ft_category_eligible(
    code: str,
    family: str,
    is_leaf: bool,
    parent_code: str | None,
    db: "Session",
) -> bool:
    """Deprecated: ft_category on Bilan/CDR codes is no longer used."""
    return False


def is_computed_net_income_link_code(code: str | None) -> bool:
    return str(code or "").strip() == NET_INCOME_BALANCE_LINK_CODE


def is_mappable_standard_link_code(code: str, is_leaf: bool, family: str | None = None) -> bool:
    """Leaf codes assignable to GL mappings (excludes computed CAP-C.1 and Trésorerie families)."""
    if family and is_cash_flow_family(family):
        return False
    if not is_leaf:
        return False
    return not is_computed_net_income_link_code(code)


def income_statement_leaf_codes_for_net_income(db: "Session") -> list[str]:
    """All assignable IS leaf codes that feed CAP-C.1 (bénéfice net au bilan)."""
    from app.models.standard_link_code import StandardLinkCode

    rows = (
        db.query(StandardLinkCode)
        .filter(
            StandardLinkCode.is_leaf.is_(True),
            StandardLinkCode.family.in_(NET_INCOME_SUM_FAMILIES),
        )
        .order_by(StandardLinkCode.sort_order)
        .all()
    )
    return [r.code for r in rows]


def is_cash_flow_virtual_family(code: str | None) -> bool:
    return str(code or "").strip().upper() in CASH_FLOW_VIRTUAL_FAMILIES


def _leaf_descendants(db: "Session", parent_code: str) -> list[str]:
    from app.models.standard_link_code import StandardLinkCode

    leaves: list[str] = []
    stack = [parent_code]
    while stack:
        current = stack.pop()
        children = (
            db.query(StandardLinkCode)
            .filter(StandardLinkCode.parent_code == current)
            .order_by(StandardLinkCode.sort_order)
            .all()
        )
        if not children:
            record = db.query(StandardLinkCode).filter(StandardLinkCode.code == current).first()
            if record and record.is_leaf:
                leaves.append(current)
            continue
        for child in children:
            if child.is_leaf:
                leaves.append(child.code)
            else:
                stack.append(child.code)
    return leaves


def expand_attached_link_codes_for_mapping(db: "Session", attached_codes: list[str]) -> list[str]:
    """Resolve Bilan/CDR attachments to mappable leaf codes (parents expand to descendants)."""
    from app.models.standard_link_code import StandardLinkCode

    resolved: list[str] = []
    seen: set[str] = set()
    for raw in attached_codes:
        code = str(raw or "").strip()
        if not code or code in seen:
            continue
        record = db.query(StandardLinkCode).filter(StandardLinkCode.code == code).first()
        if not record:
            continue
        if is_computed_net_income_link_code(code):
            seen.add(code)
            resolved.append(code)
            continue
        if record.is_leaf:
            if is_mappable_standard_link_code(code, True, record.family):
                seen.add(code)
                resolved.append(code)
            continue
        for leaf in _leaf_descendants(db, code):
            if leaf not in seen:
                seen.add(leaf)
                resolved.append(leaf)
    return resolved


def build_cash_flow_link_code_attachments(db: "Session") -> dict[str, list[str]]:
    """Map each Trésorerie family code to its resolved Bilan/CDR source codes."""
    from app.models.standard_link_code import StandardLinkCode

    index: dict[str, list[str]] = {}
    rows = (
        db.query(StandardLinkCode)
        .filter(StandardLinkCode.family.in_(CASH_FLOW_FAMILIES))
        .order_by(StandardLinkCode.sort_order)
        .all()
    )
    for row in rows:
        attached = row.attached_link_codes if isinstance(row.attached_link_codes, list) else []
        index[row.code] = expand_attached_link_codes_for_mapping(db, attached)
    return index


def build_cash_flow_virtual_family_link_codes(db: "Session") -> dict[str, list[str]]:
    """Backward-compatible alias: TEX/TIN/TFI aggregate keys for legacy structures."""
    from app.models.standard_link_code import StandardLinkCode

    index: dict[str, list[str]] = {vf: [] for vf in CASH_FLOW_FAMILIES}
    rows = (
        db.query(StandardLinkCode)
        .filter(StandardLinkCode.family.in_(CASH_FLOW_FAMILIES))
        .order_by(StandardLinkCode.sort_order)
        .all()
    )
    for row in rows:
        attached = row.attached_link_codes if isinstance(row.attached_link_codes, list) else []
        sources = expand_attached_link_codes_for_mapping(db, attached)
        if row.family in index:
            index[row.family].extend(sources)
    return index


def build_net_income_balance_structure_row(code, sum_codes: list[str]) -> dict:
    label = (code.label_sub_account or code.label_account or code.code).strip()
    return {
        "label": label,
        "linkCode": code.code,
        "liaisonMode": "sum",
        "liaisonSumCodes": sum_codes,
        "defineMapping": False,
        "isComputedNetIncome": True,
        "indent": True,
    }
