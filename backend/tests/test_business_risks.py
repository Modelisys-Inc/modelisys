import uuid


def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


def _create_risk(client, auth_headers, company_id, **overrides):
    data = {
        "risk_id": "RISK-001",
        "category": "Clients",
        "name": "Client Concentration",
        "description": "Top 3 clients represent 80% of revenue.",
        "impact": "High revenue volatility",
        "recommendation": "Diversify client base",
        "level": "high",
        "note": "Priority action item",
    }
    data.update(overrides)
    response = client.post(
        f"/api/companies/{company_id}/business-risks",
        json=data,
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()


# --- List ---


def test_list_business_risks_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/business-risks",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["risks"] == []


def test_list_business_risks(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _create_risk(client, auth_headers, company_id, risk_id="R1", name="Risk A")
    _create_risk(client, auth_headers, company_id, risk_id="R2", name="Risk B")

    response = client.get(
        f"/api/companies/{company_id}/business-risks",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert len(response.json()["risks"]) == 2


def test_list_business_risks_filter_by_category(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _create_risk(client, auth_headers, company_id, risk_id="R1", category="Clients")
    _create_risk(client, auth_headers, company_id, risk_id="R2", category="RH", name="HR Risk")

    response = client.get(
        f"/api/companies/{company_id}/business-risks?category=RH",
        headers=auth_headers,
    )
    assert response.status_code == 200
    risks = response.json()["risks"]
    assert len(risks) == 1
    assert risks[0]["category"] == "RH"


# --- Create ---


def test_create_business_risk(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    risk = _create_risk(client, auth_headers, company_id)

    assert risk["risk_id"] == "RISK-001"
    assert risk["category"] == "Clients"
    assert risk["name"] == "Client Concentration"
    assert risk["description"] == "Top 3 clients represent 80% of revenue."
    assert risk["impact"] == "High revenue volatility"
    assert risk["recommendation"] == "Diversify client base"
    assert risk["level"] == "high"
    assert risk["note"] == "Priority action item"
    assert "id" in risk


def test_create_business_risk_minimal(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.post(
        f"/api/companies/{company_id}/business-risks",
        json={"risk_id": "R-MIN", "category": "Ops", "name": "Minimal Risk"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["description"] is None
    assert data["level"] is None


# --- Bulk upsert ---


def test_bulk_upsert_create(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.put(
        f"/api/companies/{company_id}/business-risks",
        json=[
            {"risk_id": "R1", "category": "Clients", "name": "Risk A"},
            {"risk_id": "R2", "category": "RH", "name": "Risk B"},
        ],
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert len(response.json()["risks"]) == 2


def test_bulk_upsert_updates_existing(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    # Create
    client.put(
        f"/api/companies/{company_id}/business-risks",
        json=[{"risk_id": "R1", "category": "Clients", "name": "Original Name"}],
        headers=auth_headers,
    )
    # Upsert with same risk_id should update
    response = client.put(
        f"/api/companies/{company_id}/business-risks",
        json=[{"risk_id": "R1", "category": "Clients", "name": "Updated Name", "level": "medium"}],
        headers=auth_headers,
    )
    assert response.status_code == 200
    risks = response.json()["risks"]
    r1 = [r for r in risks if r["risk_id"] == "R1"]
    assert len(r1) == 1
    assert r1[0]["name"] == "Updated Name"
    assert r1[0]["level"] == "medium"


# --- Update (PATCH) ---


def test_update_business_risk(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    risk = _create_risk(client, auth_headers, company_id)

    response = client.patch(
        f"/api/companies/{company_id}/business-risks/{risk['id']}",
        json={"level": "low", "note": "Mitigated"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["level"] == "low"
    assert response.json()["note"] == "Mitigated"
    # Other fields unchanged
    assert response.json()["name"] == "Client Concentration"


def test_update_business_risk_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    fake_id = str(uuid.uuid4())
    response = client.patch(
        f"/api/companies/{company_id}/business-risks/{fake_id}",
        json={"level": "low"},
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Delete ---


def test_delete_business_risk(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    risk = _create_risk(client, auth_headers, company_id)

    response = client.delete(
        f"/api/companies/{company_id}/business-risks/{risk['id']}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Confirm deleted
    response = client.get(
        f"/api/companies/{company_id}/business-risks",
        headers=auth_headers,
    )
    assert len(response.json()["risks"]) == 0


def test_delete_business_risk_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    fake_id = str(uuid.uuid4())
    response = client.delete(
        f"/api/companies/{company_id}/business-risks/{fake_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Authorization ---


def test_business_risks_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/business-risks",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_business_risks_unauthenticated(client):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}/business-risks")
    assert response.status_code == 401
