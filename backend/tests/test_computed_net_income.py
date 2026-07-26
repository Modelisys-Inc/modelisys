from app.services.standard_link_code_utils import (
    NET_INCOME_BALANCE_LINK_CODE,
    build_cash_flow_link_code_attachments,
    build_cash_flow_virtual_family_link_codes,
    ensure_net_income_in_balance_structure,
    income_statement_leaf_codes_for_net_income,
    is_cash_flow_ft_category_eligible,
    is_cash_flow_virtual_family,
    is_computed_net_income_link_code,
    is_mappable_standard_link_code,
)
from app.services.statement_template import build_balance_sheet


def test_is_computed_net_income_link_code():
    assert is_computed_net_income_link_code("CAP-C.1")
    assert not is_computed_net_income_link_code("CAP-C.2")
    assert not is_mappable_standard_link_code("CAP-C.1", True)
    assert is_mappable_standard_link_code("REV-A.1", True)
    assert not is_mappable_standard_link_code("TEX-1", False, "TEX")


def test_is_cash_flow_ft_category_eligible_is_deprecated():
    class _Db:
        pass

    db = _Db()
    assert not is_cash_flow_ft_category_eligible("REV-A.1", "REV", True, "REV-A", db)
    assert not is_cash_flow_ft_category_eligible("REV-A", "REV", False, None, db)


def test_build_cash_flow_link_code_attachments():
    class _Code:
        def __init__(self, code, family, is_leaf, parent_code, attached_link_codes, sort_order=0):
            self.code = code
            self.family = family
            self.is_leaf = is_leaf
            self.parent_code = parent_code
            self.attached_link_codes = attached_link_codes
            self.sort_order = sort_order

    class _Query:
        def __init__(self, rows):
            self._rows = rows
            self._filter = None

        def filter(self, *args, **kwargs):
            if self._filter is None:
                self._filter = self._rows
            return self

        def order_by(self, *args, **kwargs):
            return self

        def all(self):
            return self._filter if self._filter is not None else self._rows

        def first(self):
            rows = self.all()
            return rows[0] if rows else None

        def scalar(self):
            row = self.first()
            return row.family if row else None

    rows = [
        _Code("REV-X.1", "REV", True, "REV-X", []),
        _Code("REV-X", "REV", False, None, []),
        _Code("CAP-C.2", "CAP", True, "CAP-C", []),
        _Code("TEX-AGG", "TEX", False, None, ["REV-X.1", "CAP-C.2"], sort_order=1),
    ]

    class _Db:
        def query(self, model):
            return _Query(rows)

    assert is_cash_flow_virtual_family("TEX")
    assert is_cash_flow_virtual_family("tin")
    assert not is_cash_flow_virtual_family("REV")

    index = build_cash_flow_link_code_attachments(_Db())
    assert index["TEX-AGG"] == ["REV-X.1", "CAP-C.2"]

    by_family = build_cash_flow_virtual_family_link_codes(_Db())
    assert "REV-X.1" in by_family["TEX"]
    assert "CAP-C.2" in by_family["TEX"]


def test_income_statement_parent_cannot_have_ft_category(client, su_headers):
    create = client.post(
        "/api/standard-link-codes",
        json={
            "code": "REV-PARENT-CF",
            "family": "REV",
            "label_sub_account": "Parent revenus",
            "is_leaf": False,
            "ft_category": "Exploitation",
        },
        headers=su_headers,
    )
    assert create.status_code == 422


def test_income_statement_leaf_cannot_have_ft_category(client, su_headers):
    parent = client.post(
        "/api/standard-link-codes",
        json={
            "code": "REV-P",
            "family": "REV",
            "label_sub_account": "Parent",
            "is_leaf": False,
        },
        headers=su_headers,
    )
    assert parent.status_code == 201

    create = client.post(
        "/api/standard-link-codes",
        json={
            "code": "REV-P.1",
            "family": "REV",
            "parent_code": "REV-P",
            "label_sub_account": "Feuille revenus",
            "is_leaf": True,
            "ft_category": "Investissement",
        },
        headers=su_headers,
    )
    assert create.status_code == 422


