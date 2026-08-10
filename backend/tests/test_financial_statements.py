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

    # Mapping comptable requis avant les montants de balance
    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "Sales Revenue", "link_code": "REV-001"},
        {"account_number": "5000", "description": "Cost of Goods Sold", "link_code": "COGS-001"},
        {"account_number": "6000", "description": "Operating Expenses", "link_code": "OPEX-001"},
    ])

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


def test_balance_sheet_default_structure_no_data(client, auth_headers):
    """A new company has a seeded BS structure; with no trial balance data rows return zeros."""
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/financial-statements/balance-sheet?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["companyId"] == company_id
    assert data["statementType"] == "balance-sheet"
    assert data["fiscalYear"] == 2024
    assert len(data["rows"]) > 0
    assert all(r["current"] == 0.0 for r in data["rows"])


def test_statement_empty_no_structure(client, auth_headers, db):
    """When the cash-flow structure row is deleted, fallback to DEFAULT_STRUCTURES."""
    import uuid as _uuid
    from app.models.financial_statement_mapping import CompanyStatementStructure
    company_id = _create_company(client, auth_headers)
    row = db.query(CompanyStatementStructure).filter(
        CompanyStatementStructure.company_id == _uuid.UUID(company_id),
        CompanyStatementStructure.statement_type == "cash-flow",
    ).first()
    if row:
        db.delete(row)
        db.commit()
    response = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["statementType"] == "cash-flow"
    assert len(data["rows"]) > 0


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
    assert rev_row["current"] == -10000.0

    # COGS row (month 1 = 4000)
    cogs_row = data["rows"][1]
    assert cogs_row["current"] == 4000.0

    # OpEx row (month 1 = 2000)
    opex_row = data["rows"][2]
    assert opex_row["current"] == 2000.0


def test_income_statement_group_row_aggregates_mapping_by_groupe(client, auth_headers):
    """Ligne sommaire avec code Groupe uniquement numérique (ex. 20) = somme des comptes
    dont le code de liaison appartient à ce groupe (ex. 20.1 + 20.2 → groupe 20)."""
    company_id = _create_company(client, auth_headers)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "A", "link_code": "20.1"},
        {"account_number": "4001", "description": "B", "link_code": "20.2"},
    ])

    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4000",
            "description": "A",
            "monthly_amounts": {"Janvier": 100.0, "Février": 0.0, "Mars": 0.0},
        },
        {
            "account_number": "4001",
            "description": "B",
            "monthly_amounts": {"Janvier": 300.0, "Février": 0.0, "Mars": 0.0},
        },
    ], fiscal_year=2024)

    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {"label": "revenus", "isBold": True, "isSection": True, "linkCode": "20", "defineMapping": True},
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=1&period=monthly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["rows"]) >= 1
    rev_row = data["rows"][0]
    assert rev_row["label"] == "revenus"
    assert rev_row["current"] == 400.0


def test_income_statement_rev_family_rollup_from_mapping_parents(db, client, auth_headers):
    """Sommaire avec code parent REV = somme des comptes mappés aux feuilles REV (parent REV-A, REV-B, …)."""
    from app.models.standard_link_code import StandardLinkCode

    db.add_all([
        StandardLinkCode(code="REV-A", family="REV", is_leaf=False, parent_code=None, sort_order=1),
        StandardLinkCode(code="REV-A.1", family="REV", is_leaf=True, parent_code="REV-A", sort_order=2),
        StandardLinkCode(code="REV-B", family="REV", is_leaf=False, parent_code=None, sort_order=3),
        StandardLinkCode(code="REV-B.1", family="REV", is_leaf=True, parent_code="REV-B", sort_order=4),
    ])
    db.commit()

    company_id = _create_company(client, auth_headers)
    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "Sales A", "link_code": "REV-A.1"},
        {"account_number": "4001", "description": "Sales B", "link_code": "REV-B.1"},
    ])
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4000",
            "description": "Sales A",
            "monthly_amounts": {"Janvier": 100.0},
        },
        {
            "account_number": "4001",
            "description": "Sales B",
            "monthly_amounts": {"Janvier": 300.0},
        },
    ])
    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {"label": "revenus", "isBold": True, "isSection": True, "linkCode": "REV", "defineMapping": True},
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=1&period=monthly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    rev_row = response.json()["rows"][0]
    assert rev_row["label"] == "revenus"
    assert rev_row["current"] == -400.0


