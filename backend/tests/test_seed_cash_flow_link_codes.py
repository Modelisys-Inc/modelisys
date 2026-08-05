"""Le générateur des codes Trésorerie doit partitionner le bilan, pas le recouvrir.

Les colonnes FT de MO.xlsx décrivent la section et la ligne de flux de chaque poste.
Un parent porte une étiquette et certains de ses enfants en portent une autre —
`ALT-B` les acquisitions, `ALT-B.12` l'amortissement cumulé. Chaque feuille doit
donc revenir à son étiquette **la plus proche**, exactement une fois : un poste
compté deux fois gonfle une section, un poste oublié empêche l'état de balancer.
"""

import uuid

import pytest

from app.models.standard_link_code import StandardLinkCode
from app.scripts.seed_cash_flow_link_codes import (
    apply_cash_flow_records,
    build_cash_flow_records,
)

EXPLOITATION = "Activités d'exploitation"
INVESTISSEMENT = "Activités d'investissement"


def _code(db, code, family, *, parent=None, leaf=True, ft_cat=None, ft_line=None, order=0):
    db.add(StandardLinkCode(
        id=uuid.uuid4(), code=code, family=family, parent_code=parent,
        label_sub_account=code, is_leaf=leaf, sort_order=order,
        ft_category=ft_cat, ft_line_item=ft_line, is_active=True,
    ))


@pytest.fixture
def chart(db):
    """Immobilisations : le parent porte les acquisitions, un enfant l'amortissement."""
    _code(db, "ALT-B", "ALT", leaf=False, order=1,
          ft_cat=INVESTISSEMENT, ft_line="Acquisitions - Immobilisations")
    _code(db, "ALT-B.1", "ALT", parent="ALT-B", order=2)
    _code(db, "ALT-B.2", "ALT", parent="ALT-B", order=3)
    _code(db, "ALT-B.12", "ALT", parent="ALT-B", order=4,
          ft_cat=EXPLOITATION, ft_line="Ajustements")
    _code(db, "ACT-C", "ACT", order=5,
          ft_cat=EXPLOITATION, ft_line="Variation des éléments hors caisse")
    # La trésorerie elle-même : marquée, mais sans section — c'est le résultat.
    _code(db, "ACT-A", "ACT", order=6, ft_line="= lié à Encaisse de fin")
    db.commit()
    return db


def test_each_leaf_lands_on_its_nearest_tag(chart):
    records = {r["line_item"]: r for r in build_cash_flow_records(chart)}

    # Les sous-comptes de coût suivent leur parent...
    assert set(records["Acquisitions - Immobilisations"]["codes"]) == {"ALT-B.1", "ALT-B.2"}
    # ...mais l'amortissement cumulé garde sa propre ligne.
    assert records["Ajustements"]["codes"] == ["ALT-B.12"]


def test_no_leaf_is_counted_twice(chart):
    tous = [code for r in build_cash_flow_records(chart) for code in r["codes"]]
    assert len(tous) == len(set(tous)), f"poste compté plusieurs fois : {tous}"


def test_cash_itself_is_never_a_cause_of_variation(chart):
    tous = {code for r in build_cash_flow_records(chart) for code in r["codes"]}
    assert "ACT-A" not in tous
    # Le parent non assignable ne doit pas non plus apparaître à côté de ses feuilles.
    assert "ALT-B" not in tous


def test_ft_category_maps_to_the_right_family(chart):
    familles = {r["line_item"]: r["family"] for r in build_cash_flow_records(chart)}
    assert familles["Acquisitions - Immobilisations"] == "TIN"
    assert familles["Ajustements"] == "TEX"
    assert familles["Variation des éléments hors caisse"] == "TEX"


def test_rerun_updates_attachments_without_renumbering(chart):
    """Les structures d'états enregistrées référencent ces codes : ils doivent être stables."""
    premier = apply_cash_flow_records(chart, build_cash_flow_records(chart))
    chart.commit()
    assert len(premier["created"]) == 3

    codes_initiaux = {
        (c.family, c.label_sub_account): c.code
        for c in chart.query(StandardLinkCode).filter(
            StandardLinkCode.family.in_(["TEX", "TIN", "TFI"])).all()
    }

    # Un nouveau sous-compte de coût apparaît dans la charte.
    _code(chart, "ALT-B.3", "ALT", parent="ALT-B", order=9)
    chart.commit()

    second = apply_cash_flow_records(chart, build_cash_flow_records(chart))
    chart.commit()
    assert second["created"] == [], "aucun code ne doit être recréé"

    codes_apres = {
        (c.family, c.label_sub_account): c.code
        for c in chart.query(StandardLinkCode).filter(
            StandardLinkCode.family.in_(["TEX", "TIN", "TFI"])).all()
    }
    assert codes_apres == codes_initiaux, "les codes ont été renumérotés"

    acquisitions = next(
        c for c in chart.query(StandardLinkCode).filter(
            StandardLinkCode.family == "TIN").all()
    )
    assert "ALT-B.3" in acquisitions.attached_link_codes
