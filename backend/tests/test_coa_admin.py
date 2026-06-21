"""Tests for superadmin global-code CRUD (standard_link_codes) + gating."""
import uuid

from app.models.standard_link_code import StandardLinkCode
from app.models.user import User
from app.utils.security import create_access_token


def _superadmin_headers(db):
    u = User(email="root@e.com", hashed_password="x", full_name="Root", is_active=True, is_superadmin=True)
    db.add(u)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token({'sub': str(u.id)})}"}


def test_superadmin_can_create_code(client, db):
    h = _superadmin_headers(db)
    r = client.post(
        "/api/standard-link-codes",
        json={"code": "NEW-1", "family": "EXP", "label_account": "Nouveau"},
        headers=h,
    )
    assert r.status_code == 201
    body = r.json()
    assert body["code"] == "NEW-1"
    assert body["is_active"] is True
    # Persisted + stamped with a version.
    rec = db.query(StandardLinkCode).filter_by(code="NEW-1").one()
    assert rec.coa_version is not None


def test_create_rejects_duplicate(client, db):
    h = _superadmin_headers(db)
    client.post("/api/standard-link-codes", json={"code": "DUP-1", "family": "EXP"}, headers=h)
    r = client.post("/api/standard-link-codes", json={"code": "DUP-1", "family": "EXP"}, headers=h)
    assert r.status_code == 409


def test_superadmin_can_update_metadata(client, db):
    h = _superadmin_headers(db)
    client.post("/api/standard-link-codes", json={"code": "UPD-1", "family": "EXP", "label_account": "Old"}, headers=h)
    r = client.patch("/api/standard-link-codes/UPD-1", json={"label_account": "New"}, headers=h)
    assert r.status_code == 200
    assert r.json()["label_account"] == "New"


def test_superadmin_can_deprecate_and_reactivate(client, db):
    h = _superadmin_headers(db)
    client.post("/api/standard-link-codes", json={"code": "DEP-1", "family": "EXP"}, headers=h)

    r = client.delete("/api/standard-link-codes/DEP-1", headers=h)
    assert r.status_code == 200
    assert r.json()["is_active"] is False
    # Not hard-deleted.
    assert db.query(StandardLinkCode).filter_by(code="DEP-1").one().is_active is False

    r2 = client.delete("/api/standard-link-codes/DEP-1?reactivate=true", headers=h)
    assert r2.status_code == 200
    assert r2.json()["is_active"] is True


def test_non_superadmin_cannot_mutate(client, auth_headers):
    # auth_headers is a regular org admin, NOT a platform superadmin.
    r = client.post(
        "/api/standard-link-codes",
        json={"code": "NOPE-1", "family": "EXP"},
        headers=auth_headers,
    )
    assert r.status_code == 403


def test_unauthenticated_cannot_mutate(client):
    r = client.post("/api/standard-link-codes", json={"code": "NOPE-2", "family": "EXP"})
    assert r.status_code in (401, 403)