def test_balance_sheet_act_family_rollup_from_mapping_parents(db, client, auth_headers):
    """Sommaire bilan avec code parent ACT = somme des comptes mappés aux feuilles ACT."""
    from app.models.standard_link_code import StandardLinkCode

    db.add_all([
        StandardLinkCode(code="ACT-A", family="ACT", is_leaf=False, parent_code=None, sort_order=1),
        StandardLinkCode(code="ACT-A.1", family="ACT", is_leaf=True, parent_code="ACT-A", sort_order=2),
        StandardLinkCode(code="ACT-B", family="ACT", is_leaf=False, parent_code=None, sort_order=3),
        StandardLinkCode(code="ACT-B.1", family="ACT", is_leaf=True, parent_code="ACT-B", sort_order=4),
    ])
    db.commit()

    company_id = _create_company(client, auth_headers)
    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash A", "link_code": "ACT-A.1"},
        {"account_number": "1100", "description": "Cash B", "link_code": "ACT-B.1"},
    ])
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "1000",
            "description": "Cash A",
            "monthly_amounts": {"Janvier": 1000.0},
        },
        {
            "account_number": "1100",
            "description": "Cash B",
            "monthly_amounts": {"Janvier": 2500.0},
        },
    ])
    _upsert_structure(client, auth_headers, company_id, "balance-sheet", [
        {"label": "actif à court terme", "isBold": True, "isSection": True, "linkCode": "ACT", "defineMapping": True},
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/balance-sheet"
        "?fiscal_year=2024&month=1&period=monthly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    act_row = response.json()["rows"][0]
    assert act_row["label"] == "actif à court terme"
    assert act_row["current"] == 3500.0


def test_balance_sheet_pct_family_applies_dt_ct_multiplier(db, client, auth_headers):
    """Bilan : codes PCT (CT) → montants BV × (-1)."""
    from app.models.standard_link_code import StandardLinkCode

    db.add_all([
        StandardLinkCode(code="PCT-A", family="PCT", is_leaf=False, parent_code=None, sort_order=1),
        StandardLinkCode(code="PCT-A.1", family="PCT", is_leaf=True, parent_code="PCT-A", sort_order=2),
    ])
    db.commit()

    company_id = _create_company(client, auth_headers)
    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "2000", "description": "Payables", "link_code": "PCT-A.1"},
    ])
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "2000",
            "description": "Payables",
            "monthly_amounts": {"Janvier": 5000.0},
        },
    ])
    _upsert_structure(client, auth_headers, company_id, "balance-sheet", [
        {"label": "passif ct", "isBold": True, "isSection": True, "linkCode": "PCT-A", "defineMapping": True},
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/balance-sheet"
        "?fiscal_year=2024&month=1&period=monthly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    row = response.json()["rows"][0]
    assert row["current"] == -5000.0


def test_balance_sheet_annex_detail_sub_line_amounts(db, client, auth_headers):
    """Bilan Détail : sous-ligne ACT-C.2 = somme BV des comptes mappés à ce code de liaison."""
    from app.models.standard_link_code import StandardLinkCode

    db.add_all([
        StandardLinkCode(code="ACT-C", family="ACT", is_leaf=False, parent_code=None, sort_order=10),
        StandardLinkCode(code="ACT-C.1", family="ACT", is_leaf=True, parent_code="ACT-C", sort_order=11),
        StandardLinkCode(code="ACT-C.2", family="ACT", is_leaf=True, parent_code="ACT-C", sort_order=12),
    ])
    db.commit()

    company_id = _create_company(client, auth_headers)
    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1200", "description": "Clients", "link_code": "ACT-C.1"},
        {"account_number": "1210", "description": "Clients apprentés", "link_code": "ACT-C.2"},
    ])
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "1200",
            "description": "Clients",
            "monthly_amounts": {"Janvier": 1000.0, "Février": 900.0},
        },
        {
            "account_number": "1210",
            "description": "Clients apprentés",
            "monthly_amounts": {"Janvier": 250.0, "Février": 200.0},
        },
    ])
    _upsert_structure(client, auth_headers, company_id, "balance-sheet", [
        {
            "label": "Comptes clients",
            "linkCode": "ACT-C",
            "liaisonMode": "sum",
            "liaisonSumCodes": ["ACT-C.1", "ACT-C.2"],
            "defineMapping": True,
            "showInDetail": True,
            "annexLetter": "1",
        },
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/balance-sheet"
        "?fiscal_year=2024&month=2&period=monthly&comparison_type=lastMonth",
        headers=auth_headers,
    )
    assert response.status_code == 200
    rows = response.json()["rows"]

    def _find_row_by_code(rs: list, code: str) -> dict | None:
        for row in rs:
            if row.get("id") == code or row.get("linkCode") == code:
                return row
            nested = row.get("detailRows") or []
            for child in nested:
                if child.get("id") == code or child.get("linkCode") == code:
                    return child
        return None

    act_c2 = _find_row_by_code(rows, "ACT-C.2")
    assert act_c2 is not None
    assert act_c2["current"] == 200.0
    assert act_c2["prior"] == 250.0


def test_income_statement_intermediate_parent_rollup(db, client, auth_headers):
    """Code parent intermédiaire (REV-A) = somme des feuilles rattachées dans le mapping."""
    from app.models.standard_link_code import StandardLinkCode

    db.add_all([
        StandardLinkCode(code="REV-A", family="REV", is_leaf=False, parent_code=None, sort_order=1),
        StandardLinkCode(code="REV-A.1", family="REV", is_leaf=True, parent_code="REV-A", sort_order=2),
        StandardLinkCode(code="REV-A.2", family="REV", is_leaf=True, parent_code="REV-A", sort_order=3),
    ])
    db.commit()

    company_id = _create_company(client, auth_headers)
    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "A1", "link_code": "REV-A.1"},
        {"account_number": "4001", "description": "A2", "link_code": "REV-A.2"},
    ])
    _upsert_trial_balance(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "A1", "monthly_amounts": {"Janvier": 50.0}},
        {"account_number": "4001", "description": "A2", "monthly_amounts": {"Janvier": 70.0}},
    ])
    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {"label": "revenus A", "isBold": True, "linkCode": "REV-A", "defineMapping": True},
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=1&period=monthly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    row = response.json()["rows"][0]
    assert row["current"] == -120.0


