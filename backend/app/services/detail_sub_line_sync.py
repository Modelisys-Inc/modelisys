"""Align detail-only annex sub-lines with the standard chart before statement compute.

Mirrors frontend ``syncDetailSubLinesFromStandard`` so Bilan / Compte de résultat
Détail rows (e.g. ACT-C.2) receive computed amounts from account mapping + TB.
"""

from __future__ import annotations

import copy
import uuid
from typing import TYPE_CHECKING

from app.services.statement_template import standard_link_code_display_label
from app.services.standard_link_code_utils import (
    BALANCE_SHEET_FAMILIES,
    NET_INCOME_SUM_FAMILIES,
)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def _normalize_annex_letter(raw) -> str:
    return str(raw or "").strip().upper()[:8]


def _is_structure_row_empty_label(row: dict) -> bool:
    return str(row.get("label") or "").strip() == ""


def _is_structure_row_detail_only(row: dict) -> bool:
    return bool(row.get("detailOnly"))


def _is_structure_row_hidden(row: dict) -> bool:
    return bool(row.get("hidden"))


def _is_code_mapping_enabled(row: dict) -> bool:
    if _is_structure_row_empty_label(row):
        return False
    if _is_structure_row_hidden(row):
        return False
    if row.get("defineMapping") is False:
        return False
    if row.get("defineMapping") is True:
        return True
    has_link = bool(str(row.get("linkCode") or "").strip())
    has_annex = bool(str(row.get("annexLetter") or "").strip())
    return has_link or has_annex


def _is_show_in_detail(row: dict) -> bool:
    if _is_structure_row_empty_label(row) or _is_structure_row_hidden(row):
        return False
    if row.get("showInDetail") is False:
        return False
    if row.get("showInDetail") is True:
        return True
    return _is_code_mapping_enabled(row)


def _is_summary_row_visible_in_detail(row: dict) -> bool:
    if _is_structure_row_empty_label(row) or _is_structure_row_hidden(row):
        return False
    if _is_structure_row_detail_only(row):
        return False
    return _is_show_in_detail(row)


