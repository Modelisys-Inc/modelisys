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


def test_list_concurrent_seed_does_not_500(client, auth_headers, db):
    """If a concurrent request already inserted the default slot, the second seed
    attempt must recover gracefully via the IntegrityError path."""
    from app.models.statement_chart_config import StatementChartConfig
    import uuid as _uuid

    company_id_str = _create_company(client, auth_headers)
    company_id = _uuid.UUID(company_id_str)

    # Simulate the race: pre-insert the default row directly via the session,
    # then call the endpoint. The endpoint will see zero rows under its own view
    # only if the session is fresh — but in this test setup the route handler
    # shares the same DB session as the test fixture, so we simulate the race
    # by inserting via the test session BEFORE the route runs its query. The
    # route's "no rows" check will then evaluate AFTER the insert, so the
    # IntegrityError path won't trigger here — instead the route's first query
    # already finds the row and skips seeding entirely. To force the race,
    # we exercise the seed path by first GETting (which seeds), then we delete
    # the row mid-request? That's not feasible in a single-process test.
    #
    # Practical approach: directly exercise `_seed_default_slot` twice — the
    # second call hits the IntegrityError branch and recovers.
    from app.routers.statement_chart_configs import _seed_default_slot
    from app.models.user import User

    user = db.query(User).first()
    assert user is not None

    first = _seed_default_slot(db, company_id, "income-statement", user)
    assert first.chart_instance_id == "default"

    # Second call: should NOT raise; should return the existing row.
    second = _seed_default_slot(db, company_id, "income-statement", user)
    assert second.chart_instance_id == "default"
    assert second.id == first.id  # same row, recovered via IntegrityError path
