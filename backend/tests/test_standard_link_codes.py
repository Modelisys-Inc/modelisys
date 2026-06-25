import pytest

from app.models.user import User
from app.utils.security import create_access_token


@pytest.fixture
def su_headers(db):
    """Superadmin auth — the only role allowed to manage the global chart."""
    u = User(
        email="root-codes@e.com",
        hashed_password="x",
        full_name="Root",
        is_active=True,
        is_superadmin=True,
    )
    db.add(u)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token({'sub': str(u.id)})}"}


def test_list_standard_link_codes_grouped(client):
    response = client.get("/api/standard-link-codes")
    assert response.status_code == 200
    groups = response.json()
    assert isinstance(groups, list)
    assert any(g["family"] == "TST" for g in groups)


def test_create_standard_link_code_requires_auth(client):
    response = client.post(
        "/api/standard-link-codes",
        json={
            "code": "NEW-001",
            "family": "REV",
            "label_sub_account": "Nouveau revenu",
            "is_leaf": True,
        },
    )
    assert response.status_code in (401, 403)


def test_create_standard_link_code_rejects_non_superadmin(client, auth_headers):
    """A regular org user cannot publish global codes (superadmin-only)."""
    response = client.post(
        "/api/standard-link-codes",
        json={"code": "NEW-X", "family": "REV", "is_leaf": True},
        headers=auth_headers,
    )
    assert response.status_code == 403