def test_income_statement_hidden_annex_hides_detail_only_sub_lines(client, auth_headers):
    """Poste sommaire masqué (annexe EXP) : sous-lignes detailOnly sans showInDetail."""
    company_id = _create_company(client, auth_headers)
    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {
            "label": "Frais d'exploitation",
            "linkCode": "EXP",
            "defineMapping": True,
            "showInDetail": True,
            "annexLetter": "A",
            "hidden": True,
            "posteNature": "depenses",
        },
        {
            "label": "EXP sous-ligne",
            "detailOnly": True,
            "linkCode": "EXP.1",
            "defineMapping": True,
            "showInDetail": True,
            "annexLetter": "A",
        },
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=1&period=monthly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    rows = response.json()["rows"]
    detail_rows = [r for r in rows if r.get("detailOnly")]
    assert detail_rows == [] or all(r.get("showInDetail") is not True for r in detail_rows)


def test_income_statement_groupe_row_applies_dt_ct_per_mapped_account(client, auth_headers):
    """Sommaire groupe (ex. 20) : somme des montants balance par compte, CT -> ×(-1), DT inchangé."""
    company_id = _create_company(client, auth_headers)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "A", "link_code": "20.1"},
        {"account_number": "4001", "description": "B", "link_code": "20.2"},
    ])

    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4000",
            "description": "A",
            "monthly_amounts": {"Janvier": 100.0, "Février": 0.0, "Mars": 0.0},
        },
        {
            "account_number": "4001",
            "description": "B",
            "monthly_amounts": {"Janvier": 300.0, "Février": 0.0, "Mars": 0.0},
        },
    ], fiscal_year=2024)

    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {"label": "revenus", "isBold": True, "isSection": True, "linkCode": "20", "defineMapping": True},
        {
            "label": "L20.1",
            "detailOnly": True,
            "linkCode": "20.1",
            "defineMapping": True,
            "showInDetail": True,
            "dtCt": "CT",
            "annexLetter": "A",
        },
        {
            "label": "L20.2",
            "detailOnly": True,
            "linkCode": "20.2",
            "defineMapping": True,
            "showInDetail": True,
            "dtCt": "DT",
            "annexLetter": "A",
        },
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement"
        "?fiscal_year=2024&month=1&period=monthly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    rev_row = data["rows"][0]
    assert rev_row["label"] == "revenus"
    # -100 (CT) + 300 (DT) = 200
    assert rev_row["current"] == 200.0


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

    # Revenue Q1 = -(10000 + 12000 + 11000) = -33000 (REV = CT)
    rev_row = data["rows"][0]
    assert rev_row["current"] == -33000.0

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
    assert rev_row["current"] == -33000.0


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

    # Revenue YTD through Feb = -(10000 + 12000) = -22000
    rev_row = data["rows"][0]
    assert rev_row["current"] == -22000.0


