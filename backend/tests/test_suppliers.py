def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


# --- List suppliers ---


def test_list_suppliers_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/suppliers",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["suppliers"] == []


def test_list_suppliers(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    client.post(
        f"/api/companies/{company_id}/suppliers",
        json={"name": "Fournisseur A", "sort_order": 1},
        headers=auth_headers,
    )
    client.post(
        f"/api/companies/{company_id}/suppliers",
        json={"name": "Fournisseur B", "sort_order": 2},
        headers=auth_headers,
    )

    response = client.get(
        f"/api/companies/{company_id}/suppliers",
        headers=auth_headers,
    )
    assert response.status_code == 200
    suppliers = response.json()["suppliers"]
    assert len(suppliers) == 2
    assert suppliers[0]["name"] == "Fournisseur A"
    assert suppliers[1]["name"] == "Fournisseur B"


# --- Create supplier ---


def test_create_supplier(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.post(
        f"/api/companies/{company_id}/suppliers",
        json={"name": "Nouveau Fournisseur", "sort_order": 0},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Nouveau Fournisseur"
    assert data["sort_order"] == 0
    assert "id" in data


def test_create_supplier_default_sort_order(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.post(
        f"/api/companies/{company_id}/suppliers",
        json={"name": "Fournisseur Sans Ordre"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["sort_order"] == 0


def test_create_supplier_unauthorized(client):
    response = client.post(
        f"/api/companies/00000000-0000-0000-0000-000000000000/suppliers",
        json={"name": "Test"},
    )
    assert response.status_code in (401, 403)


# --- Bulk upsert suppliers ---


def test_bulk_upsert_suppliers(client, auth_headers):
    company_id = _create_company(client, auth_headers)

    # Create initial supplier
    client.post(
        f"/api/companies/{company_id}/suppliers",
        json={"name": "Old Supplier"},
        headers=auth_headers,
    )

    # Bulk replace
    response = client.put(
        f"/api/companies/{company_id}/suppliers",
        json=[
            {"name": "New Supplier A", "sort_order": 1},
            {"name": "New Supplier B", "sort_order": 2},
            {"name": "New Supplier C", "sort_order": 3},
        ],
        headers=auth_headers,
    )
    assert response.status_code == 200
    suppliers = response.json()["suppliers"]
    assert len(suppliers) == 3
    assert suppliers[0]["name"] == "New Supplier A"

    # Verify old supplier is gone
    list_response = client.get(
        f"/api/companies/{company_id}/suppliers",
        headers=auth_headers,
    )
    names = [s["name"] for s in list_response.json()["suppliers"]]
    assert "Old Supplier" not in names
    assert len(names) == 3


# --- Delete supplier ---


def test_delete_supplier(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    create_resp = client.post(
        f"/api/companies/{company_id}/suppliers",
        json={"name": "To Delete"},
        headers=auth_headers,
    )
    supplier_id = create_resp.json()["id"]

    response = client.delete(
        f"/api/companies/{company_id}/suppliers/{supplier_id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Verify deleted
    list_resp = client.get(
        f"/api/companies/{company_id}/suppliers",
        headers=auth_headers,
    )
    assert list_resp.json()["suppliers"] == []


def test_delete_supplier_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.delete(
        f"/api/companies/{company_id}/suppliers/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Access control ---


def test_supplier_wrong_company(client, auth_headers):
    """Suppliers from one company should not be visible to another."""
    company_a = _create_company(client, auth_headers, name="Company A")
    company_b = _create_company(client, auth_headers, name="Company B")

    client.post(
        f"/api/companies/{company_a}/suppliers",
        json={"name": "Supplier of A"},
        headers=auth_headers,
    )

    response = client.get(
        f"/api/companies/{company_b}/suppliers",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["suppliers"] == []
