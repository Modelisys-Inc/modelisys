"""Shared rules for special standard link codes (computed net income, etc.)."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

NET_INCOME_BALANCE_LINK_CODE = "CAP-C.1"
# Familles P&L (AUT reste une famille CDR mais n’entre pas dans CAP-C.1)
NET_INCOME_SUM_FAMILIES = frozenset({"REV", "CMV", "EXP", "ADM", "VNT", "FIN", "AUT", "IMP"})
NET_INCOME_REVENUE_FAMILIES = frozenset({"REV"})
NET_INCOME_EXPENSE_FAMILIES = frozenset({"CMV", "EXP", "ADM", "VNT", "FIN", "IMP"})
BALANCE_SHEET_FAMILIES = frozenset({"ACT", "ALT", "PCT", "PLT", "CAP"})
CASH_FLOW_FAMILIES = frozenset({"TEX", "TIN", "TFI"})
BILAN_CDR_FAMILIES = BALANCE_SHEET_FAMILIES | NET_INCOME_SUM_FAMILIES

# Nature normale du solde (aligné sur la page Code de liaison).
FAMILY_DT_CT: dict[str, str] = {
    "ACT": "DT",
    "ALT": "DT",
    "PCT": "CT",
    "PLT": "CT",
    "CAP": "CT",
    "REV": "CT",
    "CMV": "DT",
    "EXP": "DT",
    "ADM": "DT",
    "VNT": "DT",
    "FIN": "DT",
    "AUT": "DT",
    "IMP": "DT",
}
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


def derive_link_code_family(code: str | None) -> str:
    """Ex. ACT-B.1 → ACT, REV-A → REV (même règle que le seed MO.xlsx)."""
    normalized = str(code or "").strip()
    if not normalized:
        return ""
    return normalized.split("-")[0].split(".")[0].upper()


def dt_ct_for_link_code(code: str | None) -> str | None:
    """Retourne DT, CT ou None (ex. trésorerie TEX/TIN/TFI)."""
    family = derive_link_code_family(code)
    if not family:
        return None
    return FAMILY_DT_CT.get(family)


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


LinkCodeChartRow = dict[str, object]


def load_merged_link_code_chart(db: "Session", company_id) -> dict[str, LinkCodeChartRow]:
    """Global standard chart ∪ tenant overlay — used for parent rollups in financial statements."""
    from app.models.company_link_code import CompanyLinkCode
    from app.models.standard_link_code import StandardLinkCode

    chart: dict[str, LinkCodeChartRow] = {}
    for row in db.query(StandardLinkCode).all():
        chart[row.code] = {
            "parent_code": row.parent_code,
            "family": row.family,
            "is_leaf": row.is_leaf,
        }
    for row in db.query(CompanyLinkCode).filter(CompanyLinkCode.company_id == company_id).all():
        chart[row.code] = {
            "parent_code": row.parent_code,
            "family": row.family,
            "is_leaf": row.is_leaf,
        }
    return chart


def build_parent_rollup_index(
    mappings: list,
    chart: dict[str, LinkCodeChartRow],
) -> dict[str, list[str]]:
    """Roll up GL accounts to parent codes and family anchors (e.g. REV).

    Matches the mapping page « Parent » column: each mapped leaf is attributed
  to its ``parent_code`` chain and to its statement family (REV, CMV, …).
    """
    from collections import defaultdict

    index: dict[str, set[str]] = defaultdict(set)
    for mapping in mappings:
        lc = str(getattr(mapping, "link_code", None) or "").strip()
        if not lc:
            continue
        acct = str(getattr(mapping, "account_number", None) or "").strip()
        if not acct:
            continue
        index[lc].add(acct)
        meta = chart.get(lc)
        if not meta:
            continue
        current = meta.get("parent_code")
        while current:
            parent_code = str(current).strip()
            if not parent_code:
                break
            index[parent_code].add(acct)
            parent_meta = chart.get(parent_code)
            current = parent_meta.get("parent_code") if parent_meta else None
        fam = str(meta.get("family") or "").strip()
        if fam and (is_income_statement_family(fam) or is_balance_sheet_family(fam)):
            index[fam].add(acct)
    return {k: sorted(v) for k, v in index.items()}


def merge_parent_rollup_into_mapping_index(
    mapping_index: dict[str, list[str]],
    parent_rollup_index: dict[str, list[str]] | None,
) -> dict[str, list[str]]:
    if not parent_rollup_index:
        return mapping_index
    merged = {k: list(v) for k, v in mapping_index.items()}
    for key, accounts in parent_rollup_index.items():
        if not accounts:
            continue
        existing = merged.get(key, [])
        merged[key] = list(dict.fromkeys([*accounts, *existing]))
    return merged


def income_statement_leaf_codes_for_net_income(db: "Session") -> list[str]:
    """Leaf codes used by CAP-C.1 (revenus + charges, sans AUT)."""
    from app.models.standard_link_code import StandardLinkCode

    families = NET_INCOME_REVENUE_FAMILIES | NET_INCOME_EXPENSE_FAMILIES
    rows = (
        db.query(StandardLinkCode)
        .filter(
            StandardLinkCode.is_leaf.is_(True),
            StandardLinkCode.family.in_(families),
        )
        .order_by(StandardLinkCode.sort_order)
        .all()
    )
    return [r.code for r in rows]


def income_statement_net_income_code_split(db: "Session") -> tuple[list[str], list[str]]:
    """(revenus REV, charges CMV/EXP/ADM/VNT/FIN/IMP) pour CAP-C.1 = REV(CT) − charges."""
    from app.models.standard_link_code import StandardLinkCode

    rev_rows = (
        db.query(StandardLinkCode)
        .filter(
            StandardLinkCode.is_leaf.is_(True),
            StandardLinkCode.family.in_(NET_INCOME_REVENUE_FAMILIES),
        )
        .order_by(StandardLinkCode.sort_order)
        .all()
    )
    exp_rows = (
        db.query(StandardLinkCode)
        .filter(
            StandardLinkCode.is_leaf.is_(True),
            StandardLinkCode.family.in_(NET_INCOME_EXPENSE_FAMILIES),
        )
        .order_by(StandardLinkCode.sort_order)
        .all()
    )
    return [r.code for r in rev_rows], [r.code for r in exp_rows]


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


def collect_cash_flow_structure_family_codes(
    structure: list[dict] | None,
    family: str,
) -> list[str]:
    """Link codes of a Trésorerie family present as « code unique » in a structure.

    Used by the cash-flow summary so TEX/TIN/TFI roll up only the codes configured
    in the company's cash-flow-detail structure (not every chart code in the family).
    """
    fam = str(family or "").strip().upper()
    if fam not in CASH_FLOW_FAMILIES or not structure:
        return []

    def _mode(row: dict) -> str:
        raw = row.get("liaisonMode")
        if isinstance(raw, str) and raw.strip():
            m = raw.strip().lower()
            if m in ("na", "n/a", "none"):
                return "na"
            if m in ("single", "unique", "code"):
                return "single"
            if m in ("sum", "addition", "add"):
                return "sum"
            if m in ("difference", "subtraction", "subtract"):
                return "difference"
            if m in ("product", "multiplication", "multiply"):
                return "product"
            if m in ("quotient", "division", "divide"):
                return "quotient"
        if str(row.get("linkCode") or "").strip():
            return "single"
        return "na"

    out: list[str] = []
    seen: set[str] = set()
    for row in structure:
        if not isinstance(row, dict):
            continue
        if _mode(row) != "single":
            continue
        lc = str(row.get("linkCode") or "").strip()
        if not lc or lc.upper() == fam:
            continue
        if derive_link_code_family(lc) != fam:
            continue
        if lc in seen:
            continue
        seen.add(lc)
        out.append(lc)
    return out


def build_cash_flow_virtual_family_link_codes_from_detail(
    db: "Session",
    detail_structure: list[dict] | None,
) -> dict[str, list[str]]:
    """TEX/TIN/TFI → union of attachments for codes present in the Detail structure."""
    by_code = build_cash_flow_link_code_attachments(db)
    index: dict[str, list[str]] = {vf: [] for vf in CASH_FLOW_FAMILIES}
    for family in CASH_FLOW_FAMILIES:
        for cf_code in collect_cash_flow_structure_family_codes(detail_structure, family):
            index[family].extend(by_code.get(cf_code, []))
    return index


def build_net_income_balance_structure_row(
    code,
    revenue_codes: list[str],
    expense_codes: list[str],
) -> dict:
    """CAP-C.1 = (REV × −1 via CT) − (CMV+EXP+ADM+VNT+FIN+IMP), YTD côté compute."""
    label = (code.label_sub_account or code.label_account or code.code).strip()
    return {
        "id": code.code,
        "label": label or "Bénéfice net",
        "linkCode": code.code,
        "liaisonMode": "difference",
        "liaisonNumeratorCodes": list(revenue_codes),
        "liaisonDenominatorCodes": list(expense_codes),
        "liaisonSumCodes": [],
        "defineMapping": False,
        "isComputedNetIncome": True,
        "showInDetail": True,
        "indent": True,
    }


def apply_computed_net_income_row_fields(
    row: dict,
    revenue_codes: list[str],
    expense_codes: list[str],
) -> dict:
    """Force CAP-C.1 shape: REV(CT) − charges, non-mappable."""
    out = dict(row)
    out["linkCode"] = NET_INCOME_BALANCE_LINK_CODE
    out["id"] = NET_INCOME_BALANCE_LINK_CODE
    out["liaisonMode"] = "difference"
    out["liaisonNumeratorCodes"] = list(revenue_codes)
    out["liaisonDenominatorCodes"] = list(expense_codes)
    out["liaisonSumCodes"] = []
    out["defineMapping"] = False
    out["isComputedNetIncome"] = True
    out["showInDetail"] = True
    if not str(out.get("label") or "").strip():
        out["label"] = "Bénéfice net"
    out.setdefault("indent", True)
    return out


def _is_cap_c_group_header(row: dict) -> bool:
    lc = str(row.get("linkCode") or "").strip()
    if lc == "CAP-C":
        return True
    lab = str(row.get("label") or "").strip().lower()
    if not lab:
        return False
    if row.get("isSection") and ("cap-c" in lab or lab.startswith("groupe cap")):
        return True
    return False


def _insert_index_for_cap_c1(structure: list[dict]) -> int:
    """Place CAP-C.1 as first child under CAP-C / Groupe CAP-C, else under Capitaux propres."""
    for i, row in enumerate(structure):
        if _is_cap_c_group_header(row):
            return i + 1
    for i, row in enumerate(structure):
        lab = str(row.get("label") or "").strip().lower()
        if "capitaux propres" in lab and not str(row.get("linkCode") or "").strip():
            return i + 1
    return len(structure)


def ensure_net_income_in_balance_structure(structure: list[dict], db: "Session") -> list[dict]:
    """Normalize CAP-C.1 and ensure it appears under CAP-C in the BS structure."""
    from app.models.standard_link_code import StandardLinkCode

    revenue_codes, expense_codes = income_statement_net_income_code_split(db)
    found = False

    def walk(rows: list[dict]) -> list[dict]:
        nonlocal found
        out: list[dict] = []
        for raw in rows:
            row = dict(raw)
            nested = row.get("children") or row.get("detailRows")
            if isinstance(nested, list) and nested:
                row["children"] = walk([dict(c) for c in nested])
                row.pop("detailRows", None)
            lc = str(row.get("linkCode") or "").strip()
            row_id = str(row.get("id") or "").strip()
            if (
                is_computed_net_income_link_code(lc)
                or is_computed_net_income_link_code(row_id)
                or row.get("isComputedNetIncome")
            ):
                found = True
                row = apply_computed_net_income_row_fields(row, revenue_codes, expense_codes)
            out.append(row)
        return out

    next_struct = walk([dict(r) for r in structure])
    if found:
        return next_struct

    code_row = (
        db.query(StandardLinkCode)
        .filter(StandardLinkCode.code == NET_INCOME_BALANCE_LINK_CODE)
        .first()
    )
    if code_row is None:
        return next_struct

    ni_row = build_net_income_balance_structure_row(code_row, revenue_codes, expense_codes)
    idx = _insert_index_for_cap_c1(next_struct)
    next_struct.insert(idx, ni_row)
    return next_struct
