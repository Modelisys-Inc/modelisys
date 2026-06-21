import io
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


def test_list_statement_structures_seeded_defaults(client, auth_headers):
    """A new company should have IS and BS seeded by default."""
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/statement-structures", headers=auth_headers
    )
    assert response.status_code == 200
    structures = response.json()["structures"]
    types = {s["statement_type"] for s in structures}
    assert "income-statement" in types
    assert "balance-sheet" in types


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

    # Verify IS was updated (BS + CF defaults still present → 4 total)
    list_response = client.get(
        f"/api/companies/{company_id}/statement-structures", headers=auth_headers
    )
    types = {s["statement_type"] for s in list_response.json()["structures"]}
    assert "income-statement" in types
    assert "balance-sheet" in types
    assert "cash-flow" in types
    assert "cash-flow-detail" in types


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
    assert len(structures) == 4
    types = {s["statement_type"] for s in structures}
    assert types == {"income-statement", "balance-sheet", "cash-flow", "cash-flow-detail"}


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


def _make_csv(rows_data, with_link_codes=False):
    """Helper to create a CSV file matching the expected format.

    rows_data: list of tuples (nom, cat, typ, classement) or
               (nom, cat, typ, classement, link_code) when with_link_codes=True.
    """
    if with_link_codes:
        lines = [",,,,,,\n", ",,,,,,\n", ",Nom de compte,Catégories,Types,Classement,Code de liaison\n"]
        for row in rows_data:
            nom, cat, typ, classement = row[0], row[1], row[2], row[3]
            link_code = row[4] if len(row) > 4 else ""
            lines.append(f",{nom},{cat},{typ},{classement},{link_code}\n")
    else:
        lines = [",,,,\n", ",,,,\n", ",Nom de compte,Catégories,Types,Classement\n"]
        for nom, cat, typ, classement in rows_data:
            lines.append(f",{nom},{cat},{typ},{classement}\n")
    return "".join(lines).encode("utf-8")


def test_csv_import_balance_sheet(client, auth_headers):
    """CSV rows for Actif/Passif/Capitaux propres merge into balance sheet."""
    company_id = _create_company(client, auth_headers)
    csv_data = _make_csv([
        ("Encaisse", "Actif", "Court terme", "1"),
        ("Débiteurs", "Actif", "Court terme", "2"),
        ("Immobilisations corporelles", "Actif", "Long terme", "1"),
        ("Marge de crédit", "Passif", "Court terme", "1"),
        ("Dette à long terme", "Passif", "Long terme", "1"),
        ("Capital-action", "Capitaux propres", "n/a", "1"),
    ])
    response = client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["balance_sheet_rows_added"] == 6
    assert data["income_statement_rows_added"] == 0

    # Verify balance sheet structure was created
    bs = client.get(
        f"/api/companies/{company_id}/statement-structures/balance-sheet",
        headers=auth_headers,
    )
    assert bs.status_code == 200
    labels = [r["label"].lower() for r in bs.json()["structure"]]
    assert "encaisse" in labels
    assert "débiteurs" in labels
    assert "immobilisations corporelles" in labels


def test_csv_import_income_statement(client, auth_headers):
    """CSV rows for Revenus/Charges/Impôts merge as detailRows."""
    company_id = _create_company(client, auth_headers)
    csv_data = _make_csv([
        ("Revenus de développement", "Revenus", "n/a", "1"),
        ("Revenus de licences", "Revenus", "n/a", "2"),
        ("Main-d'oeuvre directe", "Coûts des produits vendus", "n/a", "1"),
        ("Salaires administratifs", "Charges", "Frais d'administration", "1"),
        ("Intérêts bancaires", "Charges", "Frais financiers", "1"),
        ("Impôts", "Impôts", "n/a", "1"),
    ])
    response = client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["income_statement_rows_added"] == 6

    # Verify income statement detailRows
    is_resp = client.get(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        headers=auth_headers,
    )
    assert is_resp.status_code == 200
    structure = is_resp.json()["structure"]
    revenus_row = next(r for r in structure if r.get("label", "").lower() == "revenus")
    assert len(revenus_row["detailRows"]) == 2
    assert revenus_row["isExpanded"] is True


def test_csv_import_merge_no_duplicates(client, auth_headers):
    """Importing the same CSV twice should not create duplicates."""
    company_id = _create_company(client, auth_headers)
    csv_data = _make_csv([
        ("Encaisse", "Actif", "Court terme", "1"),
        ("Revenus de licences", "Revenus", "n/a", "1"),
    ])
    # Import twice
    client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
        headers=auth_headers,
    )
    response = client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["balance_sheet_rows_added"] == 0
    assert response.json()["income_statement_rows_added"] == 0
    assert response.json()["skipped"] == 2


