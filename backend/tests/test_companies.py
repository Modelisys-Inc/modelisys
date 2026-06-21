def test_create_company(client, auth_headers):
    response = client.post(
        "/api/companies",
        json={"name": "Acme Inc", "fiscal_year_end": "12-31", "currency": "CAD"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Acme Inc"
    assert data["fiscal_year_end"] == "12-31"
    assert data["currency"] == "CAD"
    assert "id" in data


def test_create_company_with_divisions(client, auth_headers):
    response = client.post(
        "/api/companies",
        json={
            "name": "Big Corp",
            "divisions": [
                {
                    "name": "Division A",
                    "sub_divisions": [{"name": "Sub A1"}, {"name": "Sub A2"}],
                },
                {"name": "Division B"},
            ],
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data["divisions"]) == 2
    assert data["divisions"][0]["name"] == "Division A"
    assert len(data["divisions"][0]["sub_divisions"]) == 2


def test_list_companies(client, auth_headers):
    client.post("/api/companies", json={"name": "Co 1"}, headers=auth_headers)
    client.post("/api/companies", json={"name": "Co 2"}, headers=auth_headers)

    response = client.get("/api/companies", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["companies"]) == 2


def test_get_company(client, auth_headers):
    create = client.post("/api/companies", json={"name": "Test Co"}, headers=auth_headers)
    company_id = create.json()["id"]

    response = client.get(f"/api/companies/{company_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Test Co"


def test_update_company(client, auth_headers):
    create = client.post("/api/companies", json={"name": "Old Name"}, headers=auth_headers)
    company_id = create.json()["id"]

    response = client.patch(
        f"/api/companies/{company_id}",
        json={"name": "New Name", "currency": "USD"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"
    assert response.json()["currency"] == "USD"


def test_delete_company(client, auth_headers):
    create = client.post("/api/companies", json={"name": "To Delete"}, headers=auth_headers)
    company_id = create.json()["id"]

    response = client.delete(f"/api/companies/{company_id}", headers=auth_headers)
    assert response.status_code == 204

    response = client.get(f"/api/companies/{company_id}", headers=auth_headers)
    assert response.status_code == 404


def test_create_division(client, auth_headers):
    create = client.post("/api/companies", json={"name": "Co"}, headers=auth_headers)
    company_id = create.json()["id"]

    response = client.post(
        f"/api/companies/{company_id}/divisions",
        json={"name": "New Division"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["name"] == "New Division"


def test_delete_division(client, auth_headers):
    create = client.post(
        "/api/companies",
        json={"name": "Co", "divisions": [{"name": "Div"}]},
        headers=auth_headers,
    )
    div_id = create.json()["divisions"][0]["id"]

    response = client.delete(f"/api/companies/divisions/{div_id}", headers=auth_headers)
    assert response.status_code == 204


def test_create_sub_division(client, auth_headers):
    create = client.post(
        "/api/companies",
        json={"name": "Co", "divisions": [{"name": "Div"}]},
        headers=auth_headers,
    )
    div_id = create.json()["divisions"][0]["id"]

    response = client.post(
        f"/api/companies/divisions/{div_id}/sub-divisions",
        json={"name": "New Sub"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["name"] == "New Sub"


def test_company_not_found(client, auth_headers):
    import uuid
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}", headers=auth_headers)
    assert response.status_code == 404


def test_unauthenticated_access(client):
    response = client.get("/api/companies")
    assert response.status_code == 401


def test_create_company_seeds_default_statement_structures(client, auth_headers):
    """Creating a company should auto-create default IS and BS statement structures."""
    create = client.post("/api/companies", json={"name": "Seeded Co"}, headers=auth_headers)
    assert create.status_code == 201
    company_id = create.json()["id"]

    response = client.get(
        f"/api/companies/{company_id}/statement-structures",
        headers=auth_headers,
    )
    assert response.status_code == 200
    structures = response.json()["structures"]
    types = {s["statement_type"] for s in structures}
    assert "income-statement" in types
    assert "balance-sheet" in types

    is_struct = next(s for s in structures if s["statement_type"] == "income-statement")
    assert len(is_struct["structure"]) > 0
    bs_struct = next(s for s in structures if s["statement_type"] == "balance-sheet")
    assert len(bs_struct["structure"]) > 0
