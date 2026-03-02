import uuid


def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


# --- Forecast Configs ---


def test_list_forecast_configs_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/forecast-configs",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["configs"] == []


def test_upsert_forecast_config_create(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={
            "config_type": "expense_types",
            "data": {"ROW-001": "variable", "ROW-002": "fixe"},
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["config_type"] == "expense_types"
    assert data["data"]["ROW-001"] == "variable"
    assert data["data"]["ROW-002"] == "fixe"
    assert data["company_id"] == company_id
    assert "id" in data


def test_upsert_forecast_config_update_existing(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    # Create
    client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "inflation_rate", "data": {"rate": 2.0}},
        headers=auth_headers,
    )
    # Update same config_type
    response = client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "inflation_rate", "data": {"rate": 3.5}},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["data"]["rate"] == 3.5

    # Should still be 1 config, not duplicated
    list_response = client.get(
        f"/api/companies/{company_id}/forecast-configs?config_type=inflation_rate",
        headers=auth_headers,
    )
    assert len(list_response.json()["configs"]) == 1


def test_list_forecast_configs_filter_by_type(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "expense_types", "data": {"ROW-001": "variable"}},
        headers=auth_headers,
    )
    client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "inflation_rate", "data": {"rate": 2.0}},
        headers=auth_headers,
    )

    response = client.get(
        f"/api/companies/{company_id}/forecast-configs?config_type=expense_types",
        headers=auth_headers,
    )
    assert response.status_code == 200
    configs = response.json()["configs"]
    assert len(configs) == 1
    assert configs[0]["config_type"] == "expense_types"


