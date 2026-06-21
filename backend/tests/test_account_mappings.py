import uuid


def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


def test_list_account_mappings_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(f"/api/companies/{company_id}/account-mappings", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["mappings"] == []


def test_upsert_account_mappings_create(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    entries = [
        {"account_number": "1000", "description": "Cash"},
        {"account_number": "2000", "description": "Accounts Payable", "fdrhc": True},
    ]
    response = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=entries,
        headers=auth_headers,
    )
    assert response.status_code == 200
    mappings = response.json()["mappings"]
    assert len(mappings) == 2
    assert mappings[0]["account_number"] == "1000"
    assert mappings[0]["description"] == "Cash"
    assert mappings[0]["fdrhc"] is False
    assert mappings[1]["account_number"] == "2000"
    assert mappings[1]["fdrhc"] is True


def test_upsert_account_mappings_update(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    # Create initial mapping
    client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[{"account_number": "1000", "description": "Cash"}],
        headers=auth_headers,
    )
    # Update it
    response = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[{"account_number": "1000", "description": "Cash and Equivalents", "interests": True}],
        headers=auth_headers,
    )
    assert response.status_code == 200
    mappings = response.json()["mappings"]
    assert len(mappings) == 1
    assert mappings[0]["description"] == "Cash and Equivalents"
    assert mappings[0]["interests"] is True


def test_upsert_account_mappings_all_fields(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    interco_id = _create_company(client, auth_headers, name="Interco Co")

    entry = {
        "account_number": "5000",
        "description": "Revenue",
        "link_code": "REV-001",
        "summary_ef": "SUM-A",
        "detail_ef": "DET-A",
        "divisions": "Div1",
        "sub_divisions": "Sub1",
        "fdrhc": True,
        "interests": True,
        "amortization": True,
        "variable_costs": True,
        "fixed_costs": True,
        "product": "Product A",
        "interco_company_id": interco_id,
    }
    response = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[entry],
        headers=auth_headers,
    )
    assert response.status_code == 200
    m = response.json()["mappings"][0]
    assert m["account_number"] == "5000"
    assert m["link_code"] == "REV-001"
    assert m["summary_ef"] == "SUM-A"
    assert m["detail_ef"] == "DET-A"
    assert m["divisions"] == "Div1"
    assert m["sub_divisions"] == "Sub1"
    assert m["fdrhc"] is True
    assert m["interests"] is True
    assert m["amortization"] is True
    assert m["variable_costs"] is True
    assert m["fixed_costs"] is True
    assert m["product"] == "Product A"
    assert m["interco_company_id"] == interco_id


def test_account_mappings_ordered_by_account_number(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    entries = [
        {"account_number": "3000", "description": "Three"},
        {"account_number": "1000", "description": "One"},
        {"account_number": "2000", "description": "Two"},
    ]
    client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=entries,
        headers=auth_headers,
    )
    response = client.get(f"/api/companies/{company_id}/account-mappings", headers=auth_headers)
    mappings = response.json()["mappings"]
    assert [m["account_number"] for m in mappings] == ["1000", "2000", "3000"]


def test_account_mappings_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}/account-mappings", headers=auth_headers)
    assert response.status_code == 404


def test_account_mappings_unauthenticated(client):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}/account-mappings")
    assert response.status_code == 401


# --- Products Tests ---


def test_list_products_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(f"/api/companies/{company_id}/products", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["products"] == []


def test_create_product(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.post(
        f"/api/companies/{company_id}/products",
        json={"name": "Widget A"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Widget A"
    assert data["sort_order"] == 0
    assert "id" in data


def test_create_multiple_products_sort_order(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    client.post(f"/api/companies/{company_id}/products", json={"name": "A"}, headers=auth_headers)
    response = client.post(f"/api/companies/{company_id}/products", json={"name": "B"}, headers=auth_headers)
    assert response.json()["sort_order"] == 1

    response = client.get(f"/api/companies/{company_id}/products", headers=auth_headers)
    products = response.json()["products"]
    assert len(products) == 2
    assert products[0]["name"] == "A"
    assert products[1]["name"] == "B"


def test_upsert_products_replace_all(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    # Create initial products
    client.post(f"/api/companies/{company_id}/products", json={"name": "Old"}, headers=auth_headers)

    # Replace all
    response = client.put(
        f"/api/companies/{company_id}/products",
        json=["New A", "New B", "New C"],
        headers=auth_headers,
    )
    assert response.status_code == 200
    products = response.json()["products"]
    assert len(products) == 3
    assert [p["name"] for p in products] == ["New A", "New B", "New C"]
    assert [p["sort_order"] for p in products] == [0, 1, 2]


def test_products_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}/products", headers=auth_headers)
    assert response.status_code == 404


def test_products_unauthenticated(client):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}/products")
    assert response.status_code == 401
