import uuid


def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


INCOME_STATEMENT_STRUCTURE = [
    {"label": "revenus", "isBold": True, "isSection": True},
    {"label": "coût des produits vendus", "isSection": True, "indent": True},
    {"label": "bénéfice brut", "isBold": True, "isResult": True},
    {"label": "charges d'exploitation", "isBold": True, "isSection": True},
    {"label": "bénéfice net", "isBold": True, "isNetIncome": True},
]

BALANCE_SHEET_STRUCTURE = [
    {"label": "actifs", "isBold": True, "isSection": True},
    {"label": "actifs courants", "isSection": True, "indent": True},
    {"label": "total des actifs", "isBold": True, "isResult": True},
    {"label": "passifs", "isBold": True, "isSection": True},
    {"label": "capitaux propres", "isBold": True, "isResult": True},
]


def test_list_statement_structures_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/statement-structures", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["structures"] == []


def test_upsert_income_statement_structure(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.put(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        json={"structure": INCOME_STATEMENT_STRUCTURE},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["statement_type"] == "income-statement"
    assert data["company_id"] == company_id
    assert len(data["structure"]) == 5
    assert data["structure"][0]["label"] == "revenus"
    assert "id" in data


def test_upsert_balance_sheet_structure(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.put(
        f"/api/companies/{company_id}/statement-structures/balance-sheet",
        json={"structure": BALANCE_SHEET_STRUCTURE},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["statement_type"] == "balance-sheet"
    assert len(data["structure"]) == 5


def test_upsert_updates_existing(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    # Create
    client.put(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        json={"structure": INCOME_STATEMENT_STRUCTURE},
        headers=auth_headers,
    )
    # Update with new structure
    updated = [{"label": "revenus modifiés", "isBold": True}]
    response = client.put(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        json={"structure": updated},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert len(response.json()["structure"]) == 1
    assert response.json()["structure"][0]["label"] == "revenus modifiés"

    # Verify only one record exists
    list_response = client.get(
        f"/api/companies/{company_id}/statement-structures", headers=auth_headers
    )
    assert len(list_response.json()["structures"]) == 1


def test_get_statement_structure(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    client.put(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        json={"structure": INCOME_STATEMENT_STRUCTURE},
        headers=auth_headers,
    )
    response = client.get(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["statement_type"] == "income-statement"
    assert len(response.json()["structure"]) == 5


def test_get_statement_structure_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_invalid_statement_type(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.put(
        f"/api/companies/{company_id}/statement-structures/invalid-type",
        json={"structure": []},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_list_both_structures(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    client.put(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        json={"structure": INCOME_STATEMENT_STRUCTURE},
        headers=auth_headers,
    )
    client.put(
        f"/api/companies/{company_id}/statement-structures/balance-sheet",
        json={"structure": BALANCE_SHEET_STRUCTURE},
        headers=auth_headers,
    )
    response = client.get(
        f"/api/companies/{company_id}/statement-structures", headers=auth_headers
    )
    assert response.status_code == 200
    structures = response.json()["structures"]
    assert len(structures) == 2
    types = {s["statement_type"] for s in structures}
    assert types == {"income-statement", "balance-sheet"}


def test_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/statement-structures", headers=auth_headers
    )
    assert response.status_code == 404


def test_unauthenticated(client):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}/statement-structures")
    assert response.status_code == 403


def test_structure_with_detail_rows(client, auth_headers):
    """Test that nested detail rows are preserved in JSON."""
    company_id = _create_company(client, auth_headers)
    structure = [
        {
            "label": "revenus",
            "isBold": True,
            "isSection": True,
            "detailRows": [
                {"label": "ventes de produits"},
                {"label": "ventes de services"},
            ],
            "isExpanded": True,
        },
    ]
    response = client.put(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        json={"structure": structure},
        headers=auth_headers,
    )
    assert response.status_code == 200
    saved = response.json()["structure"]
    assert len(saved[0]["detailRows"]) == 2
    assert saved[0]["detailRows"][0]["label"] == "ventes de produits"
    assert saved[0]["isExpanded"] is True


def test_structure_with_link_codes(client, auth_headers):
    """Test that balance sheet link codes are preserved."""
    company_id = _create_company(client, auth_headers)
    structure = [
        {"label": "actifs courants", "indent": True, "linkCode": "AC-001"},
        {"label": "actifs non courants", "indent": True, "linkCode": "ANC-001"},
    ]
    response = client.put(
        f"/api/companies/{company_id}/statement-structures/balance-sheet",
        json={"structure": structure},
        headers=auth_headers,
    )
    assert response.status_code == 200
    saved = response.json()["structure"]
    assert saved[0]["linkCode"] == "AC-001"
    assert saved[1]["linkCode"] == "ANC-001"
