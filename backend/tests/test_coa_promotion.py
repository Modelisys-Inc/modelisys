"""Tests for curated promotion of tenant-local codes into the global registry.

Promotion writes to the GLOBAL chart, so it is superadmin-only. Custom codes are
created by the org admin (auth_headers); promotion/curation uses su_headers.
"""
import uuid

import pytest

from app.models.standard_link_code import StandardLinkCode
from app.models.user import User
from app.utils.security import create_access_token


@pytest.fixture
def su_headers(db):
    u = User(email="root-promo@e.com", hashed_password="x", full_name="Root", is_active=True, is_superadmin=True)
    db.add(u)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token({'sub': str(u.id)})}"}


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


def _candidates(client, headers):
    r = client.get("/api/coa/promotion-candidates", headers=headers)
    assert r.status_code == 200
    return r.json()["candidates"]


def test_custom_code_appears_as_candidate(client, auth_headers, su_headers):
    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id)

    cands = _candidates(client, su_headers)
    assert len(cands) == 1
    assert cands[0]["id"] == custom["id"]
    assert cands[0]["promotion_status"] == "pending"
    assert cands[0]["company_name"] == "Test Co"


def test_promote_creates_new_global_code(client, auth_headers, su_headers, db):
    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id)

    r = client.post(
        f"/api/coa/promotion-candidates/{custom['id']}/promote",
        json={"code": "EXP-PROMOTED", "label_account": "Frais promus"},
        headers=su_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["created_new_code"] is True
    assert body["promoted_to_standard_code"] == "EXP-PROMOTED"

    created = db.query(StandardLinkCode).filter_by(code="EXP-PROMOTED").one()
    assert created.is_leaf is True
    assert created.is_active is True
    assert created.coa_version is not None

    assert _candidates(client, su_headers) == []


def test_promote_link_to_existing_creates_no_new_code(client, auth_headers, su_headers, db):
    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id)

    before = db.query(StandardLinkCode).count()
    r = client.post(
        f"/api/coa/promotion-candidates/{custom['id']}/promote",
        json={"link_to_existing_code": "REV-001"},
        headers=su_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["created_new_code"] is False
    assert body["promoted_to_standard_code"] == "REV-001"
    assert db.query(StandardLinkCode).count() == before


def test_promote_rejects_global_code_collision(client, auth_headers, su_headers):
    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id)
    r = client.post(
        f"/api/coa/promotion-candidates/{custom['id']}/promote",
        json={"code": "REV-001"},
        headers=su_headers,
    )
    assert r.status_code == 409


def test_dedup_suggestion_by_signature(client, auth_headers, su_headers, db):
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

    cands = _candidates(client, su_headers)
    assert cands[0]["suggested_match"] is not None
    assert cands[0]["suggested_match"]["code"] == "EXP-STD"


def test_reject_removes_from_queue(client, auth_headers, su_headers):
    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id)

    r = client.post(
        f"/api/coa/promotion-candidates/{custom['id']}/reject", headers=su_headers
    )
    assert r.status_code == 204
    assert _candidates(client, su_headers) == []


def test_promote_unknown_candidate_404(client, su_headers):
    r = client.post(
        f"/api/coa/promotion-candidates/{uuid.uuid4()}/promote",
        json={},
        headers=su_headers,
    )
    assert r.status_code == 404


def test_non_superadmin_cannot_promote(client, auth_headers):
    # auth_headers is an org admin, NOT a platform superadmin.
    company_id = _create_company(client, auth_headers)
    custom = _create_custom_code(client, auth_headers, company_id)
    r = client.post(
        f"/api/coa/promotion-candidates/{custom['id']}/promote",
        json={"code": "EXP-X"},
        headers=auth_headers,
    )
    assert r.status_code == 403
    # And the list is superadmin-only too.
    assert client.get("/api/coa/promotion-candidates", headers=auth_headers).status_code == 403