def test_cash_flow_code_requires_attached_link_codes(client, su_headers):
    create = client.post(
        "/api/standard-link-codes",
        json={
            "code": "TEX-EMPTY",
            "family": "TEX",
            "label_sub_account": "Sans sources",
        },
        headers=su_headers,
    )
    assert create.status_code == 422


def test_cash_flow_code_with_attachments(client, su_headers):
    leaf = client.post(
        "/api/standard-link-codes",
        json={
            "code": "REV-CF-1",
            "family": "REV",
            "label_sub_account": "Revenu CF",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert leaf.status_code == 201

    create = client.post(
        "/api/standard-link-codes",
        json={
            "code": "TEX-CUSTOM",
            "family": "TEX",
            "label_sub_account": "Exploitation custom",
            "attached_link_codes": ["REV-CF-1"],
        },
        headers=su_headers,
    )
    assert create.status_code == 201
    body = create.json()
    assert body["family"] == "TEX"
    assert body["attached_link_codes"] == ["REV-CF-1"]
    assert body["is_leaf"] is False


def test_build_balance_sheet_marks_cap_c1_as_difference(client, su_headers, db):
    parent = client.post(
        "/api/standard-link-codes",
        json={
            "code": "CAP-C",
            "family": "CAP",
            "label_sub_account": "Groupe CAP-C",
            "is_leaf": False,
        },
        headers=su_headers,
    )
    assert parent.status_code == 201

    net_income = client.post(
        "/api/standard-link-codes",
        json={
            "code": NET_INCOME_BALANCE_LINK_CODE,
            "family": "CAP",
            "parent_code": "CAP-C",
            "label_sub_account": "Bénéfice net",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert net_income.status_code == 201

    rev = client.post(
        "/api/standard-link-codes",
        json={
            "code": "REV-NI",
            "family": "REV",
            "label_sub_account": "Revenu test",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert rev.status_code == 201

    exp = client.post(
        "/api/standard-link-codes",
        json={
            "code": "EXP-NI-DIFF",
            "family": "EXP",
            "label_sub_account": "Charge test",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert exp.status_code == 201

    structure = build_balance_sheet(db)
    row = next(r for r in structure if r.get("linkCode") == NET_INCOME_BALANCE_LINK_CODE)
    assert row["liaisonMode"] == "difference"
    assert row.get("defineMapping") is False
    assert row.get("isComputedNetIncome") is True
    assert "REV-NI" in row["liaisonNumeratorCodes"]
    assert "EXP-NI-DIFF" in row["liaisonDenominatorCodes"]
    assert row.get("liaisonSumCodes") == []


def test_mapping_rejects_cap_c1(client, auth_headers, su_headers):
    company = client.post(
        "/api/companies",
        json={"name": "NI Mapping Co"},
        headers=auth_headers,
    )
    assert company.status_code == 201
    company_id = company.json()["id"]

    create = client.post(
        "/api/standard-link-codes",
        json={
            "code": NET_INCOME_BALANCE_LINK_CODE,
            "family": "CAP",
            "label_sub_account": "Bénéfice net",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert create.status_code == 201

    response = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[{"account_number": "1000", "link_code": NET_INCOME_BALANCE_LINK_CODE}],
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_income_statement_leaf_codes_for_net_income(db, su_headers, client):
    client.post(
        "/api/standard-link-codes",
        json={
            "code": "EXP-NI",
            "family": "EXP",
            "label_sub_account": "Charge test",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    client.post(
        "/api/standard-link-codes",
        json={
            "code": "AUT-NI",
            "family": "AUT",
            "label_sub_account": "Autre test",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    codes = income_statement_leaf_codes_for_net_income(db)
    assert "EXP-NI" in codes
    assert "AUT-NI" not in codes
    assert NET_INCOME_BALANCE_LINK_CODE not in codes


def test_ensure_net_income_injects_and_normalizes(db, su_headers, client):
    parent = client.post(
        "/api/standard-link-codes",
        json={
            "code": "CAP-C",
            "family": "CAP",
            "label_sub_account": "Groupe CAP-C",
            "is_leaf": False,
        },
        headers=su_headers,
    )
    assert parent.status_code == 201

    net_income = client.post(
        "/api/standard-link-codes",
        json={
            "code": NET_INCOME_BALANCE_LINK_CODE,
            "family": "CAP",
            "parent_code": "CAP-C",
            "label_sub_account": "Bénéfice net calculé",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert net_income.status_code == 201

    rev = client.post(
        "/api/standard-link-codes",
        json={
            "code": "REV-ENSURE",
            "family": "REV",
            "label_sub_account": "Revenu ensure",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert rev.status_code == 201

    structure = [
        {"label": "Capitaux propres", "isSection": True},
        {"label": "Groupe CAP-C", "linkCode": "CAP-C", "isSection": True},
        {"label": "Autre poste CAP", "linkCode": "CAP-C.2", "defineMapping": True},
    ]
    ensured = ensure_net_income_in_balance_structure(structure, db)
    codes = [r.get("linkCode") for r in ensured]
    assert NET_INCOME_BALANCE_LINK_CODE in codes
    idx_cap = next(i for i, r in enumerate(ensured) if r.get("linkCode") == "CAP-C")
    idx_ni = next(
        i for i, r in enumerate(ensured) if r.get("linkCode") == NET_INCOME_BALANCE_LINK_CODE
    )
    assert idx_ni == idx_cap + 1
    ni = ensured[idx_ni]
    assert ni.get("isComputedNetIncome") is True
    assert ni.get("defineMapping") is False
    assert ni.get("liaisonMode") == "difference"
    assert "REV-ENSURE" in ni.get("liaisonNumeratorCodes", [])
    assert ni.get("liaisonSumCodes") == []

    # Re-run is idempotent and normalizes a stale CAP-C.1 row
    stale = ensure_net_income_in_balance_structure(
        [
            {"label": "Groupe CAP-C", "linkCode": "CAP-C", "isSection": True},
            {
                "label": "Bénéfice net",
                "linkCode": NET_INCOME_BALANCE_LINK_CODE,
                "defineMapping": True,
                "liaisonMode": "direct",
            },
        ],
        db,
    )
    ni2 = next(r for r in stale if r.get("linkCode") == NET_INCOME_BALANCE_LINK_CODE)
    assert ni2.get("defineMapping") is False
    assert ni2.get("liaisonMode") == "difference"
    assert sum(1 for r in stale if r.get("linkCode") == NET_INCOME_BALANCE_LINK_CODE) == 1


def test_balance_sheet_cap_c1_equals_ytd_rev_minus_expenses(
    client, auth_headers, su_headers,
):
    """CAP-C.1 = (REV×−1) − charges (sans AUT), YTD janvier→mois BS, TB non-cumulatif OK."""
    for payload in (
        {
            "code": "CAP-C",
            "family": "CAP",
            "label_sub_account": "Groupe CAP-C",
            "is_leaf": False,
        },
        {
            "code": NET_INCOME_BALANCE_LINK_CODE,
            "family": "CAP",
            "parent_code": "CAP-C",
            "label_sub_account": "Bénéfice net calculé",
            "is_leaf": True,
        },
        {
            "code": "REV-CAP",
            "family": "REV",
            "label_sub_account": "Revenus CAP",
            "is_leaf": True,
        },
        {
            "code": "EXP-CAP",
            "family": "EXP",
            "label_sub_account": "Charges CAP",
            "is_leaf": True,
        },
        {
            "code": "AUT-CAP",
            "family": "AUT",
            "label_sub_account": "Autres CAP",
            "is_leaf": True,
        },
    ):
        r = client.post("/api/standard-link-codes", json=payload, headers=su_headers)
        assert r.status_code == 201, r.text

    company = client.post(
        "/api/companies",
        json={"name": "CAP-C.1 YTD Co"},
        headers=auth_headers,
    )
    assert company.status_code == 201
    company_id = company.json()["id"]

    map_r = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[
            {"account_number": "4000", "description": "Sales", "link_code": "REV-CAP"},
            {"account_number": "6000", "description": "OpEx", "link_code": "EXP-CAP"},
            {"account_number": "6500", "description": "Autres", "link_code": "AUT-CAP"},
        ],
        headers=auth_headers,
    )
    assert map_r.status_code == 200

    tb = client.put(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2024",
        json=[
            {
                "account_number": "4000",
                "description": "Sales",
                "monthly_amounts": {"Janvier": 10000.0, "Février": 5000.0},
            },
            {
                "account_number": "6000",
                "description": "OpEx",
                "monthly_amounts": {"Janvier": 2000.0, "Février": 1000.0},
            },
            {
                "account_number": "6500",
                "description": "Autres",
                "monthly_amounts": {"Janvier": 9000.0, "Février": 9000.0},
            },
        ],
        headers=auth_headers,
    )
    assert tb.status_code == 200

    bs_struct = client.put(
        f"/api/companies/{company_id}/statement-structures/balance-sheet",
        json={
            "structure": [
                {"label": "Capitaux propres", "isSection": True},
                {"label": "Groupe CAP-C", "linkCode": "CAP-C", "isSection": True},
            ]
        },
        headers=auth_headers,
    )
    assert bs_struct.status_code == 200

    is_struct = client.put(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        json={
            "structure": [
                {"label": "Revenus", "linkCode": "REV-CAP", "defineMapping": True},
                {"label": "Charges", "linkCode": "EXP-CAP", "defineMapping": True},
                {"label": "Autres", "linkCode": "AUT-CAP", "defineMapping": True},
            ]
        },
        headers=auth_headers,
    )
    assert is_struct.status_code == 200

    # YTD through February on IS
    income = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=2&period=ytd",
        headers=auth_headers,
    )
    assert income.status_code == 200
    is_rows = income.json()["rows"]
    rev_row = next(r for r in is_rows if r.get("linkCode") == "REV-CAP" or r["label"] == "Revenus")
    exp_row = next(r for r in is_rows if r.get("linkCode") == "EXP-CAP" or r["label"] == "Charges")
    # REV CT → ×(−1): Jan −10000 + Feb −5000 = −15000; EXP DT: 2000+1000 = 3000
    assert rev_row["current"] == -15000.0
    assert exp_row["current"] == 3000.0
    # CAP-C.1 = REV(CT) − charges ; AUT exclu
    expected_ni = rev_row["current"] - exp_row["current"]

    balance = client.get(
        f"/api/companies/{company_id}/financial-statements/balance-sheet"
        "?fiscal_year=2024&month=2&period=monthly",
        headers=auth_headers,
    )
    assert balance.status_code == 200
    bs_rows = balance.json()["rows"]
    ni = next(
        (
            r
            for r in bs_rows
            if r.get("linkCode") == NET_INCOME_BALANCE_LINK_CODE
            or r.get("id") == NET_INCOME_BALANCE_LINK_CODE
        ),
        None,
    )
    assert ni is not None, f"CAP-C.1 missing from BS rows: {[(r.get('id'), r.get('linkCode'), r.get('label')) for r in bs_rows]}"
    assert ni.get("linkCode") == NET_INCOME_BALANCE_LINK_CODE
    assert ni["current"] == expected_ni
    assert ni.get("hasLiaisonCode") is True

    cap_c = next(
        (r for r in bs_rows if r.get("linkCode") == "CAP-C" or r.get("id") == "CAP-C"),
        None,
    )
    # CAP-C parent must include CAP-C.1 (computed NI has no GL mapping for rollup)
    if cap_c is not None:
        # With only CAP-C.1 under CAP-C (no CAP-C.2 mappings), parent == NI
        assert cap_c["current"] == expected_ni

    # CAP-C.2 mapped so parent rollup has GL amount; CAP-C total = rollup + CAP-C.1
    cap_c2 = client.post(
        "/api/standard-link-codes",
        json={
            "code": "CAP-C.2",
            "family": "CAP",
            "parent_code": "CAP-C",
            "label_sub_account": "Dividendes",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert cap_c2.status_code in (201, 409)
    # Re-map to include CAP-C.2 (CT × −1 on CAP family)
    map_r2 = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[
            {"account_number": "4000", "description": "Sales", "link_code": "REV-CAP"},
            {"account_number": "6000", "description": "OpEx", "link_code": "EXP-CAP"},
            {"account_number": "3100", "description": "Dividendes", "link_code": "CAP-C.2"},
        ],
        headers=auth_headers,
    )
    assert map_r2.status_code == 200
    tb2 = client.put(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2024",
        json=[
            {
                "account_number": "4000",
                "description": "Sales",
                "monthly_amounts": {"Janvier": 10000.0, "Février": 5000.0},
            },
            {
                "account_number": "6000",
                "description": "OpEx",
                "monthly_amounts": {"Janvier": 2000.0, "Février": 1000.0},
            },
            {
                "account_number": "3100",
                "description": "Dividendes",
                "monthly_amounts": {"Janvier": 100.0, "Février": 100.0},
            },
        ],
        headers=auth_headers,
    )
    assert tb2.status_code == 200

    bs_struct2 = client.put(
        f"/api/companies/{company_id}/statement-structures/balance-sheet",
        json={
            "structure": [
                {"label": "Capitaux propres", "isSection": True},
                {"label": "Groupe CAP-C", "linkCode": "CAP-C", "isSection": True},
                {
                    "label": "Dividendes",
                    "linkCode": "CAP-C.2",
                    "defineMapping": True,
                    "indent": True,
                },
            ]
        },
        headers=auth_headers,
    )
    assert bs_struct2.status_code == 200

    balance2 = client.get(
        f"/api/companies/{company_id}/financial-statements/balance-sheet"
        "?fiscal_year=2024&month=2&period=monthly",
        headers=auth_headers,
    )
    assert balance2.status_code == 200
    bs2 = balance2.json()["rows"]
    ni2 = next(r for r in bs2 if r.get("linkCode") == NET_INCOME_BALANCE_LINK_CODE)
    cap2 = next(r for r in bs2 if r.get("linkCode") == "CAP-C")
    div = next(r for r in bs2 if r.get("linkCode") == "CAP-C.2")
    # Non-cumulative TB: Feb closing for CAP-C.2; CT → ×(−1)
    assert div["current"] == -100.0
    assert cap2["current"] == round(ni2["current"] + div["current"], 2)

    # Structure API also injects CAP-C.1 under CAP-C
    struct_get = client.get(
        f"/api/companies/{company_id}/statement-structures/balance-sheet",
        headers=auth_headers,
    )
    assert struct_get.status_code == 200
    structure = struct_get.json()["structure"]
    codes = [r.get("linkCode") for r in structure]
    assert NET_INCOME_BALANCE_LINK_CODE in codes
    idx_cap = codes.index("CAP-C")
    assert codes[idx_cap + 1] == NET_INCOME_BALANCE_LINK_CODE


def test_balance_sheet_equity_total_formula_includes_cap_c1(
    client, auth_headers, su_headers,
):
    """Total des capitaux propres (+CAP-A+CAP-C) must include CAP-C.1 folded into CAP-C."""
    for payload in (
        {"code": "CAP-A", "family": "CAP", "label_sub_account": "Capital-actions", "is_leaf": True},
        {"code": "CAP-C", "family": "CAP", "label_sub_account": "Groupe CAP-C", "is_leaf": False},
        {
            "code": NET_INCOME_BALANCE_LINK_CODE,
            "family": "CAP",
            "parent_code": "CAP-C",
            "label_sub_account": "Bénéfice net calculé",
            "is_leaf": True,
        },
        {"code": "REV-EQ", "family": "REV", "label_sub_account": "Revenus EQ", "is_leaf": True},
    ):
        r = client.post("/api/standard-link-codes", json=payload, headers=su_headers)
        assert r.status_code in (201, 409), r.text

    company = client.post(
        "/api/companies",
        json={"name": "Equity Total Co"},
        headers=auth_headers,
    )
    assert company.status_code == 201
    company_id = company.json()["id"]

    assert client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[
            {"account_number": "3000", "description": "Capital", "link_code": "CAP-A"},
            {"account_number": "4000", "description": "Sales", "link_code": "REV-EQ"},
        ],
        headers=auth_headers,
    ).status_code == 200

    assert client.put(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2024",
        json=[
            {
                "account_number": "3000",
                "description": "Capital",
                "monthly_amounts": {"Février": 1000.0},
            },
            {
                "account_number": "4000",
                "description": "Sales",
                "monthly_amounts": {"Janvier": 500.0, "Février": 300.0},
            },
        ],
        headers=auth_headers,
    ).status_code == 200

    assert client.put(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        json={
            "structure": [
                {"label": "Revenus", "linkCode": "REV-EQ", "defineMapping": True},
            ]
        },
        headers=auth_headers,
    ).status_code == 200

    assert client.put(
        f"/api/companies/{company_id}/statement-structures/balance-sheet",
        json={
            "structure": [
                {"label": "Capital-actions", "linkCode": "CAP-A", "defineMapping": True},
                {"label": "Bénéfices non répartis", "linkCode": "CAP-C", "isSection": True},
                {
                    "label": "Total des capitaux propres",
                    "isResult": True,
                    "isBold": True,
                    "defineMapping": True,
                    "liaisonMode": "sum",
                    "liaisonSumCodes": ["CAP-A", "CAP-C"],
                },
                {
                    "label": "Total des passifs et des capitaux propres",
                    "isResult": True,
                    "isBold": True,
                    "formula": ["+Total des capitaux propres"],
                },
            ]
        },
        headers=auth_headers,
    ).status_code == 200

    balance = client.get(
        f"/api/companies/{company_id}/financial-statements/balance-sheet"
        "?fiscal_year=2024&month=2&period=monthly",
        headers=auth_headers,
    )
    assert balance.status_code == 200
    rows = balance.json()["rows"]

    cap_a = next(r for r in rows if r.get("linkCode") == "CAP-A")
    cap_c = next(r for r in rows if r.get("linkCode") == "CAP-C")
    ni = next(r for r in rows if r.get("linkCode") == NET_INCOME_BALANCE_LINK_CODE)
    total_eq = next(r for r in rows if r["label"] == "Total des capitaux propres")
    total_pl = next(r for r in rows if r["label"] == "Total des passifs et des capitaux propres")

    # CAP CT → capital credit 1000 → −1000; REV YTD CT → −(500+300)=−800
    assert cap_a["current"] == -1000.0
    assert ni["current"] == -800.0
    assert cap_c["current"] == ni["current"]
    expected_total = round(cap_a["current"] + cap_c["current"], 2)
    assert total_eq["current"] == expected_total
    assert total_pl["current"] == expected_total


def test_cash_flow_detail_tex_a1_follows_horizon_not_always_ytd(
    client, auth_headers, su_headers,
):
    """TEX-A.1: mois courant = NI du mois; YTD = même montant que CAP-C.1 bilan."""
    for payload in (
        {
            "code": "CAP-C",
            "family": "CAP",
            "label_sub_account": "Groupe CAP-C",
            "is_leaf": False,
        },
        {
            "code": NET_INCOME_BALANCE_LINK_CODE,
            "family": "CAP",
            "parent_code": "CAP-C",
            "label_sub_account": "Bénéfice net calculé",
            "is_leaf": True,
        },
        {
            "code": "REV-TEX",
            "family": "REV",
            "label_sub_account": "Revenus TEX",
            "is_leaf": True,
        },
        {
            "code": "EXP-TEX",
            "family": "EXP",
            "label_sub_account": "Charges TEX",
            "is_leaf": True,
        },
        {
            "code": "TEX-A.1",
            "family": "TEX",
            "label_sub_account": "Bénéfice net FT",
            "attached_link_codes": [NET_INCOME_BALANCE_LINK_CODE],
        },
    ):
        r = client.post("/api/standard-link-codes", json=payload, headers=su_headers)
        assert r.status_code == 201, r.text

    company = client.post(
        "/api/companies",
        json={"name": "TEX-A.1 horizon Co"},
        headers=auth_headers,
    )
    assert company.status_code == 201
    company_id = company.json()["id"]

    map_r = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[
            {"account_number": "4000", "description": "Sales", "link_code": "REV-TEX"},
            {"account_number": "6000", "description": "OpEx", "link_code": "EXP-TEX"},
        ],
        headers=auth_headers,
    )
    assert map_r.status_code == 200

    tb = client.put(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2024",
        json=[
            {
                "account_number": "4000",
                "description": "Sales",
                "monthly_amounts": {"Janvier": 10000.0, "Février": 5000.0},
            },
            {
                "account_number": "6000",
                "description": "OpEx",
                "monthly_amounts": {"Janvier": 2000.0, "Février": 1000.0},
            },
        ],
        headers=auth_headers,
    )
    assert tb.status_code == 200

    assert client.put(
        f"/api/companies/{company_id}/statement-structures/balance-sheet",
        json={
            "structure": [
                {"label": "Capitaux propres", "isSection": True},
                {"label": "Groupe CAP-C", "linkCode": "CAP-C", "isSection": True},
            ]
        },
        headers=auth_headers,
    ).status_code == 200

    assert client.put(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        json={
            "structure": [
                {"label": "Revenus", "linkCode": "REV-TEX", "defineMapping": True},
                {"label": "Charges", "linkCode": "EXP-TEX", "defineMapping": True},
            ]
        },
        headers=auth_headers,
    ).status_code == 200

    assert client.put(
        f"/api/companies/{company_id}/statement-structures/cash-flow-detail",
        json={
            "structure": [
                {
                    "label": "Bénéfice net",
                    "linkCode": "TEX-A.1",
                    "liaisonMode": "single",
                    "defineMapping": True,
                },
            ]
        },
        headers=auth_headers,
    ).status_code == 200

    # Mois courant (février) = activité de février seulement : −5000 − 1000 = −6000
    cf_monthly = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow-detail",
        params={"fiscal_year": 2024, "month": 2, "period": "monthly"},
        headers=auth_headers,
    )
    assert cf_monthly.status_code == 200
    tex_m = next(r for r in cf_monthly.json()["rows"] if r.get("linkCode") == "TEX-A.1")
    assert tex_m["current"] == -6000.0

    # YTD février = même formule que CAP-C.1 bilan : −15000 − 3000 = −18000
    balance = client.get(
        f"/api/companies/{company_id}/financial-statements/balance-sheet"
        "?fiscal_year=2024&month=2&period=monthly",
        headers=auth_headers,
    )
    assert balance.status_code == 200
    ni = next(
        r
        for r in balance.json()["rows"]
        if r.get("linkCode") == NET_INCOME_BALANCE_LINK_CODE
    )
    assert ni["current"] == -18000.0

    cf_ytd = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow-detail",
        params={"fiscal_year": 2024, "month": 2, "period": "ytd"},
        headers=auth_headers,
    )
    assert cf_ytd.status_code == 200
    tex_ytd = next(r for r in cf_ytd.json()["rows"] if r.get("linkCode") == "TEX-A.1")
    assert tex_ytd["current"] == ni["current"]
    assert tex_ytd["current"] == -18000.0

    # Series: chaque colonne = NI du mois (pas YTD), ex. février = −6000
    cf_series = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow-detail/series",
        params={"fiscal_year": 2024, "month": 2, "months": 12},
        headers=auth_headers,
    )
    assert cf_series.status_code == 200
    tex_s = next(r for r in cf_series.json()["rows"] if r.get("linkCode") == "TEX-A.1")
    assert tex_s["amounts"]["2024-1"] == -12000.0  # −10000 − 2000
    assert tex_s["amounts"]["2024-2"] == -6000.0   # −5000 − 1000
