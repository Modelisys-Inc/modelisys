import uuid


def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


def _create_budget(client, auth_headers, company_id, name="Budget 2024", fiscal_year=2024):
    response = client.post(
        f"/api/companies/{company_id}/budgets",
        json={"name": name, "fiscal_year": fiscal_year},
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()


def _setup_chart_of_accounts(client, auth_headers, company_id):
    """Mapping + balance pour créer ChartOfAccount (utilisé par les écritures budgétaires)."""
    r0 = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[
            {"account_number": "4000", "description": "Revenue"},
            {"account_number": "5000", "description": "COGS"},
        ],
        headers=auth_headers,
    )
    assert r0.status_code == 200
    r1 = client.put(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2024",
        json=[
            {"account_number": "4000", "description": "Revenue", "monthly_amounts": {"Janvier": 0}},
            {"account_number": "5000", "description": "COGS", "monthly_amounts": {"Janvier": 0}},
        ],
        headers=auth_headers,
    )
    assert r1.status_code == 200


# --- List budgets ---


def test_list_budgets_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/budgets",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["budgets"] == []


def test_list_budgets(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _create_budget(client, auth_headers, company_id, name="Budget A", fiscal_year=2024)
    _create_budget(client, auth_headers, company_id, name="Budget B", fiscal_year=2025)

    response = client.get(
        f"/api/companies/{company_id}/budgets",
        headers=auth_headers,
    )
    assert response.status_code == 200
    budgets = response.json()["budgets"]
    assert len(budgets) == 2


# --- Create budget ---


def test_create_budget(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.post(
        f"/api/companies/{company_id}/budgets",
        json={"name": "Annual Budget", "fiscal_year": 2024},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Annual Budget"
    assert data["fiscal_year"] == 2024
    assert "id" in data
    assert "created_by_id" in data
    assert data["entries"] == []


# --- Get budget ---


def test_get_budget(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    budget = _create_budget(client, auth_headers, company_id)
    budget_id = budget["id"]

    response = client.get(
        f"/api/companies/{company_id}/budgets/{budget_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Budget 2024"


def test_get_budget_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{company_id}/budgets/{fake_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Budget entries (bulk upsert) ---


def test_upsert_budget_entries(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _setup_chart_of_accounts(client, auth_headers, company_id)
    budget = _create_budget(client, auth_headers, company_id)
    budget_id = budget["id"]

    entries = [
        {"account_number": "4000", "month": 1, "amount": 10000.0},
        {"account_number": "4000", "month": 2, "amount": 12000.0},
        {"account_number": "5000", "month": 1, "amount": 4000.0},
    ]
    response = client.put(
        f"/api/companies/{company_id}/budgets/{budget_id}/entries",
        json=entries,
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["entries"]) == 3


def test_upsert_budget_entries_update_existing(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _setup_chart_of_accounts(client, auth_headers, company_id)
    budget = _create_budget(client, auth_headers, company_id)
    budget_id = budget["id"]

    # Create
    client.put(
        f"/api/companies/{company_id}/budgets/{budget_id}/entries",
        json=[{"account_number": "4000", "month": 1, "amount": 10000.0}],
        headers=auth_headers,
    )

    # Update same account+month
    response = client.put(
        f"/api/companies/{company_id}/budgets/{budget_id}/entries",
        json=[{"account_number": "4000", "month": 1, "amount": 15000.0}],
        headers=auth_headers,
    )
    assert response.status_code == 200
    entries = response.json()["entries"]
    # Should still be 1 entry, updated to 15000
    month1_entries = [e for e in entries if e["month"] == 1]
    assert len(month1_entries) == 1
    assert month1_entries[0]["amount"] == 15000.0


def test_upsert_budget_entries_unknown_account_skipped(client, auth_headers):
    """Entries for accounts not in ChartOfAccount should be silently skipped."""
    company_id = _create_company(client, auth_headers)
    budget = _create_budget(client, auth_headers, company_id)
    budget_id = budget["id"]

    # No chart of accounts setup -- account "9999" doesn't exist
    response = client.put(
        f"/api/companies/{company_id}/budgets/{budget_id}/entries",
        json=[{"account_number": "9999", "month": 1, "amount": 1000.0}],
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["entries"] == []


def test_upsert_budget_entries_budget_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    fake_id = str(uuid.uuid4())
    response = client.put(
        f"/api/companies/{company_id}/budgets/{fake_id}/entries",
        json=[],
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Delete budget ---


def test_delete_budget(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    budget = _create_budget(client, auth_headers, company_id)
    budget_id = budget["id"]

    response = client.delete(
        f"/api/companies/{company_id}/budgets/{budget_id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Confirm deleted
    response = client.get(
        f"/api/companies/{company_id}/budgets/{budget_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_delete_budget_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    fake_id = str(uuid.uuid4())
    response = client.delete(
        f"/api/companies/{company_id}/budgets/{fake_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Authorization ---


def test_budgets_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/budgets",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_budgets_unauthenticated(client):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}/budgets")
    assert response.status_code == 403