# --- Prior year comparison ---


def test_income_statement_prior_year_comparison(client, auth_headers):
    """Should compute variation against prior year."""
    company_id = _create_company(client, auth_headers)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "Sales Revenue", "link_code": "REV-001"},
    ])

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
    assert row["current"] == -10000.0
    assert row["prior"] == -8000.0
    # Variation = ((-10000 - (-8000)) / |-8000|) * 100 = -25.0%
    assert row["variation"] == -25.0
    assert row["variationAmount"] == -2000.0


# --- Balance sheet ---


def test_balance_sheet_basic_non_cumulative_tb(client, auth_headers):
    """Non-cumulative TB (default): each month already stores the closing balance,
    so the balance sheet at end of February is the February value alone (no sum)."""
    company_id = _create_company(client, auth_headers)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash", "link_code": "AC-001"},
    ])

    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": {"Janvier": 50000.0, "Février": 5000.0},
        },
    ], fiscal_year=2024)
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
    assert data["rows"][0]["current"] == 5000.0


def test_balance_sheet_basic_cumulative_tb(client, auth_headers):
    """Cumulative TB: monthly values are YTD running totals. After de-cumulation
    they become per-month movements; summing 1..fm reconstructs the closing balance."""
    company_id = _create_company(client, auth_headers)
    r = client.patch(
        f"/api/companies/{company_id}",
        json={"is_cumulative_tb": True},
        headers=auth_headers,
    )
    assert r.status_code == 200

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash", "link_code": "AC-001"},
    ])

    # YTD cumulative: end-of-Jan = 50000, end-of-Feb = 55000
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": {"Janvier": 50000.0, "Février": 55000.0},
        },
    ], fiscal_year=2024)
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
    assert data["rows"][0]["current"] == 55000.0


def test_balance_sheet_last_month_prior_closing_when_cumulative_tb(client, auth_headers):
    """Avec balance cumulative, « mois dernier » = solde de clôture à fin M-1 (YTD 1..M-1), pas le seul mois M-1."""
    company_id = _create_company(client, auth_headers)
    r = client.patch(
        f"/api/companies/{company_id}",
        json={"is_cumulative_tb": True},
        headers=auth_headers,
    )
    assert r.status_code == 200

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Cash", "link_code": "A"},
    ])

    # YTD cumulatif : jan=100, fév=250, mars=450 → dé-cum : fév +150, mars +200 ; fin fév = 250, fin mars = 450
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "1000",
            "description": "Cash",
            "monthly_amounts": {"Janvier": 100.0, "Février": 250.0, "Mars": 450.0},
        },
    ], fiscal_year=2024)

    _upsert_structure(client, auth_headers, company_id, "balance-sheet", [
        {"label": "Encaisse", "isSection": True, "linkCode": "A"},
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/balance-sheet"
        "?fiscal_year=2024&month=3&period=monthly&comparison_type=lastMonth",
        headers=auth_headers,
    )
    assert response.status_code == 200
    row = response.json()["rows"][0]
    assert row["current"] == 450.0
    # Bug corrigé : avant, prior = seulement l’activité du MF2 (150) au lieu du solde fin fév (250)
    assert row["prior"] == 250.0


# --- Cash flow ---


def test_cash_flow_returns_default_rows_for_new_company(client, auth_headers):
    """A new company (seeded cash-flow default) computes non-empty cash-flow rows."""
    company_id = _create_company(client, auth_headers, name="CF Co")
    r = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow",
        params={"fiscal_year": 2026, "month": 12},
        headers=auth_headers,
    )
    assert r.status_code == 200
    rows = r.json()["rows"]
    assert len(rows) > 0
    labels = [row["label"].lower() for row in rows]
    assert any("exploitation" in l for l in labels)


