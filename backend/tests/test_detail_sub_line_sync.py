"""Sync des sous-lignes d’annexe : pas de doublon si la lettre a été perdue."""

from app.services.detail_sub_line_sync import sync_detail_sub_lines_from_standard


class _Code:
    def __init__(self, code, family, parent_code, is_leaf, sort_order, label):
        self.code = code
        self.family = family
        self.parent_code = parent_code
        self.is_leaf = is_leaf
        self.sort_order = sort_order
        self.is_active = True
        self.label_sub_account = label
        self.label_account = None


class _Query:
    def __init__(self, rows):
        self._rows = rows

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def all(self):
        return self._rows


class _Db:
    def __init__(self, rows):
        self._rows = rows

    def query(self, model):
        return _Query(self._rows)


def test_sync_does_not_duplicate_orphan_detail_only_without_annex_letter():
    chart = [
        _Code("CMV", "CMV", None, False, 1, "CMV"),
        _Code("CMV.1", "CMV", "CMV", True, 2, "Stocks au début"),
        _Code("CMV.3", "CMV", "CMV", True, 3, "Achats"),
    ]
    db = _Db(chart)

    structure = [
        {
            "id": "owner",
            "label": "Coûts des produits vendus",
            "defineMapping": True,
            "showInDetail": True,
            "annexLetter": "B",
            "linkCode": "CMV",
            "liaisonMode": "single",
        },
        {
            "id": "hidden-stock",
            "label": "Stocks au début",
            "detailOnly": True,
            "hidden": True,
            "annexLetter": "B",
            "linkCode": "CMV.1",
        },
        {
            "id": "achats-uuid",
            "label": "Achats",
            "detailOnly": True,
            "annexLetter": "",
            "linkCode": "CMV.3",
        },
    ]

    out = sync_detail_sub_lines_from_standard(db, structure)
    leaves = [r for r in out if r.get("detailOnly")]
    codes = [r.get("linkCode") for r in leaves]
    assert codes.count("CMV.3") == 1
    assert codes.count("CMV.1") == 1
    achats = next(r for r in leaves if r.get("linkCode") == "CMV.3")
    assert achats["id"] == "achats-uuid"
    assert achats["annexLetter"] == "B"


def test_sync_attaches_adm_leaves_to_visible_adm_not_hidden_exp():
    chart = [
        _Code("EXP", "EXP", None, False, 1, "EXP"),
        _Code("EXP.1", "EXP", "EXP", True, 2, "Salaires EXP"),
        _Code("ADM", "ADM", None, False, 3, "ADM"),
        _Code("ADM.12", "ADM", "ADM", True, 4, "Honoraires"),
    ]
    structure = [
        {
            "id": "exp",
            "label": "Frais d'exploitation",
            "hidden": True,
            "showInDetail": False,
            "defineMapping": False,
            "annexLetter": "C",
            "linkCode": "EXP",
        },
        {
            "id": "exp1",
            "label": "Salaires EXP",
            "detailOnly": True,
            "hidden": True,
            "annexLetter": "C",
            "linkCode": "EXP.1",
        },
        {
            "id": "adm",
            "label": "Frais d'administration",
            "defineMapping": True,
            "showInDetail": True,
            "annexLetter": "C",
            "linkCode": "ADM",
        },
        {
            "id": "hon",
            "label": "Honoraires",
            "detailOnly": True,
            "annexLetter": "",
            "linkCode": "ADM.12",
        },
    ]
    out = sync_detail_sub_lines_from_standard(_Db(chart), structure)
    assert out[0]["id"] == "exp"
    assert out[1]["id"] == "exp1"
    adm_i = next(i for i, r in enumerate(out) if r.get("id") == "adm")
    adm_leaves = [r for r in out if r.get("linkCode") == "ADM.12"]
    assert len(adm_leaves) == 1
    assert out[adm_i + 1]["linkCode"] == "ADM.12"
    assert out[adm_i + 1]["annexLetter"] == "C"
