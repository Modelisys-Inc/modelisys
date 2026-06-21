"""Tests for tenant-local custom link codes (CompanyLinkCode overlay).

Covers the Phase 2 overlay: custom-code creation + namespacing + collision
rejection, both validation gates accepting overlay codes, cross-company
isolation, and that a custom code is appended to the company's statement
structure so it renders in reports.
"""
import uuid


def _create_company(client, auth_headers, name="Test Co"):
    response = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]


def _create_custom_code(client, auth_headers, company_id, **overrides):
    payload = {"family": "EXP", "label_account": "Frais spéciaux"}
    payload.update(overrides)
    return client.post(
        f"/api/companies/{company_id}/custom-link-codes",
        json=payload,
        headers=auth_headers,
    )


# ── creation + namespacing ──────────────────────────────────────────────────

def test_create_custom_code_autogenerates_code(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    resp = _create_custom_code(client, auth_headers, company_id)
    assert resp.status_code == 201
    body = resp.json()
    assert body["code"] == "EXP-Z1"  # reserved Z namespace, collision-free
    assert body["family"] == "EXP"
    assert body["is_leaf"] is True
    assert body["is_custom"] is True


def test_create_custom_code_increments_namespace(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    first = _create_custom_code(client, auth_headers, company_id).json()
    second = _create_custom_code(client, auth_headers, company_id).json()
    assert first["code"] == "EXP-Z1"
    assert second["code"] == "EXP-Z2"


def test_create_custom_code_explicit_code(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    resp = _create_custom_code(client, auth_headers, company_id, code="EXP-CUSTOM")
    assert resp.status_code == 201
    assert resp.json()["code"] == "EXP-CUSTOM"


def test_create_custom_code_rejects_global_collision(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    # "REV-001" is seeded as a global standard code in conftest.
    resp = _create_custom_code(client, auth_headers, company_id, code="REV-001")
    assert resp.status_code == 409


def test_create_custom_code_rejects_duplicate_custom(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _create_custom_code(client, auth_headers, company_id, code="EXP-DUP")
    resp = _create_custom_code(client, auth_headers, company_id, code="EXP-DUP")
    assert resp.status_code == 409


def test_list_custom_codes(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    _create_custom_code(client, auth_headers, company_id)
    resp = client.get(
        f"/api/companies/{company_id}/custom-link-codes", headers=auth_headers
    )
    assert resp.status_code == 200
    codes = resp.json()
    assert len(codes) == 1
    assert codes[0]["code"] == "EXP-Z1"


# ── validation gate: manual mapping upsert ──────────────────────────────────

def test_mapping_upsert_accepts_custom_leaf_code(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id).json()

    resp = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[{"account_number": "5000", "description": "X", "link_code": custom["code"]}],
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["mappings"][0]["link_code"] == custom["code"]


def test_mapping_upsert_still_rejects_unknown_code(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    resp = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[{"account_number": "5000", "description": "X", "link_code": "NOPE-999"}],
        headers=auth_headers,
    )
    assert resp.status_code == 422
    assert "NOPE-999" in resp.json()["detail"]["invalid_codes"]


def test_mapping_upsert_accepts_global_code_still(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    # REV-001 is a seeded global leaf code.
    resp = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=[{"account_number": "4000", "description": "Sales", "link_code": "REV-001"}],
        headers=auth_headers,
    )
    assert resp.status_code == 200


# ── cross-company isolation ─────────────────────────────────────────────────

def test_custom_code_isolated_between_companies(client, auth_headers):
    company_a = _create_company(client, auth_headers, name="A")
    company_b = _create_company(client, auth_headers, name="B")
    custom = _create_custom_code(client, auth_headers, company_a).json()

    # Company B must NOT be able to use company A's private code.
    resp = client.put(
        f"/api/companies/{company_b}/account-mappings",
        json=[{"account_number": "5000", "description": "X", "link_code": custom["code"]}],
        headers=auth_headers,
    )
    assert resp.status_code == 422
    assert custom["code"] in resp.json()["detail"]["invalid_codes"]


# ── renders in reports (appended to statement structure) ────────────────────

def test_custom_code_appended_to_statement_structure(client, auth_headers, db):
    from app.models.financial_statement_mapping import CompanyStatementStructure

    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id).json()

    structure = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == uuid.UUID(company_id),
            CompanyStatementStructure.statement_type == "income-statement",
        )
        .first()
    )
    assert structure is not None
    link_codes = [
        r.get("linkCode") for r in structure.structure if isinstance(r, dict)
    ]
    assert custom["code"] in link_codes


# ── delete ──────────────────────────────────────────────────────────────────

def test_delete_custom_code(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id).json()
    resp = client.delete(
        f"/api/companies/{company_id}/custom-link-codes/{custom['id']}",
        headers=auth_headers,
    )
    assert resp.status_code == 204
    listing = client.get(
        f"/api/companies/{company_id}/custom-link-codes", headers=auth_headers
    ).json()
    assert listing == []