def test_compute_falls_back_to_default_when_structure_missing(client, auth_headers, db):
    """Deleting the seeded cash-flow structure still returns non-empty rows via fallback."""
    import uuid as _uuid
    from app.models.financial_statement_mapping import CompanyStatementStructure
    company_id = _create_company(client, auth_headers, name="No-CF Co")
    row = db.query(CompanyStatementStructure).filter(
        CompanyStatementStructure.company_id == _uuid.UUID(company_id),
        CompanyStatementStructure.statement_type == "cash-flow",
    ).first()
    if row:
        db.delete(row)
        db.commit()
    r = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow",
        params={"fiscal_year": 2026, "month": 12},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert len(r.json()["rows"]) > 0


def test_cash_flow_annex_row_includes_gl_detail_rows(client, auth_headers):
    """Cash-flow rows marked for detail expose their linked GL accounts."""
    company_id = _create_company(client, auth_headers, name="CF Detail Co")
    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Bank account", "link_code": "CF-CASH"},
    ])
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "1000",
            "description": "Bank account",
            "monthly_amounts": {"Janvier": 1250.0},
        },
    ], fiscal_year=2026)
    _upsert_structure(client, auth_headers, company_id, "cash-flow", [
        {
            "label": "trésorerie encaissée",
            "linkCode": "CF-CASH",
            "defineMapping": True,
            "showInDetail": True,
            "annexLetter": "A",
        },
    ])

    r = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow",
        params={"fiscal_year": 2026, "month": 1},
        headers=auth_headers,
    )
    assert r.status_code == 200
    row = r.json()["rows"][0]
    assert row["showInDetail"] is True
    assert row["annexLetter"] == "A"
    assert row["detailRows"][0]["id"] == "1000"
    assert "Bank account" in row["detailRows"][0]["label"]
    assert row["detailRows"][0]["current"] == 1250.0


def test_cash_flow_custom_tex_code_aggregates_attached_codes(client, auth_headers, su_headers):
    """A TEX family code sums accounts mapped to its attached Bilan/CDR codes."""
    company_id = _create_company(client, auth_headers, name="CF TEX Co")

    leaf = client.post(
        "/api/standard-link-codes",
        json={
            "code": "CF-REV-1",
            "family": "REV",
            "label_sub_account": "Feuille exploitation",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert leaf.status_code == 201

    tex_code = client.post(
        "/api/standard-link-codes",
        json={
            "code": "TEX-CF-1",
            "family": "TEX",
            "label_sub_account": "Exploitation agrégée",
            "attached_link_codes": ["CF-REV-1"],
        },
        headers=su_headers,
    )
    assert tex_code.status_code == 201

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4100", "description": "Revenue A", "link_code": "CF-REV-1"},
        {"account_number": "4101", "description": "Revenue B", "link_code": "CF-REV-1"},
    ])
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4100",
            "description": "Revenue A",
            "monthly_amounts": {"Janvier": 100.0},
        },
        {
            "account_number": "4101",
            "description": "Revenue B",
            "monthly_amounts": {"Janvier": 50.0},
        },
    ], fiscal_year=2026)
    _upsert_structure(client, auth_headers, company_id, "cash-flow", [
        {
            "label": "Exploitation agrégée",
            "linkCode": "TEX-CF-1",
            "liaisonMode": "single",
            "defineMapping": True,
        },
    ])

    r = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow",
        params={"fiscal_year": 2026, "month": 1},
        headers=auth_headers,
    )
    assert r.status_code == 200
    row = r.json()["rows"][0]
    assert row["current"] == 150.0


