import uuid
from io import BytesIO


MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]


def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


def _upsert_trial_balance(client, auth_headers, company_id, entries, fiscal_year=2024):
    """Helper to upsert trial balance entries. Returns response."""
    response = client.put(
        f"/api/companies/{company_id}/trial-balance?fiscal_year={fiscal_year}",
        json=entries,
        headers=auth_headers,
    )
    return response


def _put_account_mappings(client, auth_headers, company_id, mappings):
    """Référentiel obligatoire : les lignes de balance suivent le mapping comptable."""
    response = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=mappings,
        headers=auth_headers,
    )
    assert response.status_code == 200
    return response


# --- GET trial balance ---


def test_get_trial_balance_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["company_id"] == company_id
    assert data["fiscal_year"] == 2024
    assert data["months_with_data"] == []
    assert data["accounts"] == []


def test_get_trial_balance_with_data(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
    ])
    entries = [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": {"Janvier": 5000.0, "Février": 6000.0},
        },
    ]
    _upsert_trial_balance(client, auth_headers, company_id, entries)

    response = client.get(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["months_with_data"] == [1, 2]
    assert len(data["accounts"]) == 1
    account = data["accounts"][0]
    assert account["account_number"] == "1000"
    assert account["description"] == "Cash"
    assert account["monthly_amounts"]["Janvier"] == 5000.0
    assert account["monthly_amounts"]["Février"] == 6000.0
    # Months without data should default to 0
    assert account["monthly_amounts"]["Mars"] == 0.0


def test_get_trial_balance_multiple_accounts(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
        {"account_number": "2000", "description": "Accounts Payable"},
        {"account_number": "5000", "description": "Revenue"},
    ])
    entries = [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": {"Janvier": 1000.0},
        },
        {
            "account_number": "2000",
            "description": "Accounts Payable",
            "monthly_amounts": {"Janvier": 2000.0},
        },
        {
            "account_number": "5000",
            "description": "Revenue",
            "monthly_amounts": {"Janvier": 10000.0},
        },
    ]
    _upsert_trial_balance(client, auth_headers, company_id, entries)

    response = client.get(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["months_with_data"] == [1]
    assert len(data["accounts"]) == 3


def test_get_trial_balance_different_fiscal_years(client, auth_headers):
    """Data for one fiscal year should not appear in another."""
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
    ])

    entries_2024 = [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": {"Janvier": 5000.0},
        },
    ]
    _upsert_trial_balance(client, auth_headers, company_id, entries_2024, fiscal_year=2024)

    entries_2025 = [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": {"Janvier": 8000.0},
        },
    ]
    _upsert_trial_balance(client, auth_headers, company_id, entries_2025, fiscal_year=2025)

    # Check 2024
    response = client.get(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["months_with_data"] == [1]
    accounts = data["accounts"]
    assert len(accounts) == 1
    assert accounts[0]["monthly_amounts"]["Janvier"] == 5000.0

    # Check 2025
    response = client.get(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2025",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["months_with_data"] == [1]
    accounts = data["accounts"]
    assert len(accounts) == 1
    assert accounts[0]["monthly_amounts"]["Janvier"] == 8000.0


# --- PUT (upsert) trial balance ---


def test_upsert_trial_balance_create(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
        {"account_number": "2000", "description": "Accounts Payable"},
    ])
    entries = [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": {"Janvier": 5000.0, "Février": 6000.0},
        },
        {
            "account_number": "2000",
            "description": "Accounts Payable",
            "monthly_amounts": {"Janvier": 3000.0},
        },
    ]
    response = _upsert_trial_balance(client, auth_headers, company_id, entries)
    assert response.status_code == 200
    data = response.json()
    assert data["company_id"] == company_id
    assert data["fiscal_year"] == 2024
    assert data["months_with_data"] == [1, 2]
    assert len(data["accounts"]) == 2


