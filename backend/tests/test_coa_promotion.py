"""Tests for curated promotion of tenant-local codes into the global registry (Phase 4)."""
import uuid

from app.models.standard_link_code import StandardLinkCode


def _create_company(client, auth_headers, name="Test Co"):
    r = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert r.status_code == 201
    return r.json()["id"]


def _create_custom_code(client, auth_headers, company_id, **over):
    payload = {"family": "EXP", "label_account": "Frais spéciaux"}
    payload.update(over)
    r = client.post(
        f"/api/companies/{company_id}/custom-link-codes", json=payload, headers=auth_headers
    )
    assert r.status_code == 201
    return r.json()


def _candidates(client, auth_headers):
    r = client.get("/api/coa/promotion-candidates", headers=auth_headers)
    assert r.status_code == 200
    return r.json()["candidates"]


def test_custom_code_appears_as_candidate(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id)

    cands = _candidates(client, auth_headers)
    assert len(cands) == 1
    assert cands[0]["id"] == custom["id"]
    assert cands[0]["promotion_status"] == "pending"
    assert cands[0]["company_name"] == "Test Co"


def test_promote_creates_new_global_code(client, auth_headers, db):
    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id)

    r = client.post(
        f"/api/coa/promotion-candidates/{custom['id']}/promote",
        json={"code": "EXP-PROMOTED", "label_account": "Frais promus"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["created_new_code"] is True
    assert body["promoted_to_standard_code"] == "EXP-PROMOTED"

    # New global code exists, is a leaf, and is assignable.
    created = db.query(StandardLinkCode).filter_by(code="EXP-PROMOTED").one()
    assert created.is_leaf is True
    assert created.is_active is True
    assert created.coa_version is not None

    # It leaves the pending queue.
    assert _candidates(client, auth_headers) == []


def test_promote_link_to_existing_creates_no_new_code(client, auth_headers, db):
    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id)

    before = db.query(StandardLinkCode).count()
    # REV-001 is a seeded global leaf code (conftest).
    r = client.post(
        f"/api/coa/promotion-candidates/{custom['id']}/promote",
        json={"link_to_existing_code": "REV-001"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["created_new_code"] is False
    assert body["promoted_to_standard_code"] == "REV-001"
    assert db.query(StandardLinkCode).count() == before  # no new code


def test_promote_rejects_global_code_collision(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id)
    # REV-001 already exists globally.
    r = client.post(
        f"/api/coa/promotion-candidates/{custom['id']}/promote",
        json={"code": "REV-001"},
        headers=auth_headers,
    )
    assert r.status_code == 409


def test_dedup_suggestion_by_signature(client, auth_headers, db):
    # Seed a global leaf with a matching signature (family + ft_category + account_type).
    db.add(StandardLinkCode(
        id=uuid.uuid4(), code="EXP-STD", family="EXP",
        ft_category="Opex", account_type="Charges",
        is_leaf=True, is_active=True, sort_order=99,
    ))
    db.commit()

    company_id = _create_company(client, auth_headers)
    _create_custom_code(
        client, auth_headers, company_id,
        ft_category="Opex", account_type="Charges",
    )

    cands = _candidates(client, auth_headers)
    assert cands[0]["suggested_match"] is not None
    assert cands[0]["suggested_match"]["code"] == "EXP-STD"


def test_reject_removes_from_queue(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id)

    r = client.post(
        f"/api/coa/promotion-candidates/{custom['id']}/reject", headers=auth_headers
    )
    assert r.status_code == 204
    assert _candidates(client, auth_headers) == []


def test_promote_unknown_candidate_404(client, auth_headers):
    r = client.post(
        f"/api/coa/promotion-candidates/{uuid.uuid4()}/promote",
        json={},
        headers=auth_headers,
    )
    assert r.status_code == 404
