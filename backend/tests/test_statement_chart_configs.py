import uuid


def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


# --- GET with auto-seed ---


def test_list_empty_seeds_default_slot(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=income-statement",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "slots" in data
    assert len(data["slots"]) == 1
    slot = data["slots"][0]
    assert slot["chart_instance_id"] == "default"
    assert slot["slot_index"] == 0
    assert slot["version"] == 1
    assert slot["config"]["chartTitle"] == "Performance financière"
    assert len(slot["config"]["series"]) == 3


def test_list_seeds_correct_default_per_statement_type(client, auth_headers):
    company_id = _create_company(client, auth_headers)

    bs = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=balance-sheet",
        headers=auth_headers,
    ).json()
    assert bs["slots"][0]["config"]["chartTitle"] == "Bilan"

    cf = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=cash-flow",
        headers=auth_headers,
    ).json()
    assert cf["slots"][0]["config"]["chartTitle"] == "Flux de trésorerie"
    assert len(cf["slots"][0]["config"]["series"]) == 4


def test_list_second_call_does_not_duplicate_seed(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    a = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=income-statement",
        headers=auth_headers,
    ).json()
    b = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=income-statement",
        headers=auth_headers,
    ).json()
    assert len(a["slots"]) == 1
    assert len(b["slots"]) == 1
    assert a["slots"][0]["chart_instance_id"] == b["slots"][0]["chart_instance_id"]


def test_list_invalid_statement_type_returns_422(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=bogus",
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_list_requires_auth(client):
    company_id = uuid.uuid4()
    response = client.get(
        f"/api/companies/{company_id}/statement-chart-configs?statement_type=income-statement",
    )
    assert response.status_code in (401, 403)


def test_list_unknown_company_returns_404(client, auth_headers):
    other_company = uuid.uuid4()
    response = client.get(
        f"/api/companies/{other_company}/statement-chart-configs?statement_type=income-statement",
        headers=auth_headers,
    )
    assert response.status_code == 404