def test_upsert_trial_balance_update_existing(client, auth_headers):
    """Montants mis à jour sur le même # ; libellés = mapping comptable (pas le champ description du PUT)."""
    company_id = _create_company(client, auth_headers)

    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
    ])

    entries = [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": {"Janvier": 5000.0},
        },
    ]
    _upsert_trial_balance(client, auth_headers, company_id, entries)

    entries_updated = [
        {
            "account_number": "1000",
            "description": "Cash and Equivalents",
            "monthly_amounts": {"Janvier": 7500.0, "Février": 8000.0},
        },
    ]
    response = _upsert_trial_balance(client, auth_headers, company_id, entries_updated)
    assert response.status_code == 200
    data = response.json()
    assert len(data["accounts"]) == 1
    account = data["accounts"][0]
    assert account["description"] == "Cash"
    assert account["monthly_amounts"]["Janvier"] == 7500.0
    assert account["monthly_amounts"]["Février"] == 8000.0

    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash and Equivalents"},
    ])
    r = client.get(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2024",
        headers=auth_headers,
    )
    assert r.json()["accounts"][0]["description"] == "Cash and Equivalents"


def test_upsert_trial_balance_all_twelve_months(client, auth_headers):
    """Test upserting data for all 12 months."""
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
    ])
    monthly = {month: float(i * 1000) for i, month in enumerate(MONTHS_FR, 1)}
    entries = [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": monthly,
        },
    ]
    response = _upsert_trial_balance(client, auth_headers, company_id, entries)
    assert response.status_code == 200
    data = response.json()
    assert data["months_with_data"] == list(range(1, 13))
    account = data["accounts"][0]
    for i, month in enumerate(MONTHS_FR, 1):
        assert account["monthly_amounts"][month] == float(i * 1000)


def test_upsert_trial_balance_negative_amounts(client, auth_headers):
    """Negative amounts should be stored correctly (e.g., liabilities, credits)."""
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "Revenue"},
    ])
    entries = [
        {
            "account_number": "4000",
            "description": "Revenue",
            "monthly_amounts": {"Janvier": -15000.0, "Février": -20000.0},
        },
    ]
    response = _upsert_trial_balance(client, auth_headers, company_id, entries)
    assert response.status_code == 200
    account = response.json()["accounts"][0]
    assert account["monthly_amounts"]["Janvier"] == -15000.0
    assert account["monthly_amounts"]["Février"] == -20000.0


def test_upsert_trial_balance_zero_amounts(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
    ])
    entries = [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": {"Janvier": 0.0},
        },
    ]
    response = _upsert_trial_balance(client, auth_headers, company_id, entries)
    assert response.status_code == 200
    account = response.json()["accounts"][0]
    assert account["monthly_amounts"]["Janvier"] == 0.0


def test_upsert_trial_balance_empty_list(client, auth_headers):
    """Upserting an empty list should succeed and return empty accounts."""
    company_id = _create_company(client, auth_headers)
    response = _upsert_trial_balance(client, auth_headers, company_id, [])
    assert response.status_code == 200
    empty = response.json()
    assert empty["months_with_data"] == []
    assert empty["accounts"] == []


# --- Company isolation ---


def test_trial_balance_company_isolation(client, auth_headers):
    """Trial balance data for one company should not leak to another."""
    company_a = _create_company(client, auth_headers, name="Company A")
    company_b = _create_company(client, auth_headers, name="Company B")

    _put_account_mappings(client, auth_headers, company_a, [
        {"account_number": "1000", "description": "Cash A"},
    ])
    _put_account_mappings(client, auth_headers, company_b, [
        {"account_number": "1000", "description": "Cash B"},
    ])

    entries_a = [
        {
            "account_number": "1000",
            "description": "Cash A",
            "monthly_amounts": {"Janvier": 1000.0},
        },
    ]
    _upsert_trial_balance(client, auth_headers, company_a, entries_a)

    entries_b = [
        {
            "account_number": "1000",
            "description": "Cash B",
            "monthly_amounts": {"Janvier": 9999.0},
        },
    ]
    _upsert_trial_balance(client, auth_headers, company_b, entries_b)

    # Verify company A
    response = client.get(
        f"/api/companies/{company_a}/trial-balance?fiscal_year=2024",
        headers=auth_headers,
    )
    accounts = response.json()["accounts"]
    assert len(accounts) == 1
    assert accounts[0]["description"] == "Cash A"
    assert accounts[0]["monthly_amounts"]["Janvier"] == 1000.0

    # Verify company B
    response = client.get(
        f"/api/companies/{company_b}/trial-balance?fiscal_year=2024",
        headers=auth_headers,
    )
    accounts = response.json()["accounts"]
    assert len(accounts) == 1
    assert accounts[0]["description"] == "Cash B"
    assert accounts[0]["monthly_amounts"]["Janvier"] == 9999.0


