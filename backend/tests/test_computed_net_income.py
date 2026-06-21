from app.services.standard_link_code_utils import (
    NET_INCOME_BALANCE_LINK_CODE,
    build_cash_flow_link_code_attachments,
    build_cash_flow_virtual_family_link_codes,
    build_net_income_balance_structure_row,
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


def test_income_statement_parent_cannot_have_ft_category(client, auth_headers):
    create = client.post(
        "/api/standard-link-codes",
        json={
            "code": "REV-PARENT-CF",
            "family": "REV",
            "label_sub_account": "Parent revenus",
            "is_leaf": False,
            "ft_category": "Exploitation",
        },
        headers=auth_headers,
    )
    assert create.status_code == 422


def test_income_statement_leaf_cannot_have_ft_category(client, auth_headers):
    parent = client.post(
        "/api/standard-link-codes",
        json={
            "code": "REV-P",
            "family": "REV",
            "label_sub_account": "Parent",
            "is_leaf": False,
        },
        headers=auth_headers,
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
        headers=auth_headers,
    )
    assert create.status_code == 422


def test_cash_flow_code_requires_attached_link_codes(client, auth_headers):
    create = client.post(
        "/api/standard-link-codes",
        json={
            "code": "TEX-EMPTY",
            "family": "TEX",
            "label_sub_account": "Sans sources",
        },
        headers=auth_headers,
    )
    assert create.status_code == 422


def test_cash_flow_code_with_attachments(client, auth_headers):
    leaf = client.post(
        "/api/standard-link-codes",
        json={
            "code": "REV-CF-1",
            "family": "REV",
            "label_sub_account": "Revenu CF",
            "is_leaf": True,
        },
        headers=auth_headers,
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
        headers=auth_headers,
    )
    assert create.status_code == 201
    body = create.json()
    assert body["family"] == "TEX"
    assert body["attached_link_codes"] == ["REV-CF-1"]
    assert body["is_leaf"] is False


def test_build_balance_sheet_marks_cap_c1_as_sum(client, auth_headers, db):
    parent = client.post(
        "/api/standard-link-codes",
        json={
            "code": "CAP-C",
            "family": "CAP",
            "label_sub_account": "Groupe CAP-C",
            "is_leaf": False,
        },
        headers=auth_headers,
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
        headers=auth_headers,
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
        headers=auth_headers,
    )
    assert rev.status_code == 201

    structure = build_balance_sheet(db)
    row = next(r for r in structure if r.get("linkCode") == NET_INCOME_BALANCE_LINK_CODE)
    assert row["liaisonMode"] == "sum"
    assert row.get("defineMapping") is False
    assert row.get("isComputedNetIncome") is True
    assert "REV-NI" in row["liaisonSumCodes"]


def test_mapping_rejects_cap_c1(client, auth_headers):
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
        headers=auth_headers,
    )
    assert create.status_code == 201

    response = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[{"account_number": "1000", "link_code": NET_INCOME_BALANCE_LINK_CODE}],
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_income_statement_leaf_codes_for_net_income(db, auth_headers, client):
    client.post(
        "/api/standard-link-codes",
        json={
            "code": "EXP-NI",
            "family": "EXP",
            "label_sub_account": "Charge test",
            "is_leaf": True,
        },
        headers=auth_headers,
    )
    codes = income_statement_leaf_codes_for_net_income(db)
    assert "EXP-NI" in codes
    assert NET_INCOME_BALANCE_LINK_CODE not in codes