def test_csv_import_latin1_encoding(client, auth_headers):
    """CSV with Latin-1 encoding should be handled."""
    company_id = _create_company(client, auth_headers)
    csv_text = ",,,,\n,,,,\n,Nom de compte,Catégories,Types,Classement\n,Débiteurs,Actif,Court terme,1\n"
    csv_bytes = csv_text.encode("latin-1")
    response = client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(csv_bytes), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["balance_sheet_rows_added"] == 1


def test_csv_import_invalid_file(client, auth_headers):
    """Non-CSV content without header should return 400."""
    company_id = _create_company(client, auth_headers)
    response = client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(b"not a csv at all"), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_csv_import_unauthenticated(client):
    """Unauthenticated request should return 403."""
    fake_id = str(uuid.uuid4())
    response = client.post(
        f"/api/companies/{fake_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(b"data"), "text/csv")},
    )
    assert response.status_code == 403


def test_csv_import_with_link_codes(client, auth_headers):
    """CSV with 5th column 'Code de liaison' should set linkCode on imported rows."""
    company_id = _create_company(client, auth_headers)
    csv_data = _make_csv([
        ("Encaisse", "Actif", "Court terme", "1", "A"),
        ("Débiteurs", "Actif", "Court terme", "2", "C"),
        ("Dette à long terme", "Passif", "Long terme", "1", "KK"),
        ("Capital-action", "Capitaux propres", "n/a", "1", "UU"),
        ("Revenus dev", "Revenus", "n/a", "1", "20-101"),
        ("Salaires admin", "Charges", "Frais d'administration", "1", "44-330"),
    ], with_link_codes=True)
    response = client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["balance_sheet_rows_added"] == 4
    assert data["income_statement_rows_added"] == 2

    # Verify balance sheet rows have linkCode
    bs = client.get(
        f"/api/companies/{company_id}/statement-structures/balance-sheet",
        headers=auth_headers,
    )
    assert bs.status_code == 200
    bs_rows = bs.json()["structure"]
    encaisse = next(r for r in bs_rows if r.get("label", "").lower() == "encaisse")
    assert encaisse["linkCode"] == "A"
    debiteurs = next(r for r in bs_rows if r.get("label", "").lower() == "débiteurs")
    assert debiteurs["linkCode"] == "C"
    capital = next(r for r in bs_rows if r.get("label", "").lower() == "capital-action")
    assert capital["linkCode"] == "UU"

    # Verify income statement detailRows have linkCode
    is_resp = client.get(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        headers=auth_headers,
    )
    assert is_resp.status_code == 200
    is_structure = is_resp.json()["structure"]
    revenus_row = next(r for r in is_structure if r.get("label", "").lower() == "revenus")
    assert len(revenus_row["detailRows"]) == 1
    assert revenus_row["detailRows"][0]["linkCode"] == "20-101"

    admin_row = next(r for r in is_structure if r.get("label", "").lower() == "frais d'administration")
    assert len(admin_row["detailRows"]) == 1
    assert admin_row["detailRows"][0]["linkCode"] == "44-330"


def test_get_cash_flow_structure_returns_default_when_unset(client, auth_headers):
    """An unconfigured company returns the standard cash-flow default, not empty."""
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/statement-structures/cash-flow",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["statement_type"] == "cash-flow"
    labels = [r["label"].lower() for r in data["structure"]]
    assert any("exploitation" in l for l in labels)
    assert any("investissement" in l for l in labels)
    assert any("financement" in l for l in labels)


def test_new_company_seeds_cash_flow_structure(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/statement-structures", headers=auth_headers
    )
    assert response.status_code == 200
    types = {s["statement_type"] for s in response.json()["structures"]}
    assert "cash-flow" in types


def test_csv_import_without_link_codes_column(client, auth_headers):
    """CSV without 5th column should still work (linkCode not set)."""
    company_id = _create_company(client, auth_headers)
    csv_data = _make_csv([
        ("Encaisse", "Actif", "Court terme", "1"),
        ("Revenus dev", "Revenus", "n/a", "1"),
    ])
    response = client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["balance_sheet_rows_added"] == 1

    # Verify no linkCode on balance sheet row
    bs = client.get(
        f"/api/companies/{company_id}/statement-structures/balance-sheet",
        headers=auth_headers,
    )
    encaisse = next(r for r in bs.json()["structure"] if r.get("label", "").lower() == "encaisse")
    assert "linkCode" not in encaisse
