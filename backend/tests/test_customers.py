def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


# --- List customers ---


def test_list_customers_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/customers",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["customers"] == []


def test_list_customers(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    client.post(
        f"/api/companies/{company_id}/customers",
        json={"name": "Client A", "sort_order": 1},
        headers=auth_headers,
    )
    client.post(
        f"/api/companies/{company_id}/customers",
        json={"name": "Client B", "sort_order": 2},
        headers=auth_headers,
    )

    response = client.get(
        f"/api/companies/{company_id}/customers",
        headers=auth_headers,
    )
    assert response.status_code == 200
    customers = response.json()["customers"]
    assert len(customers) == 2
    assert customers[0]["name"] == "Client A"
    assert customers[1]["name"] == "Client B"


# --- Create customer ---


def test_create_customer(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.post(
        f"/api/companies/{company_id}/customers",
        json={"name": "Nouveau Client", "sort_order": 0},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Nouveau Client"
    assert data["sort_order"] == 0
    assert "id" in data


def test_create_customer_default_sort_order(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.post(
        f"/api/companies/{company_id}/customers",
        json={"name": "Client Sans Ordre"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["sort_order"] == 0


def test_create_customer_unauthorized(client):
    response = client.post(
        f"/api/companies/00000000-0000-0000-0000-000000000000/customers",
        json={"name": "Test"},
    )
    assert response.status_code in (401, 403)


# --- Bulk upsert customers ---


def test_bulk_upsert_customers(client, auth_headers):
    company_id = _create_company(client, auth_headers)

    # Create initial customers
    client.post(
        f"/api/companies/{company_id}/customers",
        json={"name": "Old Client"},
        headers=auth_headers,
    )

    # Bulk replace
    response = client.put(
        f"/api/companies/{company_id}/customers",
        json=[
            {"name": "New Client A", "sort_order": 1},
            {"name": "New Client B", "sort_order": 2},
            {"name": "New Client C", "sort_order": 3},
        ],
        headers=auth_headers,
    )
    assert response.status_code == 200
    customers = response.json()["customers"]
    assert len(customers) == 3
    assert customers[0]["name"] == "New Client A"

    # Verify old customer is gone
    list_response = client.get(
        f"/api/companies/{company_id}/customers",
        headers=auth_headers,
    )
    names = [c["name"] for c in list_response.json()["customers"]]
    assert "Old Client" not in names
    assert len(names) == 3


# --- Delete customer ---


def test_delete_customer(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    create_resp = client.post(
        f"/api/companies/{company_id}/customers",
        json={"name": "To Delete"},
        headers=auth_headers,
    )
    customer_id = create_resp.json()["id"]

    response = client.delete(
        f"/api/companies/{company_id}/customers/{customer_id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Verify deleted
    list_resp = client.get(
        f"/api/companies/{company_id}/customers",
        headers=auth_headers,
    )
    assert list_resp.json()["customers"] == []


def test_delete_customer_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.delete(
        f"/api/companies/{company_id}/customers/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Access control ---


def test_customer_wrong_company(client, auth_headers):
    """Customers from one company should not be visible to another."""
    company_a = _create_company(client, auth_headers, name="Company A")
    company_b = _create_company(client, auth_headers, name="Company B")

    client.post(
        f"/api/companies/{company_a}/customers",
        json={"name": "Client of A"},
        headers=auth_headers,
    )

    response = client.get(
        f"/api/companies/{company_b}/customers",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["customers"] == []
