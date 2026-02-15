import uuid


def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


def _create_projection(client, auth_headers, company_id, name="5-Year Projection", **overrides):
    data = {"name": name, "projection_years": 5, "projection_mode": "gl"}
    data.update(overrides)
    response = client.post(
        f"/api/companies/{company_id}/projections",
        json=data,
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()


# --- List projections ---


def test_list_projections_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/projections",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["projections"] == []


def test_list_projections(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _create_projection(client, auth_headers, company_id, name="Proj A")
    _create_projection(client, auth_headers, company_id, name="Proj B")

    response = client.get(
        f"/api/companies/{company_id}/projections",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert len(response.json()["projections"]) == 2


# --- Create projection ---


def test_create_projection(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)

    assert proj["name"] == "5-Year Projection"
    assert proj["projection_years"] == 5
    assert proj["projection_mode"] == "gl"
    assert "id" in proj
    assert "created_by_id" in proj
    assert proj["adjustments"] == []
    assert proj["loans"] == []


def test_create_projection_3_years(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(
        client, auth_headers, company_id,
        name="3-Year", projection_years=3, projection_mode="account",
    )
    assert proj["projection_years"] == 3
    assert proj["projection_mode"] == "account"


# --- Get projection ---


def test_get_projection(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)

    response = client.get(
        f"/api/companies/{company_id}/projections/{proj['id']}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "5-Year Projection"


def test_get_projection_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{company_id}/projections/{fake_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Update projection ---


def test_update_projection(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)

    response = client.patch(
        f"/api/companies/{company_id}/projections/{proj['id']}",
        json={"name": "Updated Projection", "projection_years": 3},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Projection"
    assert response.json()["projection_years"] == 3


def test_update_projection_partial(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)

    response = client.patch(
        f"/api/companies/{company_id}/projections/{proj['id']}",
        json={"projection_mode": "account"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["projection_mode"] == "account"
    assert response.json()["name"] == "5-Year Projection"  # unchanged


# --- Delete projection ---


def test_delete_projection(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)

    response = client.delete(
        f"/api/companies/{company_id}/projections/{proj['id']}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    response = client.get(
        f"/api/companies/{company_id}/projections/{proj['id']}",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Adjustments ---


def test_create_adjustment(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)

    response = client.post(
        f"/api/companies/{company_id}/projections/{proj['id']}/adjustments",
        json={
            "module": "revenue",
            "row_id": "REV-001",
            "year_index": 0,
            "type": "percentage",
            "value": 10.0,
            "is_recurring": True,
            "note": "10% revenue growth",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    adj = response.json()
    assert adj["module"] == "revenue"
    assert adj["row_id"] == "REV-001"
    assert adj["year_index"] == 0
    assert adj["type"] == "percentage"
    assert adj["value"] == 10.0
    assert adj["is_recurring"] is True
    assert adj["note"] == "10% revenue growth"
    assert "id" in adj


def test_adjustment_appears_in_projection(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)

    client.post(
        f"/api/companies/{company_id}/projections/{proj['id']}/adjustments",
        json={"module": "expenses", "row_id": "EXP-001", "year_index": 1, "type": "amount", "value": 5000.0},
        headers=auth_headers,
    )

    response = client.get(
        f"/api/companies/{company_id}/projections/{proj['id']}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert len(response.json()["adjustments"]) == 1
    assert response.json()["adjustments"][0]["module"] == "expenses"


def test_bulk_upsert_adjustments(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)

    # Create initial adjustment
    client.post(
        f"/api/companies/{company_id}/projections/{proj['id']}/adjustments",
        json={"module": "revenue", "row_id": "OLD-001", "year_index": 0, "type": "amount", "value": 100.0},
        headers=auth_headers,
    )

    # Bulk replace all adjustments
    response = client.put(
        f"/api/companies/{company_id}/projections/{proj['id']}/adjustments",
        json=[
            {"module": "revenue", "row_id": "REV-001", "year_index": 0, "type": "percentage", "value": 5.0},
            {"module": "expenses", "row_id": "EXP-001", "year_index": 1, "type": "amount", "value": 2000.0},
        ],
        headers=auth_headers,
    )
    assert response.status_code == 200
    # Old adjustment should be gone, replaced by 2 new ones
    assert len(response.json()["adjustments"]) == 2


def test_delete_adjustment(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)

    adj_response = client.post(
        f"/api/companies/{company_id}/projections/{proj['id']}/adjustments",
        json={"module": "revenue", "row_id": "REV-001", "year_index": 0, "type": "amount", "value": 100.0},
        headers=auth_headers,
    )
    adj_id = adj_response.json()["id"]

    response = client.delete(
        f"/api/companies/{company_id}/projections/{proj['id']}/adjustments/{adj_id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Verify gone
    proj_response = client.get(
        f"/api/companies/{company_id}/projections/{proj['id']}",
        headers=auth_headers,
    )
    assert len(proj_response.json()["adjustments"]) == 0


def test_delete_adjustment_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)
    fake_id = str(uuid.uuid4())

    response = client.delete(
        f"/api/companies/{company_id}/projections/{proj['id']}/adjustments/{fake_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Loans ---


def test_create_loan(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)

    response = client.post(
        f"/api/companies/{company_id}/projections/{proj['id']}/loans",
        json={
            "name": "Term Loan A",
            "principal": 500000.0,
            "interest_rate": 5.5,
            "remaining_payments": 60,
            "payment_amount": 9500.0,
            "start_month": 0,
            "notes": "5-year term loan",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    loan = response.json()
    assert loan["name"] == "Term Loan A"
    assert loan["principal"] == 500000.0
    assert loan["interest_rate"] == 5.5
    assert loan["remaining_payments"] == 60
    assert loan["payment_amount"] == 9500.0
    assert loan["start_month"] == 0
    assert loan["notes"] == "5-year term loan"
    assert "id" in loan


def test_loan_appears_in_projection(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)

    client.post(
        f"/api/companies/{company_id}/projections/{proj['id']}/loans",
        json={
            "name": "Loan A",
            "principal": 100000.0,
            "interest_rate": 4.0,
            "remaining_payments": 36,
        },
        headers=auth_headers,
    )

    response = client.get(
        f"/api/companies/{company_id}/projections/{proj['id']}",
        headers=auth_headers,
    )
    assert len(response.json()["loans"]) == 1
    assert response.json()["loans"][0]["name"] == "Loan A"


def test_bulk_upsert_loans(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)

    # Create initial loan
    client.post(
        f"/api/companies/{company_id}/projections/{proj['id']}/loans",
        json={"name": "Old Loan", "principal": 10000, "interest_rate": 3.0, "remaining_payments": 12},
        headers=auth_headers,
    )

    # Bulk replace
    response = client.put(
        f"/api/companies/{company_id}/projections/{proj['id']}/loans",
        json=[
            {"name": "Loan X", "principal": 50000, "interest_rate": 4.5, "remaining_payments": 24},
            {"name": "Loan Y", "principal": 80000, "interest_rate": 5.0, "remaining_payments": 48},
        ],
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert len(response.json()["loans"]) == 2


def test_delete_loan(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)

    loan_response = client.post(
        f"/api/companies/{company_id}/projections/{proj['id']}/loans",
        json={"name": "To Delete", "principal": 10000, "interest_rate": 3.0, "remaining_payments": 12},
        headers=auth_headers,
    )
    loan_id = loan_response.json()["id"]

    response = client.delete(
        f"/api/companies/{company_id}/projections/{proj['id']}/loans/{loan_id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    proj_response = client.get(
        f"/api/companies/{company_id}/projections/{proj['id']}",
        headers=auth_headers,
    )
    assert len(proj_response.json()["loans"]) == 0


def test_delete_loan_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)
    fake_id = str(uuid.uuid4())

    response = client.delete(
        f"/api/companies/{company_id}/projections/{proj['id']}/loans/{fake_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Cascade delete ---


def test_delete_projection_cascades_children(client, auth_headers):
    """Deleting a projection should also delete its adjustments and loans."""
    company_id = _create_company(client, auth_headers)
    proj = _create_projection(client, auth_headers, company_id)
    proj_id = proj["id"]

    # Add adjustment and loan
    client.post(
        f"/api/companies/{company_id}/projections/{proj_id}/adjustments",
        json={"module": "revenue", "row_id": "R-001", "year_index": 0, "type": "amount", "value": 100},
        headers=auth_headers,
    )
    client.post(
        f"/api/companies/{company_id}/projections/{proj_id}/loans",
        json={"name": "Loan", "principal": 10000, "interest_rate": 3.0, "remaining_payments": 12},
        headers=auth_headers,
    )

    # Delete the projection
    response = client.delete(
        f"/api/companies/{company_id}/projections/{proj_id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Projection should be gone
    response = client.get(
        f"/api/companies/{company_id}/projections/{proj_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Authorization ---


def test_projections_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/projections",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_projections_unauthenticated(client):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}/projections")
    assert response.status_code == 403
