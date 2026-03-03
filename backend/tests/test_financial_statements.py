import uuid


MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]


def _create_company(client, auth_headers, name="Test Co", fiscal_year_end="12-31"):
    response = client.post(
        "/api/companies",
        json={"name": name, "fiscal_year_end": fiscal_year_end},
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


def _upsert_trial_balance(client, auth_headers, company_id, entries, fiscal_year=2024):
    response = client.put(
        f"/api/companies/{company_id}/trial-balance?fiscal_year={fiscal_year}",
        json=entries,
        headers=auth_headers,
    )
    assert response.status_code == 200
    return response


def _upsert_account_mappings(client, auth_headers, company_id, mappings):
    response = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=mappings,
        headers=auth_headers,
    )
    assert response.status_code == 200
    return response


def _upsert_structure(client, auth_headers, company_id, statement_type, structure):
    response = client.put(
        f"/api/companies/{company_id}/statement-structures/{statement_type}",
        json={"structure": structure},
        headers=auth_headers,
    )
    assert response.status_code == 200
    return response


def _setup_income_statement_data(client, auth_headers, fiscal_year=2024):
    """Create a company with trial balance, mappings, and income statement structure.
    Returns company_id."""
    company_id = _create_company(client, auth_headers)

    # Trial balance data
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4000",
            "description": "Sales Revenue",
            "monthly_amounts": {"Janvier": 10000.0, "Février": 12000.0, "Mars": 11000.0},
        },
        {
            "account_number": "5000",
            "description": "Cost of Goods Sold",
            "monthly_amounts": {"Janvier": 4000.0, "Février": 5000.0, "Mars": 4500.0},
        },
        {
            "account_number": "6000",
            "description": "Operating Expenses",
            "monthly_amounts": {"Janvier": 2000.0, "Février": 2500.0, "Mars": 2200.0},
        },
    ], fiscal_year=fiscal_year)

    # Account mappings with link codes
    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "Sales Revenue", "link_code": "REV-001"},
        {"account_number": "5000", "description": "Cost of Goods Sold", "link_code": "COGS-001"},
        {"account_number": "6000", "description": "Operating Expenses", "link_code": "OPEX-001"},
    ])

    # Income statement structure
    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {"label": "revenus", "isBold": True, "isSection": True, "linkCode": "REV-001"},
        {"label": "coût des produits vendus", "isSection": True, "linkCode": "COGS-001"},
        {"label": "charges d'exploitation", "isSection": True, "linkCode": "OPEX-001"},
    ])

    return company_id


# --- Basic income statement ---


def test_income_statement_default_structure_no_data(client, auth_headers):
    """A new company has a seeded IS structure; with no trial balance data rows return zeros."""
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["companyId"] == company_id
    assert data["statementType"] == "income-statement"
    assert data["fiscalYear"] == 2024
    assert len(data["rows"]) > 0
    assert all(r["current"] == 0.0 for r in data["rows"])


def test_statement_empty_no_structure(client, auth_headers):
    """cash-flow is not seeded by default — should return empty rows."""
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["statementType"] == "cash-flow"
    assert data["rows"] == []


def test_income_statement_monthly(client, auth_headers):
    """Test monthly income statement with trial balance + mappings."""
    company_id = _setup_income_statement_data(client, auth_headers)

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=1&period=monthly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["statementType"] == "income-statement"
    assert data["fiscalYear"] == 2024
    assert data["month"] == 1
    assert data["period"] == "monthly"
    assert len(data["rows"]) == 3

    # Revenue row (month 1 = Janvier = 10000)
    rev_row = data["rows"][0]
    assert rev_row["label"] == "revenus"
    assert rev_row["current"] == 10000.0

    # COGS row (month 1 = 4000)
    cogs_row = data["rows"][1]
    assert cogs_row["current"] == 4000.0

    # OpEx row (month 1 = 2000)
    opex_row = data["rows"][2]
    assert opex_row["current"] == 2000.0


def test_income_statement_quarterly(client, auth_headers):
    """Quarterly should sum 3 months."""
    company_id = _setup_income_statement_data(client, auth_headers)

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=3&period=quarterly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()

    # Revenue Q1 = 10000 + 12000 + 11000 = 33000
    rev_row = data["rows"][0]
    assert rev_row["current"] == 33000.0

    # COGS Q1 = 4000 + 5000 + 4500 = 13500
    cogs_row = data["rows"][1]
    assert cogs_row["current"] == 13500.0


