"""Tests for the AccountAnnualBalance rollup + annual-summary endpoint (Phase 1).

The rollup is refreshed on every TB write; the annual-summary endpoint reads it.
"""


def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


def _put_account_mappings(client, auth_headers, company_id, mappings):
    response = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=mappings,
        headers=auth_headers,
    )
    assert response.status_code == 200


def _upsert(client, auth_headers, company_id, entries, fiscal_year=2024):
    return client.put(
        f"/api/companies/{company_id}/trial-balance?fiscal_year={fiscal_year}",
        json=entries,
        headers=auth_headers,
    )


def _annual_summary(client, auth_headers, company_id, fiscal_year=2024):
    resp = client.get(
        f"/api/companies/{company_id}/trial-balance/annual-summary?fiscal_year={fiscal_year}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    return resp.json()


def test_annual_summary_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    data = _annual_summary(client, auth_headers, company_id)
    assert data["accounts"] == []
    assert data["total"] == 0


def test_rollup_built_on_upsert(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
        {"account_number": "4000", "description": "Sales"},
    ])
    _upsert(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash",
         "monthly_amounts": {"Janvier": 5000.0, "Février": 6000.0}},
        {"account_number": "4000", "description": "Sales",
         "monthly_amounts": {"Janvier": 1000.0}},
    ])

    data = _annual_summary(client, auth_headers, company_id)
    by_num = {a["account_number"]: a for a in data["accounts"]}

    assert by_num["1000"]["amount"] == 11000.0
    assert by_num["1000"]["month_count"] == 2
    assert by_num["4000"]["amount"] == 1000.0
    assert by_num["4000"]["month_count"] == 1
    assert data["total"] == 12000.0


def test_rollup_updates_on_delete(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
    ])
    _upsert(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash",
         "monthly_amounts": {"Janvier": 5000.0, "Février": 6000.0}},
    ])

    # Delete February (month 2).
    resp = client.delete(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2024&month=2",
        headers=auth_headers,
    )
    assert resp.status_code == 200

    data = _annual_summary(client, auth_headers, company_id)
    by_num = {a["account_number"]: a for a in data["accounts"]}
    assert by_num["1000"]["amount"] == 5000.0
    assert by_num["1000"]["month_count"] == 1


def test_rollup_isolated_per_fiscal_year(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
    ])
    _upsert(client, auth_headers, company_id,
            [{"account_number": "1000", "description": "Cash",
              "monthly_amounts": {"Janvier": 100.0}}], fiscal_year=2023)
    _upsert(client, auth_headers, company_id,
            [{"account_number": "1000", "description": "Cash",
              "monthly_amounts": {"Janvier": 200.0}}], fiscal_year=2024)

    assert _annual_summary(client, auth_headers, company_id, 2023)["total"] == 100.0
    assert _annual_summary(client, auth_headers, company_id, 2024)["total"] == 200.0