def _list_annex_letters_for_detail_sub_lines(structure: list[dict]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for row in structure:
        if _is_structure_row_empty_label(row):
            continue
        if _is_structure_row_detail_only(row):
            continue
        if not _is_code_mapping_enabled(row):
            continue
        letter = _normalize_annex_letter(row.get("annexLetter"))
        if not letter or letter in seen:
            continue
        seen.add(letter)
        out.append(letter)
    return out


def _get_summary_annex_parent_link_code(structure: list[dict], letter: str) -> str:
    target = _normalize_annex_letter(letter)
    for row in structure:
        if _is_structure_row_detail_only(row):
            continue
        if _is_structure_row_empty_label(row):
            continue
        if not _is_show_in_detail(row):
            continue
        if _normalize_annex_letter(row.get("annexLetter")) != target:
            continue
        return str(row.get("linkCode") or "").strip()
    return ""


def _find_structure_insert_index_after_annex_contiguous_block(
    structure: list[dict], letter: str,
) -> int:
    target = _normalize_annex_letter(letter)
    if not target:
        return -1

    anchor = -1
    for i, row in enumerate(structure):
        if _is_structure_row_detail_only(row):
            continue
        if _normalize_annex_letter(row.get("annexLetter")) == target:
            anchor = i
            break
    if anchor < 0:
        for i, row in enumerate(structure):
            if _normalize_annex_letter(row.get("annexLetter")) == target:
                anchor = i
                break
    if anchor < 0:
        return -1

    last = anchor
    for i in range(anchor + 1, len(structure)):
        if _normalize_annex_letter(structure[i].get("annexLetter")) == target:
            last = i
        else:
            break
    return last


def _sort_codes_hierarchically(codes: list) -> list:
    by_code = {c.code: c for c in codes}
    children_by_parent: dict[str | None, list] = {}
    for code in codes:
        parent = code.parent_code if code.parent_code and code.parent_code in by_code else None
        children_by_parent.setdefault(parent, []).append(code)
    for siblings in children_by_parent.values():
        siblings.sort(key=lambda c: (c.sort_order, c.code))

    result: list = []
    visited: set[str] = set()

    def walk(parent: str | None) -> None:
        for child in children_by_parent.get(parent, []):
            if child.code in visited:
                continue
            visited.add(child.code)
            result.append(child)
            walk(child.code)

    walk(None)
    for code in sorted(codes, key=lambda c: (c.sort_order, c.code)):
        if code.code not in visited:
            visited.add(code.code)
            result.append(code)
            walk(code.code)
    return result


def _get_revenue_family_grouping_parents(codes: list) -> list:
    return _sort_codes_hierarchically([
        c for c in codes
        if c.family == "REV"
        and getattr(c, "is_active", True) is not False
        and not c.is_leaf
        and not (c.parent_code or "").strip()
    ])


def _get_leaf_descendants_of_standard_link_code(parent_code: str, codes: list) -> list:
    parent = parent_code.strip()
    if not parent:
        return []

    if any(c.code == parent for c in codes):
        leaves: list = []

        def walk(code: str) -> None:
            for child in codes:
                if child.parent_code != code:
                    continue
                if child.is_leaf:
                    leaves.append(child)
                else:
                    walk(child.code)

        walk(parent)
        return _sort_codes_hierarchically(leaves)

    family = parent.upper()
    if family in NET_INCOME_SUM_FAMILIES or family in BALANCE_SHEET_FAMILIES:
        family_leaves = [
            c for c in codes
            if c.family == family and c.is_leaf and getattr(c, "is_active", True) is not False
        ]
        return _sort_codes_hierarchically(family_leaves)
    return []


def _get_detail_sub_line_codes_from_standard(parent_code: str, codes: list) -> list:
    parent = parent_code.strip()
    if not parent:
        return []
    if parent == "REV" and not any(c.code == "REV" for c in codes):
        return _get_revenue_family_grouping_parents(codes)
    return _get_leaf_descendants_of_standard_link_code(parent, codes)


def _detail_sub_line_liaison_from_standard_target(target, codes: list) -> dict:
    if not target.is_leaf:
        leaf_codes = [c.code for c in _get_leaf_descendants_of_standard_link_code(target.code, codes)]
        if leaf_codes:
            return {
                "linkCode": target.code,
                "liaisonMode": "sum",
                "liaisonSumCodes": leaf_codes,
            }
    return {"linkCode": target.code, "liaisonMode": "single"}


def _new_detail_sub_line_row(annex_letter: str, *, label: str, link_code: str) -> dict:
    letter = _normalize_annex_letter(annex_letter)
    code = link_code.strip()
    return {
        "id": code or f"detail-{uuid.uuid4()}",
        "label": label,
        "detailOnly": True,
        "hidden": False,
        "defineMapping": True,
        "showInDetail": True,
        "linkCode": code,
        "annexLetter": letter,
        "indent": True,
    }


def sync_detail_sub_lines_from_standard(db: Session, structure: list[dict]) -> list[dict]:
    """Return a copy of *structure* with annex detail sub-lines synced from the global chart."""
    from app.models.standard_link_code import StandardLinkCode

    standard_codes = (
        db.query(StandardLinkCode)
        .filter(StandardLinkCode.is_active.isnot(False))
        .order_by(StandardLinkCode.sort_order)
        .all()
    )
    if not standard_codes:
        return structure

    next_rows = copy.deepcopy(structure)
    owner_indices = [
        i
        for i, row in enumerate(next_rows)
        if _is_summary_row_visible_in_detail(row) and _normalize_annex_letter(row.get("annexLetter"))
    ]

    for owner_idx in reversed(owner_indices):
        owner = next_rows[owner_idx]
        letter = _normalize_annex_letter(owner.get("annexLetter"))
        parent_code = str(owner.get("linkCode") or "").strip()
        if not letter or not parent_code:
            continue

        expected_targets = _get_detail_sub_line_codes_from_standard(parent_code, standard_codes)
        expected_codes = {t.code for t in expected_targets}

        existing_by_code: dict[str, dict] = {}
        block_end = owner_idx
        for i in range(owner_idx + 1, len(next_rows)):
            row = next_rows[i]
            if _is_structure_row_empty_label(row) or not _is_structure_row_detail_only(row):
                break
            block_end = i
            code = str(row.get("linkCode") or "").strip()
            if code and code in expected_codes and code not in existing_by_code:
                existing_by_code[code] = row

        ordered_rows: list[dict] = []
        for target in expected_targets:
            label = standard_link_code_display_label(target)
            liaison = _detail_sub_line_liaison_from_standard_target(target, standard_codes)
            existing = existing_by_code.get(target.code)
            if existing:
                ordered_rows.append({
                    **existing,
                    "label": label,
                    **liaison,
                    "defineMapping": True,
                    "showInDetail": True,
                    "detailOnly": True,
                    "annexLetter": letter,
                    "indent": True,
                })
            else:
                ordered_rows.append({
                    **_new_detail_sub_line_row(letter, label=label, link_code=liaison["linkCode"]),
                    **liaison,
                })

        next_rows = next_rows[: owner_idx + 1] + ordered_rows + next_rows[block_end + 1 :]

    return next_rows
