import uuid


def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


# --- GET exchange rates ---


def test_list_exchange_rates_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/exchange-rates",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["exchange_rates"] == []


def test_list_exchange_rates_with_data(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    # Upsert some rates
    client.put(
        f"/api/companies/{company_id}/exchange-rates",
        json=[
            {
                "currency": "USD",
                "fiscal_year": 2024,
                "monthly_rates": {"Janvier": 1.35, "Février": 1.34},
                "notes": {"Janvier": "Bank rate"},
            },
        ],
        headers=auth_headers,
    )

    response = client.get(
        f"/api/companies/{company_id}/exchange-rates",
        headers=auth_headers,
    )
    assert response.status_code == 200
    rates = response.json()["exchange_rates"]
    assert len(rates) == 1
    assert rates[0]["currency"] == "USD"
    assert rates[0]["fiscal_year"] == 2024
    assert rates[0]["monthly_rates"]["Janvier"] == 1.35
    assert rates[0]["notes"]["Janvier"] == "Bank rate"


def test_list_exchange_rates_filter_by_fiscal_year(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    client.put(
        f"/api/companies/{company_id}/exchange-rates",
        json=[
            {"currency": "USD", "fiscal_year": 2024, "monthly_rates": {"Janvier": 1.35}},
            {"currency": "USD", "fiscal_year": 2025, "monthly_rates": {"Janvier": 1.40}},
        ],
        headers=auth_headers,
    )

    response = client.get(
        f"/api/companies/{company_id}/exchange-rates?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    rates = response.json()["exchange_rates"]
    assert len(rates) == 1
    assert rates[0]["fiscal_year"] == 2024


# --- PUT (upsert) exchange rates ---


def test_upsert_exchange_rates_create(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.put(
        f"/api/companies/{company_id}/exchange-rates",
        json=[
            {
                "currency": "USD",
                "fiscal_year": 2024,
                "monthly_rates": {"Janvier": 1.35, "Février": 1.34},
                "notes": {},
            },
        ],
        headers=auth_headers,
    )
    assert response.status_code == 200
    rates = response.json()["exchange_rates"]
    assert len(rates) == 1
    assert rates[0]["currency"] == "USD"
    assert "id" in rates[0]


def test_upsert_exchange_rates_update_existing(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    # Create
    client.put(
        f"/api/companies/{company_id}/exchange-rates",
        json=[{"currency": "USD", "fiscal_year": 2024, "monthly_rates": {"Janvier": 1.35}}],
        headers=auth_headers,
    )
    # Update same currency+year
    response = client.put(
        f"/api/companies/{company_id}/exchange-rates",
        json=[{"currency": "USD", "fiscal_year": 2024, "monthly_rates": {"Janvier": 1.40}}],
        headers=auth_headers,
    )
    assert response.status_code == 200
    rates = response.json()["exchange_rates"]
    # Should not duplicate -- still 1 rate
    usd_rates = [r for r in rates if r["currency"] == "USD" and r["fiscal_year"] == 2024]
    assert len(usd_rates) == 1
    assert usd_rates[0]["monthly_rates"]["Janvier"] == 1.40


def test_upsert_multiple_currencies(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.put(
        f"/api/companies/{company_id}/exchange-rates",
        json=[
            {"currency": "USD", "fiscal_year": 2024, "monthly_rates": {"Janvier": 1.35}},
            {"currency": "EUR", "fiscal_year": 2024, "monthly_rates": {"Janvier": 1.50}},
        ],
        headers=auth_headers,
    )
    assert response.status_code == 200
    rates = response.json()["exchange_rates"]
    assert len(rates) == 2
    currencies = {r["currency"] for r in rates}
    assert currencies == {"EUR", "USD"}


def test_upsert_exchange_rates_with_notes(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.put(
        f"/api/companies/{company_id}/exchange-rates",
        json=[
            {
                "currency": "USD",
                "fiscal_year": 2024,
                "monthly_rates": {"Janvier": 1.35},
                "notes": {"Janvier": "Spot rate from bank"},
            },
        ],
        headers=auth_headers,
    )
    assert response.status_code == 200
    rate = response.json()["exchange_rates"][0]
    assert rate["notes"]["Janvier"] == "Spot rate from bank"


# --- Org-scoped (shared across companies in same org) ---


def test_exchange_rates_shared_across_org_companies(client, auth_headers):
    """Exchange rates are org-scoped, so both companies should see them."""
    company_a = _create_company(client, auth_headers, name="Company A")
    company_b = _create_company(client, auth_headers, name="Company B")

    # Create rate via company A
    client.put(
        f"/api/companies/{company_a}/exchange-rates",
        json=[{"currency": "USD", "fiscal_year": 2024, "monthly_rates": {"Janvier": 1.35}}],
        headers=auth_headers,
    )

    # Should be visible from company B (same org)
    response = client.get(
        f"/api/companies/{company_b}/exchange-rates",
        headers=auth_headers,
    )
    assert response.status_code == 200
    rates = response.json()["exchange_rates"]
    assert len(rates) == 1
    assert rates[0]["currency"] == "USD"


# --- Authorization ---


def test_exchange_rates_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/exchange-rates",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_exchange_rates_unauthenticated(client):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}/exchange-rates")
    assert response.status_code == 403