def test_cash_flow_detail_custom_tex_code_aggregates_attached_codes(client, auth_headers, su_headers):
    """Detail structure link codes sum accounts via attached Bilan/CDR codes (same as summary)."""
    company_id = _create_company(client, auth_headers, name="CF Detail TEX Co")

    leaf = client.post(
        "/api/standard-link-codes",
        json={
            "code": "CFD-REV-1",
            "family": "REV",
            "label_sub_account": "Feuille exploitation détail",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert leaf.status_code == 201

    tex_code = client.post(
        "/api/standard-link-codes",
        json={
            "code": "TEX-CFD-1",
            "family": "TEX",
            "label_sub_account": "Exploitation détail agrégée",
            "attached_link_codes": ["CFD-REV-1"],
        },
        headers=su_headers,
    )
    assert tex_code.status_code == 201

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4200", "description": "Revenue A", "link_code": "CFD-REV-1"},
        {"account_number": "4201", "description": "Revenue B", "link_code": "CFD-REV-1"},
    ])
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4200",
            "description": "Revenue A",
            "monthly_amounts": {"Janvier": 80.0},
        },
        {
            "account_number": "4201",
            "description": "Revenue B",
            "monthly_amounts": {"Janvier": 40.0},
        },
    ], fiscal_year=2026)
    _upsert_structure(client, auth_headers, company_id, "cash-flow-detail", [
        {
            "label": "Exploitation détail agrégée",
            "linkCode": "TEX-CFD-1",
            "liaisonMode": "single",
            "defineMapping": True,
        },
    ])

    r = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow-detail",
        params={"fiscal_year": 2026, "month": 1},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json()["statementType"] == "cash-flow-detail"
    row = r.json()["rows"][0]
    assert row["current"] == 120.0


def test_cash_flow_series_annex_row_includes_gl_detail_rows(client, auth_headers):
    """Cash-flow series keeps GL detail rows for annex-enabled rows."""
    company_id = _create_company(client, auth_headers, name="CF Series Detail Co")
    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "1000", "description": "Bank account", "link_code": "CF-CASH"},
    ])
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "1000",
            "description": "Bank account",
            "monthly_amounts": {"Janvier": 1250.0},
        },
    ], fiscal_year=2026)
    _upsert_structure(client, auth_headers, company_id, "cash-flow", [
        {
            "label": "trésorerie encaissée",
            "linkCode": "CF-CASH",
            "defineMapping": True,
            "showInDetail": True,
            "annexLetter": "A",
        },
    ])

    r = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow/series",
        params={"fiscal_year": 2026, "month": 1, "months": 1},
        headers=auth_headers,
    )
    assert r.status_code == 200
    row = r.json()["rows"][0]
    assert row["showInDetail"] is True
    assert row["detailRows"][0]["id"] == "1000"
    assert row["detailRows"][0]["amounts"]["2026-1"] == 1250.0


# --- Summary metrics ---


def test_summary_metrics_basic(client, auth_headers):
    """Summary should extract revenue and net income from income statement."""
    company_id = _create_company(client, auth_headers)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "Sales Revenue", "link_code": "REV-001"},
    ])

    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4000",
            "description": "Sales Revenue",
            "monthly_amounts": {"Janvier": 10000.0},
        },
    ], fiscal_year=2024)
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
    assert data["revenue"] == -10000.0


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

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4100", "description": "Product Sales", "link_code": "REV-PROD"},
        {"account_number": "4200", "description": "Service Sales", "link_code": "REV-SVC"},
    ])

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
    assert row["current"] == -10000.0
    assert len(row["detailRows"]) == 2
    assert row["detailRows"][0]["current"] == -6000.0
    assert row["detailRows"][1]["current"] == -4000.0


# --- Multiple accounts per link code ---


def test_multiple_accounts_same_link_code(client, auth_headers):
    """Multiple accounts mapped to the same link code should be summed."""
    company_id = _create_company(client, auth_headers)

    # Both accounts have the same link code
    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4100", "description": "Product Revenue", "link_code": "REV-001"},
        {"account_number": "4200", "description": "Service Revenue", "link_code": "REV-001"},
    ])
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
    assert response.json()["rows"][0]["current"] == -10000.0


# --- Variation calculation edge cases ---


def test_variation_zero_prior(client, auth_headers):
    """When prior is zero, variation should be 0."""
    company_id = _create_company(client, auth_headers)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "Revenue", "link_code": "REV-001"},
    ])

    # Only current year data, no prior year
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4000",
            "description": "Revenue",
            "monthly_amounts": {"Janvier": 5000.0},
        },
    ], fiscal_year=2024)
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
    assert row["current"] == -5000.0
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
    assert response.status_code in (401, 403)


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