def test_multiple_config_types(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "expense_types", "data": {"ROW-001": "variable"}},
        headers=auth_headers,
    )
    client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "variable_rates", "data": {"ROW-001": 15.5}},
        headers=auth_headers,
    )
    client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "capex_depreciation", "data": {"ROW-001": 8.0}},
        headers=auth_headers,
    )

    response = client.get(
        f"/api/companies/{company_id}/forecast-configs",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert len(response.json()["configs"]) == 3


def test_delete_forecast_config(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    create_response = client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "inflation_rate", "data": {"rate": 2.0}},
        headers=auth_headers,
    )
    config_id = create_response.json()["id"]

    response = client.delete(
        f"/api/companies/{company_id}/forecast-configs/{config_id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Confirm deleted
    list_response = client.get(
        f"/api/companies/{company_id}/forecast-configs",
        headers=auth_headers,
    )
    assert list_response.json()["configs"] == []


def test_delete_forecast_config_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    fake_id = str(uuid.uuid4())
    response = client.delete(
        f"/api/companies/{company_id}/forecast-configs/{fake_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- EBITDA Multiple Notes ---


def test_list_ebitda_notes_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/ebitda-notes",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["notes"] == []


def test_upsert_ebitda_note_create(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.put(
        f"/api/companies/{company_id}/ebitda-notes",
        json={
            "note_type": "adjustment",
            "data": {"factor": 1.2, "description": "Normalization adjustment"},
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    notes = response.json()["notes"]
    assert len(notes) == 1
    assert notes[0]["note_type"] == "adjustment"
    assert notes[0]["data"]["factor"] == 1.2


def test_upsert_ebitda_note_update(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    # Create
    client.put(
        f"/api/companies/{company_id}/ebitda-notes",
        json={"note_type": "weight", "data": {"value": 0.5}},
        headers=auth_headers,
    )
    # Update
    response = client.put(
        f"/api/companies/{company_id}/ebitda-notes",
        json={"note_type": "weight", "data": {"value": 0.75}},
        headers=auth_headers,
    )
    assert response.status_code == 200
    notes = response.json()["notes"]
    weight_notes = [n for n in notes if n["note_type"] == "weight"]
    assert len(weight_notes) == 1
    assert weight_notes[0]["data"]["value"] == 0.75


def test_list_ebitda_notes_filter_by_type(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    client.put(
        f"/api/companies/{company_id}/ebitda-notes",
        json={"note_type": "adjustment", "data": {"factor": 1.0}},
        headers=auth_headers,
    )
    client.put(
        f"/api/companies/{company_id}/ebitda-notes",
        json={"note_type": "weight", "data": {"value": 0.5}},
        headers=auth_headers,
    )

    response = client.get(
        f"/api/companies/{company_id}/ebitda-notes?note_type=adjustment",
        headers=auth_headers,
    )
    assert response.status_code == 200
    notes = response.json()["notes"]
    assert len(notes) == 1
    assert notes[0]["note_type"] == "adjustment"


# --- Authorization ---


def test_forecast_configs_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/forecast-configs",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_forecast_configs_unauthenticated(client):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}/forecast-configs")
    assert response.status_code == 403


def test_ebitda_notes_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/ebitda-notes",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_ebitda_notes_unauthenticated(client):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}/ebitda-notes")
    assert response.status_code == 403


def test_upsert_forecast_config_with_projection_id(client, auth_headers):
    """projection_id scopes configs independently."""
    company_id = _create_company(client, auth_headers)

    # Create a projection first
    proj_resp = client.post(
        f"/api/companies/{company_id}/projections",
        json={"name": "Test Proj", "projection_years": 5, "projection_mode": "gl"},
        headers=auth_headers,
    )
    assert proj_resp.status_code == 201
    proj_id = proj_resp.json()["id"]

    # Upsert company-scoped config (no projection_id)
    r1 = client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "income-statement-detail", "data": {"inflationRate": 2.0}},
        headers=auth_headers,
    )
    assert r1.status_code == 200

    # Upsert projection-scoped config (same config_type, different projection_id)
    r2 = client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={
            "config_type": "income-statement-detail",
            "data": {"inflationRate": 5.0},
            "projection_id": proj_id,
        },
        headers=auth_headers,
    )
    assert r2.status_code == 200
    assert r2.json()["projection_id"] == proj_id

    # Both should exist as separate records
    list_resp = client.get(
        f"/api/companies/{company_id}/forecast-configs?config_type=income-statement-detail",
        headers=auth_headers,
    )
    assert list_resp.status_code == 200
    configs = list_resp.json()["configs"]
    assert len(configs) == 2

    # Filter by projection_id returns only the projection-scoped one
    filtered = client.get(
        f"/api/companies/{company_id}/forecast-configs"
        f"?config_type=income-statement-detail&projection_id={proj_id}",
        headers=auth_headers,
    )
    assert filtered.status_code == 200
    assert len(filtered.json()["configs"]) == 1
    assert filtered.json()["configs"][0]["data"]["inflationRate"] == 5.0


def test_upsert_forecast_config_projection_id_updates_existing(client, auth_headers):
    """Second upsert with same projection_id updates in-place, no duplicate."""
    company_id = _create_company(client, auth_headers)
    proj_resp = client.post(
        f"/api/companies/{company_id}/projections",
        json={"name": "P", "projection_years": 3, "projection_mode": "gl"},
        headers=auth_headers,
    )
    proj_id = proj_resp.json()["id"]

    client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "capex-forecast", "data": {"additions": []}, "projection_id": proj_id},
        headers=auth_headers,
    )
    r = client.put(
        f"/api/companies/{company_id}/forecast-configs",
        json={"config_type": "capex-forecast", "data": {"additions": [{"id": "x"}]}, "projection_id": proj_id},
        headers=auth_headers,
    )
    assert r.status_code == 200

    list_resp = client.get(
        f"/api/companies/{company_id}/forecast-configs?projection_id={proj_id}",
        headers=auth_headers,
    )
    assert len(list_resp.json()["configs"]) == 1
    assert list_resp.json()["configs"][0]["data"]["additions"] == [{"id": "x"}]