def test_income_statement_annual(client, auth_headers):
    """Annual should sum all 12 months (only 3 have data)."""
    company_id = _setup_income_statement_data(client, auth_headers)

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=12&period=annual",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()

    # Same as Q1 since only months 1-3 have data
    rev_row = data["rows"][0]
    assert rev_row["current"] == 33000.0


def test_income_statement_ytd(client, auth_headers):
    """YTD up to month 2 should sum months 1-2."""
    company_id = _setup_income_statement_data(client, auth_headers)

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=2&period=ytd",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()

    # Revenue YTD through Feb = 10000 + 12000 = 22000
    rev_row = data["rows"][0]
    assert rev_row["current"] == 22000.0


# --- Prior year comparison ---


def test_income_statement_prior_year_comparison(client, auth_headers):
    """Should compute variation against prior year."""
    company_id = _create_company(client, auth_headers)

    # Prior year data (2023)
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4000",
            "description": "Sales Revenue",
            "monthly_amounts": {"Janvier": 8000.0},
        },
    ], fiscal_year=2023)

    # Current year data (2024)
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4000",
            "description": "Sales Revenue",
            "monthly_amounts": {"Janvier": 10000.0},
        },
    ], fiscal_year=2024)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "Sales Revenue", "link_code": "REV-001"},
    ])
    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {"label": "revenus", "isBold": True, "linkCode": "REV-001"},
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=1&period=monthly&comparison_type=prior_year",
        headers=auth_headers,
    )
    assert response.status_code == 200
    row = response.json()["rows"][0]
    assert row["current"] == 10000.0
    assert row["prior"] == 8000.0
    # Variation = ((10000 - 8000) / 8000) * 100 = 25.0%
    assert row["variation"] == 25.0
    assert row["variationAmount"] == 2000.0


# --- Balance sheet ---


def test_balance_sheet_basic(client, auth_headers):
    """Balance sheet uses YTD (cumulative) through the requested month."""
    company_id = _create_company(client, auth_headers)

    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": {"Janvier": 50000.0, "Février": 5000.0},
        },
    ], fiscal_year=2024)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash", "link_code": "AC-001"},
    ])
    _upsert_structure(client, auth_headers, company_id, "balance-sheet", [
        {"label": "actifs courants", "isSection": True, "linkCode": "AC-001"},
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/balance-sheet"
        "?fiscal_year=2024&month=2&period=monthly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["statementType"] == "balance-sheet"
    # Balance sheet should be cumulative: 50000 + 5000 = 55000
    assert data["rows"][0]["current"] == 55000.0


# --- Cash flow ---


def test_cash_flow_empty_no_structure(client, auth_headers):
    """Without a cash-flow structure, should return empty rows."""
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["rows"] == []


# --- Summary metrics ---


def test_summary_metrics_basic(client, auth_headers):
    """Summary should extract revenue and net income from income statement."""
    company_id = _create_company(client, auth_headers)

    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4000",
            "description": "Sales Revenue",
            "monthly_amounts": {"Janvier": 10000.0},
        },
    ], fiscal_year=2024)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "Sales Revenue", "link_code": "REV-001"},
    ])
    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {"label": "revenus", "isBold": True, "linkCode": "REV-001"},
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/summary"
        "?fiscal_year=2024&month=1",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["fiscalYear"] == 2024
    assert data["month"] == 1
    assert data["revenue"] == 10000.0


def test_summary_metrics_empty(client, auth_headers):
    """Summary with no data should return zeros."""
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/financial-statements/summary"
        "?fiscal_year=2024&month=1",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["revenue"] == 0
    assert data["netIncome"] == 0
    assert data["totalAssets"] == 0


# --- Structure with detail rows (children) ---


