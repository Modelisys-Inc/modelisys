"""Tests for admin grant-management: all_companies toggle + per-company grants
on the org members API, and that grants actually unlock access.
"""
import uuid

from app.models.user import UserOrganization
from app.utils.security import create_access_token


def _org_id(db):
    return db.query(UserOrganization).first().organization_id


def _create_company(client, auth_headers, name="Co"):
    r = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert r.status_code == 201
    return r.json()["id"]


def _invite(client, auth_headers, org_id, email, role="member"):
    r = client.post(
        f"/api/organizations/{org_id}/members",
        json={"email": email, "role": role},
        headers=auth_headers,
    )
    assert r.status_code == 201
    return r.json()


def _headers_for(user_id):
    return {"Authorization": f"Bearer {create_access_token({'sub': str(user_id)})}"}


def test_member_list_includes_grants_and_all_companies(client, auth_headers, db):
    org_id = _org_id(db)
    _invite(client, auth_headers, org_id, "m@e.com", role="member")
    r = client.get(f"/api/organizations/{org_id}/members", headers=auth_headers)
    assert r.status_code == 200
    member = next(m for m in r.json()["members"] if m["email"] == "m@e.com")
    assert member["all_companies"] is False
    assert member["company_ids"] == []


def test_admin_sets_all_companies_toggle(client, auth_headers, db):
    org_id = _org_id(db)
    invited = _invite(client, auth_headers, org_id, "m2@e.com")
    r = client.patch(
        f"/api/organizations/{org_id}/members/{invited['id']}",
        json={"all_companies": True},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json()["all_companies"] is True


def test_admin_grants_company_and_member_can_access(client, auth_headers, db):
    org_id = _org_id(db)
    cid = _create_company(client, auth_headers, "Granted Co")
    invited = _invite(client, auth_headers, org_id, "m3@e.com", role="member")

    # Before grant: member cannot read.
    h = _headers_for(invited["id"])
    assert client.get(f"/api/companies/{cid}/account-mappings", headers=h).status_code == 404

    # Admin grants the company.
    r = client.put(
        f"/api/organizations/{org_id}/members/{invited['id']}/companies",
        json={"company_ids": [cid]},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert cid in r.json()["company_ids"]

    # After grant: member can read.
    assert client.get(f"/api/companies/{cid}/account-mappings", headers=h).status_code == 200


def test_set_companies_replaces_previous_grants(client, auth_headers, db):
    org_id = _org_id(db)
    c1 = _create_company(client, auth_headers, "C1")
    c2 = _create_company(client, auth_headers, "C2")
    invited = _invite(client, auth_headers, org_id, "m4@e.com")

    client.put(
        f"/api/organizations/{org_id}/members/{invited['id']}/companies",
        json={"company_ids": [c1]},
        headers=auth_headers,
    )
    r = client.put(
        f"/api/organizations/{org_id}/members/{invited['id']}/companies",
        json={"company_ids": [c2]},
        headers=auth_headers,
    )
    assert r.json()["company_ids"] == [c2]


def test_set_companies_rejects_foreign_company(client, auth_headers, db):
    org_id = _org_id(db)
    invited = _invite(client, auth_headers, org_id, "m5@e.com")
    # A random company id not in this org.
    r = client.put(
        f"/api/organizations/{org_id}/members/{invited['id']}/companies",
        json={"company_ids": [str(uuid.uuid4())]},
        headers=auth_headers,
    )
    assert r.status_code == 400


def test_non_admin_cannot_manage_members(client, auth_headers, db):
    org_id = _org_id(db)
    invited = _invite(client, auth_headers, org_id, "m6@e.com", role="member")
    h = _headers_for(invited["id"])
    # A member trying to invite another member.
    r = client.post(
        f"/api/organizations/{org_id}/members",
        json={"email": "x@e.com", "role": "member"},
        headers=h,
    )
    assert r.status_code == 403
