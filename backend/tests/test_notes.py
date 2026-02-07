import uuid


def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


def _create_note(client, auth_headers, company_id, **overrides):
    data = {
        "row_id": "REV-001",
        "row_label": "Revenus",
        "page": "income-statement",
        "period": "monthly",
        "view": "comparison",
        "content": "Revenue looks good this month.",
        "current_amount": 10000.0,
        "prior_amount": 8000.0,
        "variation_percent": 25.0,
        "variation_amount": 2000.0,
    }
    data.update(overrides)
    response = client.post(
        f"/api/companies/{company_id}/notes",
        json=data,
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()


# --- List notes ---


def test_list_notes_empty(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/notes",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["notes"] == []


def test_list_notes(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _create_note(client, auth_headers, company_id)
    _create_note(client, auth_headers, company_id, row_id="COGS-001", row_label="COGS")

    response = client.get(
        f"/api/companies/{company_id}/notes",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert len(response.json()["notes"]) == 2


# --- Filter notes ---


def test_filter_notes_by_page(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _create_note(client, auth_headers, company_id, page="income-statement")
    _create_note(client, auth_headers, company_id, page="balance-sheet", row_id="BS-001")

    response = client.get(
        f"/api/companies/{company_id}/notes?page=income-statement",
        headers=auth_headers,
    )
    assert response.status_code == 200
    notes = response.json()["notes"]
    assert len(notes) == 1
    assert notes[0]["page"] == "income-statement"


def test_filter_notes_by_row_id(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _create_note(client, auth_headers, company_id, row_id="REV-001")
    _create_note(client, auth_headers, company_id, row_id="COGS-001", row_label="COGS")

    response = client.get(
        f"/api/companies/{company_id}/notes?row_id=REV-001",
        headers=auth_headers,
    )
    assert response.status_code == 200
    notes = response.json()["notes"]
    assert len(notes) == 1
    assert notes[0]["row_id"] == "REV-001"


def test_filter_notes_by_period(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _create_note(client, auth_headers, company_id, period="monthly")
    _create_note(client, auth_headers, company_id, period="quarterly", row_id="Q-001")

    response = client.get(
        f"/api/companies/{company_id}/notes?period=quarterly",
        headers=auth_headers,
    )
    assert response.status_code == 200
    notes = response.json()["notes"]
    assert len(notes) == 1
    assert notes[0]["period"] == "quarterly"


def test_filter_notes_by_view(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _create_note(client, auth_headers, company_id, view="comparison")
    _create_note(client, auth_headers, company_id, view="ytd", row_id="YTD-001")

    response = client.get(
        f"/api/companies/{company_id}/notes?view=ytd",
        headers=auth_headers,
    )
    assert response.status_code == 200
    notes = response.json()["notes"]
    assert len(notes) == 1
    assert notes[0]["view"] == "ytd"


def test_filter_notes_combined(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _create_note(client, auth_headers, company_id, page="income-statement", period="monthly", view="comparison")
    _create_note(client, auth_headers, company_id, page="income-statement", period="quarterly", view="comparison", row_id="Q-001")

    response = client.get(
        f"/api/companies/{company_id}/notes?page=income-statement&period=monthly&view=comparison",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert len(response.json()["notes"]) == 1


# --- Create note ---


def test_create_note(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    note = _create_note(client, auth_headers, company_id)

    assert note["row_id"] == "REV-001"
    assert note["row_label"] == "Revenus"
    assert note["page"] == "income-statement"
    assert note["period"] == "monthly"
    assert note["view"] == "comparison"
    assert note["content"] == "Revenue looks good this month."
    assert note["current_amount"] == 10000.0
    assert note["prior_amount"] == 8000.0
    assert note["variation_percent"] == 25.0
    assert note["variation_amount"] == 2000.0
    assert "id" in note
    assert "created_by_id" in note


def test_create_note_minimal(client, auth_headers):
    """Create note with only required fields."""
    company_id = _create_company(client, auth_headers)
    response = client.post(
        f"/api/companies/{company_id}/notes",
        json={
            "row_id": "ROW-001",
            "row_label": "Some Row",
            "page": "income-statement",
            "period": "annual",
            "view": "comparison",
            "content": "Short note.",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["current_amount"] is None
    assert data["prior_amount"] is None


# --- Update note ---


def test_update_note_content(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    note = _create_note(client, auth_headers, company_id)
    note_id = note["id"]

    response = client.patch(
        f"/api/companies/{company_id}/notes/{note_id}",
        json={"content": "Updated content."},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["content"] == "Updated content."
    # Other fields should remain unchanged
    assert response.json()["row_id"] == "REV-001"


def test_update_note_amounts(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    note = _create_note(client, auth_headers, company_id)
    note_id = note["id"]

    response = client.patch(
        f"/api/companies/{company_id}/notes/{note_id}",
        json={"current_amount": 15000.0, "variation_percent": 87.5},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["current_amount"] == 15000.0
    assert response.json()["variation_percent"] == 87.5


def test_update_note_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    fake_id = str(uuid.uuid4())
    response = client.patch(
        f"/api/companies/{company_id}/notes/{fake_id}",
        json={"content": "nope"},
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Delete note ---


def test_delete_note(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    note = _create_note(client, auth_headers, company_id)
    note_id = note["id"]

    response = client.delete(
        f"/api/companies/{company_id}/notes/{note_id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Confirm deleted
    response = client.get(
        f"/api/companies/{company_id}/notes",
        headers=auth_headers,
    )
    assert len(response.json()["notes"]) == 0


def test_delete_note_not_found(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    fake_id = str(uuid.uuid4())
    response = client.delete(
        f"/api/companies/{company_id}/notes/{fake_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


# --- Authorization ---


def test_notes_company_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/companies/{fake_id}/notes",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_notes_unauthenticated(client):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/companies/{fake_id}/notes")
    assert response.status_code == 403
