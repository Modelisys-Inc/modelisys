"""Génère les codes Trésorerie (TEX/TIN/TFI) à partir des colonnes FT de la charte.

MO.xlsx décrit déjà, pour chaque poste de bilan, la section de flux et la ligne où
il aboutit (colonnes « Comptes FT » / « Sous-comptes FT »). Ce script transforme
cette description en codes Trésorerie porteurs de leurs ``attached_link_codes`` —
la seule chose que le moteur de calcul lit réellement.

Sans lui, l'étiquetage de MO.xlsx reste de la documentation et l'état des flux
n'affiche rien.

Idempotent : les codes existants sont retrouvés par (famille, libellé), donc une
ré-exécution met à jour les rattachements sans renuméroter les codes déjà utilisés
par les structures d'états enregistrées.

    python -m app.scripts.seed_cash_flow_link_codes [--dry-run]
"""
from __future__ import annotations

import os
import sys
import unicodedata
import uuid

# Ordre de présentation de l'état. Les libellés absents de ces listes sont ajoutés
# ensuite, dans l'ordre de la charte.
_LINE_ORDER: dict[str, list[str]] = {
    "TEX": [
        "Bénéfice net",
        "Ajustements",
        "Variation des éléments hors caisse",
    ],
    "TIN": [
        "Dispositions (Acquisitions) nettes - Placements",
        "Dispositions (Acquisitions) nettes - Immobilisations corporelles",
        "Dispositions (Acquisitions) nettes - Actifs incorporels",
    ],
    "TFI": [
        "Variation nette de l'emprunt bancaire",
        "Ajout (Remboursement) de la dette à long terme",
        "Ajout (Remboursement) du billet à payer",
        "Remboursement d'obligations de location-acquisition",
        "Variation nette des avances",
        "Émission (Rachat) d'actions",
        "Versement de dividendes",
        "Variation nette du solde des impôts remboursable au titre de dividendes",
    ],
}


def _normalize(text: str) -> str:
    stripped = unicodedata.normalize("NFD", str(text or "").strip().lower())
    return "".join(c for c in stripped if unicodedata.category(c) != "Mn")


def _family_for_ft_category(ft_category: str | None) -> str | None:
    """« Activités d'exploitation » → TEX, etc."""
    normalized = _normalize(ft_category)
    if not normalized:
        return None
    if "exploitation" in normalized:
        return "TEX"
    if "investissement" in normalized:
        return "TIN"
    if "financement" in normalized:
        return "TFI"
    return None


def _owning_tag(record, by_code: dict) -> tuple[str, str] | None:
    """(famille, ligne) de l'étiquette FT la plus proche : le code lui-même ou un parent.

    C'est ce qui empêche le double comptage : ``ALT-B`` porte les acquisitions et
    ``ALT-B.12`` l'amortissement cumulé, donc ``ALT-B.12`` appartient à sa propre
    ligne et non à celle de son parent.
    """
    current = record
    seen: set[str] = set()
    while current is not None and current.code not in seen:
        seen.add(current.code)
        family = _family_for_ft_category(current.ft_category)
        line_item = str(current.ft_line_item or "").strip()
        if family and line_item:
            return family, line_item
        current = by_code.get(current.parent_code) if current.parent_code else None
    return None


def _line_sort_key(family: str, line_item: str, chart_order: int) -> tuple[int, int]:
    order = _LINE_ORDER.get(family, [])
    normalized = [_normalize(x) for x in order]
    try:
        return (normalized.index(_normalize(line_item)), 0)
    except ValueError:
        return (len(order), chart_order)