# --- Authorization and error cases ---


def test_trial_balance_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/trial-balance?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_trial_balance_unauthenticated(client):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}/trial-balance?fiscal_year=2024")
    assert response.status_code == 401


def test_upsert_trial_balance_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    entries = [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": {"Janvier": 1000.0},
        },
    ]
    response = client.put(
        f"/api/companies/{fake_id}/trial-balance?fiscal_year=2024",
        json=entries,
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_upsert_trial_balance_unauthenticated(client):
    fake_id = str(uuid.uuid4())
    response = client.put(
        f"/api/companies/{fake_id}/trial-balance?fiscal_year=2024",
        json=[],
    )
    assert response.status_code == 401


# --- Response shape ---


def test_trial_balance_response_has_all_months(client, auth_headers):
    """Each account in the response should have all 12 French month keys."""
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
    ])
    entries = [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": {"Janvier": 100.0},
        },
    ]
    _upsert_trial_balance(client, auth_headers, company_id, entries)

    response = client.get(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2024",
        headers=auth_headers,
    )
    data = response.json()
    assert data["months_with_data"] == [1]
    account = data["accounts"][0]
    for month in MONTHS_FR:
        assert month in account["monthly_amounts"]


def test_get_trial_balance_includes_mapping_only_accounts(client, auth_headers):
    """Comptes présents uniquement dans le mapping (sans plan comptable / import balance) apparaissent avec des montants à 0."""
    company_id = _create_company(client, auth_headers)
    response = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[
            {
                "account_number": "100001",
                "description": "Compte mapping seul",
            }
        ],
        headers=auth_headers,
    )
    assert response.status_code == 200

    response = client.get(
        f"/api/companies/{company_id}/trial-balance?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["accounts"]) == 1
    acc = data["accounts"][0]
    assert acc["account_number"] == "100001"
    assert acc["description"] == "Compte mapping seul"
    assert acc["monthly_amounts"]["Janvier"] == 0.0


# --- Upload preview & validation ---


def test_upload_preview_csv_balance_and_unknown(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
    ])
    csv_content = (
        "#,Description,Montant\n"
        "1000,Cash,100.00\n"
        "2000,New,-100.00\n"
    ).encode("utf-8-sig")
    response = client.post(
        f"/api/companies/{company_id}/trial-balance/upload-preview?fiscal_year=2024&month=1",
        files={"file": ("test.csv", BytesIO(csv_content), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["balance_is_valid"] is True
    assert data["row_count"] == 2
    assert len(data["unknown_accounts"]) == 1
    assert data["unknown_accounts"][0]["account_number"] == "2000"
    assert float(data["unknown_accounts"][0]["amount"]) == -100.0


def test_upload_rejects_non_zero_sum(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
    ])
    csv_content = "#,Description,Montant\n1000,Cash,100.00\n".encode("utf-8-sig")
    response = client.post(
        f"/api/companies/{company_id}/trial-balance/upload?fiscal_year=2024&month=1",
        files={"file": ("test.csv", BytesIO(csv_content), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_upload_rejects_unmapped_account(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    csv_content = "#,Description,Montant\n1000,Cash,100.00\n2000,X,-100.00\n".encode("utf-8-sig")
    response = client.post(
        f"/api/companies/{company_id}/trial-balance/upload?fiscal_year=2024&month=1",
        files={"file": ("test.csv", BytesIO(csv_content), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_upload_csv_balanced_ok(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _put_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash"},
        {"account_number": "2000", "description": "X"},
    ])
    csv_content = "#,Description,Montant\n1000,Cash,100.00\n2000,X,-100.00\n".encode("utf-8-sig")
    response = client.post(
        f"/api/companies/{company_id}/trial-balance/upload?fiscal_year=2024&month=1",
        files={"file": ("test.csv", BytesIO(csv_content), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["accounts_imported"] == 2
