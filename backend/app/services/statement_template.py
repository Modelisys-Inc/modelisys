"""Build CompanyStatementStructure JSON from the global standard_link_codes table.

Used when creating a new company so the financial computation engine works
out-of-the-box with the standardized chart of accounts.

Falls back to the legacy DEFAULT_* constants if the table is empty (e.g., during
tests that don't seed the table).
"""
from __future__ import annotations

from collections import defaultdict
from itertools import groupby
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
    return grouped


def _rows_for_family(codes: list) -> list[dict]:
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
            # Leaf node → assignable row
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
        rows.extend(_rows_for_family(cap))
    rows.append({"label": "Total des capitaux propres", "isBold": True})
    rows.append({"label": ""})
    rows.append({"label": "Total du passif et des capitaux propres", "isBold": True, "isResult": True})

    return rows


def build_all_structures(db: "Session") -> dict[str, list]:
    """Return income-statement, balance-sheet, and cash-flow structures.

    Cash-flow is currently not derivable from standard codes alone (it requires
    balance-sheet deltas at runtime), so we return the existing default.
    """
    from app.services.statement_structure_defaults import DEFAULT_CASH_FLOW

    return {
        "income-statement": build_income_statement(db),
        "balance-sheet": build_balance_sheet(db),
        "cash-flow": DEFAULT_CASH_FLOW,
    }
