"""Nettoyage de la structure JSON du compte de résultats (lignes obsolètes)."""


def _norm_label(s: str) -> str:
    return " ".join(s.lower().split())


def _is_obsolete_produits_a_label(label: str) -> bool:
    n = _norm_label(label)
    if not n:
        return False
    if n in ("produit a", "produits a"):
        return True
    if "produit" in n and n.endswith(" a"):
        return True
    return False


def strip_obsolete_income_statement_structure_rows(structure: list) -> list:
    """Retire les lignes « Produits A » / « Produit A » (récursif : children, detailRows)."""

    def clean_block(rows: list) -> list:
        out: list = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            lab = str(row.get("label") or "")
            if _is_obsolete_produits_a_label(lab):
                continue
            new_row = dict(row)
            for key in ("children", "detailRows"):
                if key in new_row and new_row[key]:
                    new_row[key] = clean_block(list(new_row[key]))
            out.append(new_row)
        return out

    return clean_block(list(structure or []))