def test_income_statement_with_children(client, auth_headers):
    """Structure rows without linkCode but with children should sum their children."""
    company_id = _create_company(client, auth_headers)

    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4100",
            "description": "Product Sales",
            "monthly_amounts": {"Janvier": 6000.0},
        },
        {
            "account_number": "4200",
            "description": "Service Sales",
            "monthly_amounts": {"Janvier": 4000.0},
        },
    ], fiscal_year=2024)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4100", "description": "Product Sales", "link_code": "REV-PROD"},
        {"account_number": "4200", "description": "Service Sales", "link_code": "REV-SVC"},
    ])

    # Parent row has children instead of its own linkCode
    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {
            "label": "revenus totaux",
            "isBold": True,
            "isSection": True,
            "children": [
                {"label": "ventes de produits", "linkCode": "REV-PROD"},
                {"label": "ventes de services", "linkCode": "REV-SVC"},
            ],
        },
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=1&period=monthly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    row = response.json()["rows"][0]
    # Parent should sum children: 6000 + 4000 = 10000
    assert row["current"] == 10000.0
    assert len(row["detailRows"]) == 2
    assert row["detailRows"][0]["current"] == 6000.0
    assert row["detailRows"][1]["current"] == 4000.0


# --- Multiple accounts per link code ---


def test_multiple_accounts_same_link_code(client, auth_headers):
    """Multiple accounts mapped to the same link code should be summed."""
    company_id = _create_company(client, auth_headers)

    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4100",
            "description": "Product Revenue",
            "monthly_amounts": {"Janvier": 3000.0},
        },
        {
            "account_number": "4200",
            "description": "Service Revenue",
            "monthly_amounts": {"Janvier": 7000.0},
        },
    ], fiscal_year=2024)

    # Both accounts have the same link code
    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4100", "description": "Product Revenue", "link_code": "REV-001"},
        {"account_number": "4200", "description": "Service Revenue", "link_code": "REV-001"},
    ])
    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {"label": "revenus", "isBold": True, "linkCode": "REV-001"},
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=1&period=monthly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    # Should sum both: 3000 + 7000 = 10000
    assert response.json()["rows"][0]["current"] == 10000.0


# --- Variation calculation edge cases ---


def test_variation_zero_prior(client, auth_headers):
    """When prior is zero, variation should be 0."""
    company_id = _create_company(client, auth_headers)

    # Only current year data, no prior year
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4000",
            "description": "Revenue",
            "monthly_amounts": {"Janvier": 5000.0},
        },
    ], fiscal_year=2024)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "Revenue", "link_code": "REV-001"},
    ])
    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {"label": "revenus", "linkCode": "REV-001"},
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=1&period=monthly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    row = response.json()["rows"][0]
    assert row["current"] == 5000.0
    assert row["prior"] == 0.0
    assert row["variation"] == 0.0


# --- Authorization ---


def test_financial_statements_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/financial-statements/income-statement?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_financial_statements_unauthenticated(client):
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/financial-statements/income-statement?fiscal_year=2024",
    )
    assert response.status_code == 403


def test_balance_sheet_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/financial-statements/balance-sheet?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_summary_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/financial-statements/summary?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Series endpoint ---


def test_series_returns_12_periods(client, auth_headers):
    """Series with months=12 should return 12 periods."""
    company_id = _setup_income_statement_data(client, auth_headers)

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement/series"
        "?fiscal_year=2024&months=12",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["companyId"] == company_id
    assert data["statementType"] == "income-statement"
    assert data["fiscalYear"] == 2024
    assert len(data["periods"]) == 12
    assert len(data["rows"]) == 3


def test_series_amounts_match_single_period(client, auth_headers):
    """Series amounts should match what the single-period endpoint returns for each month."""
    company_id = _setup_income_statement_data(client, auth_headers)

    # Get series data
    series_response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement/series"
        "?fiscal_year=2024&months=12",
        headers=auth_headers,
    )
    assert series_response.status_code == 200
    series_data = series_response.json()

    # Get single month data for month=1 (Janvier)
    single_response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=1&period=monthly",
        headers=auth_headers,
    )
    assert single_response.status_code == 200
    single_data = single_response.json()

    # Revenue in series for fiscal month 1 should match single period month 1
    rev_series = series_data["rows"][0]
    rev_single = single_data["rows"][0]
    assert rev_series["amounts"]["2024-1"] == rev_single["current"]

    # COGS
    cogs_series = series_data["rows"][1]
    cogs_single = single_data["rows"][1]
    assert cogs_series["amounts"]["2024-1"] == cogs_single["current"]

    # OpEx
    opex_series = series_data["rows"][2]
    opex_single = single_data["rows"][2]
    assert opex_series["amounts"]["2024-1"] == opex_single["current"]


