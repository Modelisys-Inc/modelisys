"""Tests for superadmin client (organization) management + feature flags."""
import uuid

import pytest

from app.models.organization import Organization
from app.models.user import User, UserOrganization, UserRole
from app.utils.security import create_access_token


@pytest.fixture
def su_headers(db):
    u = User(email="root-admin@e.com", hashed_password="x", full_name="Root", is_active=True, is_superadmin=True)
    db.add(u)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token({'sub': str(u.id)})}"}


def test_create_client_with_admin(client, su_headers, db):
    r = client.post(
        "/api/admin/organizations",
        json={"name": "Acme Holdings", "admin_email": "owner@acme.com"},
        headers=su_headers,
    )
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "Acme Holdings"
    assert body["slug"] == "acme-holdings"
    assert body["member_count"] == 1
    assert body["company_count"] == 0
    # Effective flags default to the registry (all enabled).
    assert body["feature_flags"]["quickbooks"] is True

    # The admin user + membership were created.
    org = db.query(Organization).filter(Organization.id == uuid.UUID(body["id"])).one()
    user = db.query(User).filter(User.email == "owner@acme.com").one()
    membership = db.query(UserOrganization).filter(
        UserOrganization.user_id == user.id, UserOrganization.organization_id == org.id
    ).one()
    assert membership.role == UserRole.ADMIN


def test_create_client_unique_slug(client, su_headers):
    a = client.post("/api/admin/organizations", json={"name": "Dup", "admin_email": "a@x.com"}, headers=su_headers)
    b = client.post("/api/admin/organizations", json={"name": "Dup", "admin_email": "b@x.com"}, headers=su_headers)
    assert a.json()["slug"] == "dup"
    assert b.json()["slug"] == "dup-2"


def test_list_clients(client, su_headers):
    client.post("/api/admin/organizations", json={"name": "Cli A", "admin_email": "a2@x.com"}, headers=su_headers)
    r = client.get("/api/admin/organizations", headers=su_headers)
    assert r.status_code == 200
    names = [o["name"] for o in r.json()["organizations"]]
    assert "Cli A" in names


def test_feature_flag_registry(client, su_headers):
    r = client.get("/api/admin/feature-flags", headers=su_headers)
    assert r.status_code == 200
    keys = {f["key"] for f in r.json()}
    assert {"quickbooks", "projections", "evaluation"} <= keys


def test_set_feature_flags(client, su_headers):
    created = client.post(
        "/api/admin/organizations",
        json={"name": "Flagco", "admin_email": "f@x.com"},
        headers=su_headers,
    ).json()
    org_id = created["id"]

    r = client.patch(
        f"/api/admin/organizations/{org_id}/feature-flags",
        json={"flags": {"quickbooks": False, "bogus_unknown": True}},
        headers=su_headers,
    )
    assert r.status_code == 200
    flags = r.json()["feature_flags"]
    assert flags["quickbooks"] is False  # override applied
    assert flags["projections"] is True  # default kept
    assert "bogus_unknown" not in flags  # unknown key ignored


def test_me_exposes_effective_flags(client, auth_headers, su_headers, db):
    # The registered user (auth_headers) has an org; superadmin disables a flag on it.
    me = client.get("/api/auth/me", headers=auth_headers).json()
    org_id = me["organizations"][0]["id"]
    assert me["organizations"][0]["feature_flags"]["quickbooks"] is True

    client.patch(
        f"/api/admin/organizations/{org_id}/feature-flags",
        json={"flags": {"quickbooks": False}},
        headers=su_headers,
    )
    me2 = client.get("/api/auth/me", headers=auth_headers).json()
    assert me2["organizations"][0]["feature_flags"]["quickbooks"] is False


def test_non_superadmin_blocked(client, auth_headers):
    assert client.get("/api/admin/organizations", headers=auth_headers).status_code == 403
    assert client.post(
        "/api/admin/organizations",
        json={"name": "X", "admin_email": "x@x.com"},
        headers=auth_headers,
    ).status_code == 403