def test_series_anchored_on_reference_month(client, auth_headers):
    """Series periods must end at the requested reference month, not default December."""
    company_id = _setup_income_statement_data(client, auth_headers)

    dec_response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement/series"
        "?fiscal_year=2024&month=12&months=12",
        headers=auth_headers,
    )
    assert dec_response.status_code == 200
    dec_labels = [p["label"] for p in dec_response.json()["periods"]]
    assert dec_labels[-1] == "Déc 2024"
    assert dec_labels[0] == "Jan 2024"

    jan_response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement/series"
        "?fiscal_year=2024&month=1&months=12",
        headers=auth_headers,
    )
    assert jan_response.status_code == 200
    jan_labels = [p["label"] for p in jan_response.json()["periods"]]
    assert jan_labels[-1] == "Jan 2024"
    assert jan_labels[0] == "Fév 2023"


def test_series_includes_supplementary_link_codes_from_sum_lists(client, auth_headers):
    """Codes only referenced in liaisonSumCodes must still be addressable in chart series."""
    company_id = _create_company(client, auth_headers)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "Sales A", "link_code": "REV-A"},
        {"account_number": "4100", "description": "Sales B", "link_code": "REV-B"},
    ])
    _upsert_trial_balance(client, auth_headers, company_id, [
        {
            "account_number": "4000",
            "description": "Sales A",
            "monthly_amounts": {"Janvier": 10000.0},
        },
        {
            "account_number": "4100",
            "description": "Sales B",
            "monthly_amounts": {"Janvier": 5000.0},
        },
    ], fiscal_year=2024)
    _upsert_structure(client, auth_headers, company_id, "income-statement", [
        {
            "label": "Revenus",
            "liaisonMode": "sum",
            "liaisonSumCodes": ["REV-A", "REV-B"],
        },
    ])

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement/series"
        "?fiscal_year=2024&month=1&months=1",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    by_code = {r.get("linkCode"): r for r in data["rows"] if r.get("linkCode")}
    assert "REV-A" in by_code
    assert "REV-B" in by_code
    assert by_code["REV-A"]["amounts"]["2024-1"] == -10000.0
    assert by_code["REV-B"]["amounts"]["2024-1"] == -5000.0


def test_series_computes_baiia_row_from_income_families(client, auth_headers):
    """The BAIIA summary row (isEBITA) must expose computed amounts in series."""
    company_id = _setup_income_statement_data(client, auth_headers)

    response = client.get(
        f"/api/companies/{company_id}/financial-statements/income-statement/series"
        "?fiscal_year=2024&month=1&months=1",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    baiia = next((r for r in data["rows"] if str(r.get("label", "")).lower() == "baiia"), None)
    assert baiia is not None
    # REV -10000 ; COGS/OPEX ne sont pas des familles CMV/EXP → seul REV compte ici
    assert baiia["amounts"]["2024-1"] == -10000.0


def test_series_24_months_spans_two_years(client, auth_headers):
    """Series with months=24 should include data from two fiscal years."""
    company_id = _create_company(client, auth_headers)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4000", "description": "Sales Revenue", "link_code": "REV-001"},
    ])

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
    # 2023 month 1 should be -8000 (REV = CT)
    assert rev_row["amounts"]["2023-1"] == -8000.0
    # 2024 month 1 should be -10000
    assert rev_row["amounts"]["2024-1"] == -10000.0
    # 2024 month 2 should be -12000
    assert rev_row["amounts"]["2024-2"] == -12000.0


def test_series_with_children(client, auth_headers):
    """Series should handle structure rows with children correctly."""
    company_id = _create_company(client, auth_headers)

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": "4100", "description": "Product Sales", "link_code": "REV-PROD"},
        {"account_number": "4200", "description": "Service Sales", "link_code": "REV-SVC"},
    ])

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
    assert parent["amounts"]["2024-1"] == -10000.0
    assert parent["amounts"]["2024-2"] == -12000.0
    # Detail rows
    assert len(parent["detailRows"]) == 2
    assert parent["detailRows"][0]["amounts"]["2024-1"] == -6000.0
    assert parent["detailRows"][1]["amounts"]["2024-1"] == -4000.0