def test_series_24_months_spans_two_years(client, auth_headers):
    """Series with months=24 should include data from two fiscal years."""
    company_id = _create_company(client, auth_headers)

    # Year 2023 data
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4000",
            "description": "Sales Revenue",
            "monthly_amounts": {"Janvier": 8000.0},
        },
    ], fiscal_year=2023)

    # Year 2024 data
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4000",
            "description": "Sales Revenue",
            "monthly_amounts": {"Janvier": 10000.0, "Février": 12000.0},
        },
    ], fiscal_year=2024)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "Sales Revenue", "link_code": "REV-001"},
    ])
    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {"label": "revenus", "isBold": True, "linkCode": "REV-001"},
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement/series"
        "?fiscal_year=2024&months=24",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["periods"]) == 24

    rev_row = data["rows"][0]
    # 2023 month 1 should be 8000
    assert rev_row["amounts"]["2023-1"] == 8000.0
    # 2024 month 1 should be 10000
    assert rev_row["amounts"]["2024-1"] == 10000.0
    # 2024 month 2 should be 12000
    assert rev_row["amounts"]["2024-2"] == 12000.0


def test_series_with_children(client, auth_headers):
    """Series should handle structure rows with children correctly."""
    company_id = _create_company(client, auth_headers)

    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4100",
            "description": "Product Sales",
            "monthly_amounts": {"Janvier": 6000.0, "Février": 7000.0},
        },
        {
            "account_number": "4200",
            "description": "Service Sales",
            "monthly_amounts": {"Janvier": 4000.0, "Février": 5000.0},
        },
    ], fiscal_year=2024)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4100", "description": "Product Sales", "link_code": "REV-PROD"},
        {"account_number": "4200", "description": "Service Sales", "link_code": "REV-SVC"},
    ])

    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {
            "label": "revenus totaux",
            "isBold": True,
            "isSection": True,
            "children": [
                {"label": "ventes de produits", "linkCode": "REV-PROD"},
                {"label": "ventes de services", "linkCode": "REV-SVC"},
            ],
        },
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement/series"
        "?fiscal_year=2024&months=12",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    parent = data["rows"][0]
    # Parent should sum children
    assert parent["amounts"]["2024-1"] == 10000.0
    assert parent["amounts"]["2024-2"] == 12000.0
    # Detail rows
    assert len(parent["detailRows"]) == 2
    assert parent["detailRows"][0]["amounts"]["2024-1"] == 6000.0
    assert parent["detailRows"][1]["amounts"]["2024-1"] == 4000.0


def test_series_empty_no_structure(client, auth_headers):
    """Series without a statement structure should return empty rows and periods."""
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow/series"
        "?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["rows"] == []
    assert data["periods"] == []


def test_series_company_not_found(client, auth_headers):
    """Series with non-existent company should return 404."""
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/financial-statements/income-statement/series"
        "?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Summary series endpoint ---


def test_summary_series_returns_12_months(client, auth_headers):
    """Summary series should return 12 months of data."""
    company_id = _setup_income_statement_data(client, auth_headers)

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/summary/series"
        "?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["fiscalYear"] == 2024
    assert len(data["months"]) == 12

    # Month 1 (Janvier) should have revenue=10000
    m1 = data["months"][0]
    assert m1["month"] == 1
    assert m1["revenue"] == 10000.0

    # Month 2 (Février) should have revenue=22000 (YTD: 10000+12000)
    m2 = data["months"][1]
    assert m2["month"] == 2
    assert m2["revenue"] == 22000.0


def test_summary_series_empty(client, auth_headers):
    """Summary series with no data should return 12 months of zeros."""
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/financial-statements/summary/series"
        "?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["months"]) == 12
    for m in data["months"]:
        assert m["revenue"] == 0
        assert m["netIncome"] == 0
        assert m["totalAssets"] == 0


def test_summary_series_company_not_found(client, auth_headers):
    """Summary series with non-existent company should return 404."""
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/financial-statements/summary/series"
        "?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 404
