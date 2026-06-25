"""Build CompanyStatementStructure JSON from the global standard_link_codes table.

Used when creating a new company so the financial computation engine works
out-of-the-box with the standardized chart of accounts.

Falls back to the legacy DEFAULT_* constants if the table is empty (e.g., during
tests that don't seed the table).
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


# ─── family metadata ──────────────────────────────────────────────────────────

_INCOME_FAMILIES = ["REV", "CMV", "EXP", "ADM", "VNT", "FIN", "AUT", "IMP"]
_BALANCE_FAMILIES = ["ACT", "ALT", "PCT", "PLT", "CAP"]

_FAMILY_SECTION_LABEL: dict[str, str] = {
    "REV": "Chiffre d'affaires",
    "CMV": "Coûts des produits vendus",
    "EXP": "Frais d'exploitation",
    "ADM": "Frais d'administration",
    "VNT": "Frais de vente",
    "FIN": "Frais financiers",
    "AUT": "Autres dépenses (produits)",
    "IMP": "Impôts",
    "ACT": "Actif à court terme",
    "ALT": "Actif à long terme",
    "PCT": "Passif à court terme",
    "PLT": "Passif à long terme",
    "CAP": "Capitaux propres",
}

_BALANCE_SECTIONS = {
    "ACT": {"label": "Actif", "isBold": True, "isSection": True},
    "ALT": None,  # no extra section header; ALT follows ACT under "Actif"
    "PCT": {"label": "Passif", "isBold": True, "isSection": True},
    "PLT": None,
    "CAP": {"label": "Capitaux propres", "isBold": True, "isSection": True},
}


# ─── builder ──────────────────────────────────────────────────────────────────

def sort_codes_hierarchically(codes: list) -> list:
    """Return codes in depth-first order (parent, then children)."""
    if not codes:
        return []

    by_code = {c.code: c for c in codes}
    children: dict[str | None, list] = defaultdict(list)
    for c in codes:
        parent = c.parent_code if c.parent_code in by_code else None
        children[parent].append(c)

    for siblings in children.values():
        siblings.sort(key=lambda c: (c.sort_order, c.code))

    result: list = []
    visited: set[str] = set()

    def walk(parent: str | None) -> None:
        for child in children.get(parent, []):
            if child.code in visited:
                continue
            visited.add(child.code)
            result.append(child)
            walk(child.code)

    walk(None)

    for c in sorted(codes, key=lambda x: (x.sort_order, x.code)):
        if c.code not in visited:
            visited.add(c.code)
            result.append(c)
            walk(c.code)

    return result


from app.services.standard_link_code_utils import (
    NET_INCOME_BALANCE_LINK_CODE,
    build_net_income_balance_structure_row,
    income_statement_leaf_codes_for_net_income,
)


def _codes_by_family(db: "Session") -> dict[str, list]:
    from app.models.standard_link_code import StandardLinkCode

    rows = (
        db.query(StandardLinkCode)
        .order_by(StandardLinkCode.sort_order)
        .all()
    )
    grouped: dict[str, list] = defaultdict(list)
    for r in rows:
        grouped[r.family].append(r)
    for family in grouped:
        grouped[family] = sort_codes_hierarchically(grouped[family])
    return grouped


def _rows_for_family(codes: list, *, db: "Session | None" = None) -> list[dict]:
    """Build statement structure rows for one family (e.g. all EXP codes).

    Parent codes (is_leaf=False) become indented section sub-headers.
    Leaf codes become assignable linkCode rows.
    """
    rows: list[dict] = []

    # Index children by parent_code
    children_of: dict[str | None, list] = defaultdict(list)
    for c in codes:
        children_of[c.parent_code].append(c)

    # Top-level codes within the family (parent_code is None or not in this family)
    family = codes[0].family if codes else ""
    top_level = [c for c in codes if c.parent_code is None]

    net_income_sum_codes: list[str] | None = None
    if db is not None:
        net_income_sum_codes = income_statement_leaf_codes_for_net_income(db)

    def _emit(code, depth: int = 0):
        indent = depth > 0
        children = children_of.get(code.code, [])
        if children:
            # Parent node → visual sub-section header, no linkCode
            rows.append({
                "label": code.label_account or code.label_sub_account or code.code,
                "isSection": True,
                "indent": True,
            })
            for child in children:
                _emit(child, depth + 1)
        else:
            if code.code == NET_INCOME_BALANCE_LINK_CODE and net_income_sum_codes is not None:
                rows.append(
                    build_net_income_balance_structure_row(code, net_income_sum_codes)
                )
            else:
                rows.append({
                    "label": code.label_sub_account or code.label_account or code.code,
                    "linkCode": code.code,
                    "indent": indent or True,
                })

    for top in top_level:
        _emit(top)

    return rows


def build_income_statement(db: "Session") -> list[dict]:
    """Return a complete income-statement structure seeded with standard codes."""
    from app.services.statement_structure_defaults import DEFAULT_INCOME_STATEMENT

    by_family = _codes_by_family(db)
    if not any(f in by_family for f in _INCOME_FAMILIES):
        return DEFAULT_INCOME_STATEMENT

    rows: list[dict] = []

    # Revenue
    rev = by_family.get("REV", [])
    if rev:
        rows.append({"label": _FAMILY_SECTION_LABEL["REV"], "isBold": True, "isSection": True})
        rows.extend(_rows_for_family(rev))
        rows.append({"label": ""})

    # COGS
    cmv = by_family.get("CMV", [])
    if cmv:
        rows.append({"label": _FAMILY_SECTION_LABEL["CMV"], "isBold": True, "isSection": True})
        rows.extend(_rows_for_family(cmv))

    rows.append({"label": "Bénéfice brut", "isBold": True, "isResult": True})
    rows.append({"label": ""})

    # Operating expenses (EXP, ADM, VNT)
    exp_families = ["EXP", "ADM", "VNT"]
    has_exp = any(f in by_family for f in exp_families)
    if has_exp:
        rows.append({"label": "Charges d'exploitation", "isBold": True, "isSection": True})
        for fam in exp_families:
            codes = by_family.get(fam, [])
            if codes:
                rows.append({
                    "label": _FAMILY_SECTION_LABEL[fam],
                    "isSection": True,
                    "indent": True,
                })
                rows.extend(_rows_for_family(codes))
        rows.append({"label": "Total des charges", "isBold": True})
        rows.append({"label": ""})

    # Financial & other
    for fam in ["FIN", "AUT"]:
        codes = by_family.get(fam, [])
        if codes:
            rows.append({"label": _FAMILY_SECTION_LABEL[fam], "isBold": True, "isSection": True})
            rows.extend(_rows_for_family(codes))
            rows.append({"label": ""})

    rows.append({"label": "Bénéfice avant impôts", "isBold": True, "isResult": True})

    # Taxes
    imp = by_family.get("IMP", [])
    if imp:
        rows.append({"label": _FAMILY_SECTION_LABEL["IMP"], "isSection": True, "indent": True})
        rows.extend(_rows_for_family(imp))

    rows.append({"label": "Bénéfice net", "isBold": True, "isNetIncome": True})
    rows.append({"label": ""})
    rows.append({"label": "BAIIA", "isBold": True, "isEBITA": True})

    return rows


def build_balance_sheet(db: "Session") -> list[dict]:
    """Return a complete balance-sheet structure seeded with standard codes."""
    from app.services.statement_structure_defaults import DEFAULT_BALANCE_SHEET

    by_family = _codes_by_family(db)
    if not any(f in by_family for f in _BALANCE_FAMILIES):
        return DEFAULT_BALANCE_SHEET

    rows: list[dict] = []

    # Assets (ACT + ALT)
    rows.append({"label": "Actif", "isBold": True, "isSection": True})
    for fam in ["ACT", "ALT"]:
        codes = by_family.get(fam, [])
        if codes:
            rows.append({"label": _FAMILY_SECTION_LABEL[fam], "isSection": True, "indent": True})
            rows.extend(_rows_for_family(codes))
    rows.append({"label": "Total de l'actif", "isBold": True, "isResult": True})
    rows.append({"label": ""})

    # Liabilities (PCT + PLT)
    rows.append({"label": "Passif", "isBold": True, "isSection": True})
    for fam in ["PCT", "PLT"]:
        codes = by_family.get(fam, [])
        if codes:
            rows.append({"label": _FAMILY_SECTION_LABEL[fam], "isSection": True, "indent": True})
            rows.extend(_rows_for_family(codes))
    rows.append({"label": "Total du passif", "isBold": True})
    rows.append({"label": ""})

    # Equity (CAP)
    rows.append({"label": "Capitaux propres", "isBold": True, "isSection": True})
    cap = by_family.get("CAP", [])
    if cap:
        rows.extend(_rows_for_family(cap, db=db))
    rows.append({"label": "Total des capitaux propres", "isBold": True})
    rows.append({"label": ""})
    rows.append({"label": "Total du passif et des capitaux propres", "isBold": True, "isResult": True})

    return rows


_FT_CATEGORY_SECTION_LABELS: dict[str, str] = {
    "TEX": "Flux de trésorerie liés à l'exploitation",
    "TIN": "Flux de trésorerie liés aux activités d'investissement",
    "TFI": "Flux de trésorerie liés aux activités de financement",
}

_CASH_FLOW_FAMILY_ORDER = ["TEX", "TIN", "TFI"]


def _cash_flow_codes_by_family(db: "Session") -> dict[str, list]:
    from app.models.standard_link_code import StandardLinkCode

    rows = (
        db.query(StandardLinkCode)
        .filter(StandardLinkCode.family.in_(_CASH_FLOW_FAMILY_ORDER))
        .order_by(StandardLinkCode.sort_order)
        .all()
    )
    grouped: dict[str, list] = defaultdict(list)
    for code in rows:
        grouped[code.family].append(code)
    return grouped


def build_cash_flow(db: "Session") -> list[dict]:
    """Return a cash-flow structure from Trésorerie family codes (TEX, TIN, TFI)."""
    from app.services.statement_structure_defaults import DEFAULT_CASH_FLOW

    by_family = _cash_flow_codes_by_family(db)
    if not any(by_family.get(fam) for fam in _CASH_FLOW_FAMILY_ORDER):
        return DEFAULT_CASH_FLOW

    rows: list[dict] = []
    for family in _CASH_FLOW_FAMILY_ORDER:
        codes = by_family.get(family, [])
        if not codes:
            continue
        rows.append({
            "label": _FT_CATEGORY_SECTION_LABELS[family],
            "isBold": True,
            "isSection": True,
        })
        for code in sort_codes_hierarchically(codes):
            rows.append({
                "label": standard_link_code_display_label(code),
                "linkCode": code.code,
                "indent": True,
            })
        rows.append({"label": ""})

    rows.append({"label": "Variation nette de la trésorerie", "isBold": True, "isResult": True})
    rows.append({"label": ""})
    rows.append({"label": "Trésorerie au début de l'exercice"})
    rows.append({"label": "Trésorerie à la fin de l'exercice", "isBold": True, "isResult": True})
    return rows


def build_all_structures(db: "Session") -> dict[str, list]:
    """Return income-statement, balance-sheet, and cash-flow structures."""
    return {
        "income-statement": build_income_statement(db),
        "balance-sheet": build_balance_sheet(db),
        "cash-flow": build_cash_flow(db),
        "cash-flow-detail": build_cash_flow(db),
    }


def get_default_structure(db: "Session", statement_type: str) -> list[dict]:
    """Return the canonical default structure for a statement type."""
    import copy

    from app.services.statement_structure_defaults import DEFAULT_STRUCTURES

    return copy.deepcopy(DEFAULT_STRUCTURES.get(statement_type, []))


def sync_company_structures_from_standard(db: "Session", company_id: uuid.UUID) -> None:
    """Apply the current global standard link codes chart to one company."""
    from app.models.financial_statement_mapping import CompanyStatementStructure

    structures = build_all_structures(db)
    for stmt_type in ("income-statement", "balance-sheet", "cash-flow", "cash-flow-detail"):
        rows = structures.get(stmt_type, [])
        existing = (
            db.query(CompanyStatementStructure)
            .filter(
                CompanyStatementStructure.company_id == company_id,
                CompanyStatementStructure.statement_type == stmt_type,
            )
            .first()
        )
        if existing:
            existing.structure = rows
        else:
            db.add(
                CompanyStatementStructure(
                    company_id=company_id,
                    statement_type=stmt_type,
                    structure=rows,
                )
            )


def sync_all_companies_from_standard(db: "Session") -> int:
    """Apply the current global standard link codes chart to every company."""
    from app.models.company import Company

    companies = db.query(Company).all()
    for company in companies:
        sync_company_structures_from_standard(db, company.id)
    db.commit()
    return len(companies)


def standard_link_code_display_label(code) -> str:
    """Display label for a standard link code (matches frontend standardLinkCodeDisplayLabel)."""
    sub = (code.label_sub_account or "").strip()
    if sub:
        return sub
    acct = (code.label_account or "").strip()
    if acct:
        return acct
    return code.code


def _normalize_liaison_mode(row: dict) -> str:
    """na | single | sum | difference — aligned with financial_statements and frontend."""
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
    lc = str(row.get("linkCode") or row.get("link_code") or "").strip()
    if lc:
        return "single"
    sc = row.get("liaisonSumCodes") or []
    if isinstance(sc, list) and any(str(x).strip() for x in sc):
        return "sum"
    nums = row.get("liaisonNumeratorCodes") or []
    dens = row.get("liaisonDenominatorCodes") or []
    if isinstance(nums, list) and any(str(x).strip() for x in nums):
        return "difference"
    if isinstance(dens, list) and any(str(x).strip() for x in dens):
        return "difference"
    return "na"


def _should_update_row_label_for_link_code(row: dict, link_code: str) -> bool:
    lc = str(row.get("linkCode") or row.get("link_code") or "").strip()
    if lc != link_code:
        return False
    mode = _normalize_liaison_mode(row)
    return mode in ("single", "na")


def propagate_standard_link_code_label_to_structures(db: "Session", code) -> int:
    """Update structure row labels that reference a single link code across all companies."""
    from datetime import datetime, timezone

    from sqlalchemy.orm.attributes import flag_modified

    from app.models.financial_statement_mapping import CompanyStatementStructure

    link_code = code.code.strip()
    new_label = standard_link_code_display_label(code)
    structures_updated = 0

    for rec in db.query(CompanyStatementStructure).all():
        structure = rec.structure
        if not isinstance(structure, list):
            continue
        changed = False
        for row in structure:
            if not isinstance(row, dict):
                continue
            if not _should_update_row_label_for_link_code(row, link_code):
                continue
            if str(row.get("label") or "").strip() != new_label:
                row["label"] = new_label
                changed = True
        if changed:
            rec.structure = structure
            flag_modified(rec, "structure")
            rec.updated_at = datetime.now(timezone.utc)
            structures_updated += 1

    return structures_updated