def build_cash_flow_records(session) -> list[dict]:
    """(famille, libellé, codes rattachés) pour chaque ligne de l'état des flux."""
    from app.models.standard_link_code import StandardLinkCode
    from app.services.standard_link_code_utils import (
        BILAN_CDR_FAMILIES,
        is_computed_net_income_link_code,
    )

    rows = (
        session.query(StandardLinkCode)
        .filter(StandardLinkCode.is_active.is_(True))
        .order_by(StandardLinkCode.sort_order)
        .all()
    )
    by_code = {r.code: r for r in rows}

    grouped: dict[tuple[str, str], dict] = {}
    for record in rows:
        if record.family not in BILAN_CDR_FAMILIES:
            continue
        # Seules les feuilles portent des comptes ; CAP-C.1 est calculé mais se
        # rattache quand même (le moteur le reconnaît).
        if not record.is_leaf and not is_computed_net_income_link_code(record.code):
            continue
        tag = _owning_tag(record, by_code)
        if tag is None:
            continue
        entry = grouped.setdefault(
            tag, {"family": tag[0], "line_item": tag[1], "codes": [], "chart_order": record.sort_order}
        )
        entry["codes"].append(record.code)

    records = list(grouped.values())
    records.sort(
        key=lambda e: (
            ["TEX", "TIN", "TFI"].index(e["family"]),
            _line_sort_key(e["family"], e["line_item"], e["chart_order"]),
        )
    )
    return records


def apply_cash_flow_records(session, records: list[dict]) -> dict:
    """Upsert les codes Trésorerie. Retourne un résumé. L'appelant commite."""
    from app.models.standard_link_code import StandardLinkCode

    existing = (
        session.query(StandardLinkCode)
        .filter(StandardLinkCode.family.in_(["TEX", "TIN", "TFI"]))
        .all()
    )
    by_label = {
        (r.family, _normalize(r.label_sub_account or r.label_account or "")): r
        for r in existing
    }
    taken = {r.code for r in existing}

    def next_code(family: str) -> str:
        index = 1
        while f"{family}-{index:02d}" in taken:
            index += 1
        code = f"{family}-{index:02d}"
        taken.add(code)
        return code

    created, updated, unchanged = [], [], []
    for order, rec in enumerate(records, start=1):
        key = (rec["family"], _normalize(rec["line_item"]))
        obj = by_label.get(key)
        if obj is None:
            obj = StandardLinkCode(
                id=uuid.uuid4(),
                code=next_code(rec["family"]),
                family=rec["family"],
                label_sub_account=rec["line_item"],
                is_leaf=True,
            )
            session.add(obj)
            created.append(obj.code)
        elif list(obj.attached_link_codes or []) != rec["codes"]:
            updated.append(obj.code)
        else:
            unchanged.append(obj.code)
        obj.attached_link_codes = rec["codes"]
        obj.sort_order = order
        obj.is_active = True
        obj.deprecated_at = None

    stale = [
        r.code
        for r in existing
        if (r.family, _normalize(r.label_sub_account or r.label_account or "")) not in
        {(rec["family"], _normalize(rec["line_item"])) for rec in records}
    ]
    return {"created": created, "updated": updated, "unchanged": unchanged, "stale": stale}


def seed(db_url: str | None = None, dry_run: bool = False) -> None:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    if db_url is None:
        try:
            from app.config import settings
            db_url = settings.database_url
        except Exception:
            db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            print("ERROR: DATABASE_URL not set")
            sys.exit(1)

    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("+asyncpg", "")
    engine = create_engine(sync_url)

    with Session(engine) as session:
        records = build_cash_flow_records(session)
        if not records:
            print(
                "Aucune ligne de flux trouvée. La charte a-t-elle été seedée "
                "(python -m app.scripts.seed_standard_link_codes) ?"
            )
            return

        print(f"{len(records)} ligne(s) de flux dérivée(s) de la charte :\n")
        for rec in records:
            print(f"  [{rec['family']}] {rec['line_item']}")
            print(f"        {', '.join(rec['codes'])}")

        if dry_run:
            print("\n--dry-run : rien n'a été écrit.")
            return

        summary = apply_cash_flow_records(session, records)
        session.commit()

        print(
            f"\nTerminé : {len(summary['created'])} créé(s), "
            f"{len(summary['updated'])} mis à jour, "
            f"{len(summary['unchanged'])} inchangé(s)."
        )
        if summary["stale"]:
            print(
                "Codes Trésorerie sans équivalent dans la charte (laissés intacts) : "
                + ", ".join(summary["stale"])
            )


if __name__ == "__main__":
    seed(dry_run="--dry-run" in sys.argv)