def test_series_empty_no_structure(client, auth_headers, db):
    """Series with structure deleted falls back to default (non-empty rows)."""
    import uuid as _uuid
    from app.models.financial_statement_mapping import CompanyStatementStructure
    company_id = _create_company(client, auth_headers)
    row = db.query(CompanyStatementStructure).filter(
        CompanyStatementStructure.company_id == _uuid.UUID(company_id),
        CompanyStatementStructure.statement_type == "cash-flow",
    ).first()
    if row:
        db.delete(row)
        db.commit()
    response = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow/series"
        "?fiscal_year=2024",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["rows"]) > 0


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

    # Month 1 (Janvier) should have revenue=-10000 (REV = CT)
    m1 = data["months"][0]
    assert m1["month"] == 1
    assert m1["revenue"] == -10000.0

    # Month 2 (Février) should have revenue=-22000 (YTD: -(10000+12000))
    m2 = data["months"][1]
    assert m2["month"] == 2
    assert m2["revenue"] == -22000.0


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


def test_sum_for_link_code_single_month_alt_asset_cost_only():
    """ALT-B/C/D sums with alt_asset_cost_only include only Coût-mapped accounts."""
    from decimal import Decimal
    from types import SimpleNamespace

    from app.services.financial_statements import (
        _account_included_for_alt_asset_cost_only,
        _alt_asset_cost_only_ctx,
        _sum_for_link_code_single_month,
    )

    mapping_cost = SimpleNamespace(
        link_code="ALT-B.1",
        alt_asset_cost=True,
        alt_accumulated_amortization=False,
    )
    mapping_accum = SimpleNamespace(
        link_code="ALT-B.1",
        alt_asset_cost=False,
        alt_accumulated_amortization=True,
    )

    token = _alt_asset_cost_only_ctx.set(True)
    try:
        assert _account_included_for_alt_asset_cost_only(mapping_cost, "ALT-B.1") is True
        assert _account_included_for_alt_asset_cost_only(mapping_accum, "ALT-B.1") is False
        assert _account_included_for_alt_asset_cost_only(None, "ALT-B.1") is False
        assert _account_included_for_alt_asset_cost_only(mapping_cost, "ACT-A.1") is True
    finally:
        _alt_asset_cost_only_ctx.reset(token)

    mappings_by_account = {
        "1500": mapping_cost,
        "1590": mapping_accum,
    }
    mapping_index = {"ALT-B.1": ["1500", "1590"]}
    amount_index = {
        "1500": {12: Decimal("100000")},
        "1590": {12: Decimal("-40000")},
    }

    token = _alt_asset_cost_only_ctx.set(True)
    try:
        cost_only = _sum_for_link_code_single_month(
            "ALT-B.1",
            mapping_index,
            amount_index,
            12,
            mappings_by_account=mappings_by_account,
            statement_type="balance-sheet",
        )
    finally:
        _alt_asset_cost_only_ctx.reset(token)

    full = _sum_for_link_code_single_month(
        "ALT-B.1",
        mapping_index,
        amount_index,
        12,
        mappings_by_account=mappings_by_account,
        statement_type="balance-sheet",
    )

    assert cost_only == 100_000.0
    assert full == 60_000.0


def test_balance_sheet_gl_detail_rows_alt_asset_cost_only():
    """GL breakdown excludes Amortissement cumulé when alt_asset_cost_only is on."""
    from decimal import Decimal
    from types import SimpleNamespace

    from app.services.financial_statements import (
        _alt_asset_cost_only_ctx,
        _balance_sheet_gl_detail_rows_for_link_codes,
    )

    mapping_cost = SimpleNamespace(
        link_code="ALT-B.1",
        description="Machinerie",
        alt_asset_cost=True,
        alt_accumulated_amortization=False,
    )
    mapping_accum = SimpleNamespace(
        link_code="ALT-B.1",
        description="Amort. machinerie",
        alt_asset_cost=False,
        alt_accumulated_amortization=True,
    )
    mappings_by_account = {
        "1640": mapping_cost,
        "1635": mapping_accum,
    }
    mapping_index = {"ALT-B.1": ["1640", "1635"]}
    amount_index = {
        "1640": {12: Decimal("-600000")},
        "1635": {12: Decimal("250472")},
    }

    token = _alt_asset_cost_only_ctx.set(True)
    try:
        rows = _balance_sheet_gl_detail_rows_for_link_codes(
            ["ALT-B.1"],
            mapping_index,
            amount_index,
            amount_index,
            [12],
            [12],
            None,
            None,
            None,
            None,
            mappings_by_account,
            None,
            None,
            None,
        )
    finally:
        _alt_asset_cost_only_ctx.reset(token)

    assert [r["id"] for r in rows] == ["1640"]