def test_create_standard_link_code(client, su_headers):
    response = client.post(
        "/api/standard-link-codes",
        json={
            "code": "NEW-001",
            "family": "REV",
            "label_account": "Revenus",
            "label_sub_account": "Nouveau revenu",
            "variable_or_fixed": "Variable",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["code"] == "NEW-001"
    assert data["family"] == "REV"
    assert data["label_sub_account"] == "Nouveau revenu"
    assert data["is_leaf"] is True


def test_create_duplicate_code_returns_409(client, su_headers):
    payload = {
        "code": "DUP-001",
        "family": "EXP",
        "label_sub_account": "Test",
        "is_leaf": True,
    }
    first = client.post("/api/standard-link-codes", json=payload, headers=su_headers)
    assert first.status_code == 201
    second = client.post("/api/standard-link-codes", json=payload, headers=su_headers)
    assert second.status_code == 409


def test_create_with_invalid_parent_returns_422(client, su_headers):
    response = client.post(
        "/api/standard-link-codes",
        json={
            "code": "CHILD-001",
            "family": "ACT",
            "parent_code": "NONEXISTENT-PARENT",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert response.status_code == 422


def test_update_standard_link_code_requires_auth(client):
    response = client.patch(
        "/api/standard-link-codes/44-330",
        json={"label_sub_account": "Updated label"},
    )
    assert response.status_code in (401, 403)


def test_update_standard_link_code(client, su_headers):
    response = client.patch(
        "/api/standard-link-codes/44-330",
        json={
            "label_sub_account": "Libellé mis à jour",
            "variable_or_fixed": "Fixe",
        },
        headers=su_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "44-330"
    assert data["label_sub_account"] == "Libellé mis à jour"
    assert data["variable_or_fixed"] == "Fixe"


def test_leaf_outside_cap_c_cannot_have_ft_category(client, su_headers):
    # ft_category on Bilan/CDR codes is deprecated — any value is rejected.
    response = client.post(
        "/api/standard-link-codes",
        json={
            "code": "CF-LEAF",
            "family": "TST",
            "label_sub_account": "Feuille",
            "is_leaf": True,
            "ft_category": "Exploitation",
        },
        headers=su_headers,
    )
    assert response.status_code == 422


def test_invalid_ft_category_returns_422(client, su_headers):
    create = client.post(
        "/api/standard-link-codes",
        json={
            "code": "CF-PARENT-2",
            "family": "TST",
            "label_sub_account": "Parent",
            "is_leaf": False,
        },
        headers=su_headers,
    )
    assert create.status_code == 201

    response = client.patch(
        "/api/standard-link-codes/CF-PARENT-2",
        json={"ft_category": "InvalidSection"},
        headers=su_headers,
    )
    assert response.status_code == 422


def test_update_nonexistent_code_returns_404(client, su_headers):
    response = client.patch(
        "/api/standard-link-codes/DOES-NOT-EXIST",
        json={"label_sub_account": "X"},
        headers=su_headers,
    )
    assert response.status_code == 404


def test_delete_standard_link_code_requires_auth(client):
    response = client.delete("/api/standard-link-codes/44-330")
    assert response.status_code in (401, 403)


def test_delete_standard_link_code_tombstones(client, su_headers):
    create = client.post(
        "/api/standard-link-codes",
        json={
            "code": "DEL-001",
            "family": "TST",
            "label_sub_account": "À tombstoner",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert create.status_code == 201

    # Delete tombstones (is_active=False) rather than hard-deleting, so the code
    # stays resolvable for historical references.
    response = client.delete("/api/standard-link-codes/DEL-001", headers=su_headers)
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    get_response = client.get("/api/standard-link-codes/DEL-001")
    assert get_response.status_code == 200
    assert get_response.json()["is_active"] is False

    # Reactivate with ?reactivate=true.
    react = client.delete(
        "/api/standard-link-codes/DEL-001?reactivate=true", headers=su_headers
    )
    assert react.status_code == 200
    assert react.json()["is_active"] is True


def test_tombstone_parent_with_children_succeeds(client, su_headers):
    # Tombstoning never hard-deletes, so it does not need the old child guard.
    parent = client.post(
        "/api/standard-link-codes",
        json={
            "code": "DEL-PARENT",
            "family": "TST",
            "label_sub_account": "Parent",
            "is_leaf": False,
        },
        headers=su_headers,
    )
    assert parent.status_code == 201

    child = client.post(
        "/api/standard-link-codes",
        json={
            "code": "DEL-CHILD",
            "family": "TST",
            "parent_code": "DEL-PARENT",
            "label_sub_account": "Enfant",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert child.status_code == 201

    response = client.delete("/api/standard-link-codes/DEL-PARENT", headers=su_headers)
    assert response.status_code == 200
    assert response.json()["is_active"] is False
    # The child remains resolvable.
    assert client.get("/api/standard-link-codes/DEL-CHILD").status_code == 200


def test_sync_standard_codes_to_companies(client, auth_headers, su_headers):
    company = client.post(
        "/api/companies",
        json={"name": "Sync Test Co"},
        headers=auth_headers,
    )
    assert company.status_code == 201
    company_id = company.json()["id"]

    client.post(
        "/api/standard-link-codes",
        json={
            "code": "SYNC-001",
            "family": "REV",
            "label_sub_account": "Code sync",
            "is_leaf": True,
        },
        headers=su_headers,
    )

    response = client.post("/api/standard-link-codes/sync-companies", headers=su_headers)
    assert response.status_code == 200
    assert response.json()["companies_updated"] >= 1

    structures = client.get(
        f"/api/companies/{company_id}/statement-structures",
        headers=auth_headers,
    )
    assert structures.status_code == 200
    is_struct = next(
        s for s in structures.json()["structures"] if s["statement_type"] == "income-statement"
    )
    link_codes = [
        row.get("linkCode") or row.get("link_code")
        for row in is_struct["structure"]
        if row.get("linkCode") or row.get("link_code")
    ]
    assert "SYNC-001" in link_codes


def test_sync_requires_superadmin(client, auth_headers):
    response = client.post("/api/standard-link-codes/sync-companies", headers=auth_headers)
    assert response.status_code == 403


def test_update_label_propagates_to_company_structures(client, auth_headers, su_headers):
    company = client.post(
        "/api/companies",
        json={"name": "Label Propagation Co"},
        headers=auth_headers,
    )
    assert company.status_code == 201
    company_id = company.json()["id"]

    create_rev = client.post(
        "/api/standard-link-codes",
        json={
            "code": "REV",
            "family": "REV",
            "label_sub_account": "Chiffre d'affaires",
            "is_leaf": False,
        },
        headers=su_headers,
    )
    assert create_rev.status_code == 201

    structure = [
        {"label": "Chiffre d'affaires", "linkCode": "REV", "liaisonMode": "single"},
        {
            "label": "Total revenus custom",
            "liaisonMode": "sum",
            "liaisonSumCodes": ["REV"],
        },
        {"label": "Section sans code", "isSection": True},
    ]
    put = client.put(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        json={"structure": structure},
        headers=auth_headers,
    )
    assert put.status_code == 200

    patch = client.patch(
        "/api/standard-link-codes/REV",
        json={"label_sub_account": "Revenus"},
        headers=su_headers,
    )
    assert patch.status_code == 200
    assert patch.json()["label_sub_account"] == "Revenus"

    structures = client.get(
        f"/api/companies/{company_id}/statement-structures",
        headers=auth_headers,
    )
    assert structures.status_code == 200
    is_struct = next(
        s for s in structures.json()["structures"] if s["statement_type"] == "income-statement"
    )
    rows = is_struct["structure"]
    rev_row = next(r for r in rows if r.get("linkCode") == "REV")
    sum_row = next(r for r in rows if r.get("liaisonMode") == "sum")
    section_row = next(r for r in rows if r.get("isSection"))

    assert rev_row["label"] == "Revenus"
    assert sum_row["label"] == "Total revenus custom"
    assert section_row["label"] == "Section sans code"


def test_create_child_code_placed_after_parent(client, su_headers):
    parent = client.post(
        "/api/standard-link-codes",
        json={
            "code": "TST-PARENT",
            "family": "TST",
            "label_sub_account": "Parent test",
            "is_leaf": False,
        },
        headers=su_headers,
    )
    assert parent.status_code == 201
    parent_order = parent.json()["sort_order"]

    tail = client.post(
        "/api/standard-link-codes",
        json={
            "code": "TST-TAIL",
            "family": "TST",
            "label_sub_account": "Fin de famille",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert tail.status_code == 201

    child = client.post(
        "/api/standard-link-codes",
        json={
            "code": "TST-PARENT.1",
            "family": "TST",
            "parent_code": "TST-PARENT",
            "label_sub_account": "Enfant",
            "is_leaf": True,
        },
        headers=su_headers,
    )
    assert child.status_code == 201
    child_order = child.json()["sort_order"]
    assert child_order == parent_order + 1

    listing = client.get("/api/standard-link-codes")
    tst_group = next(g for g in listing.json() if g["family"] == "TST")
    codes = [c["code"] for c in tst_group["codes"]]
    parent_idx = codes.index("TST-PARENT")
    child_idx = codes.index("TST-PARENT.1")
    tail_idx = codes.index("TST-TAIL")
    assert parent_idx < child_idx < tail_idx
