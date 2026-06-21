"""RBAC tests: role/grant scoping, viewer read-only, all-companies toggle,
superadmin bypass, and cross-org isolation.

Existing users created via /api/auth/register are org ADMINs, so the rest of the
suite (which uses auth_headers) exercises the admin path. Here we create
member/viewer/superadmin users directly and mint tokens for them.
"""
import uuid

from app.models.company import Company
from app.models.user import User, UserCompanyAccess, UserOrganization, UserRole
from app.utils.security import create_access_token


def _create_company(client, auth_headers, name="Test Co"):
    r = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert r.status_code == 201
    return r.json()["id"]


def _org_id_of(db, company_id):
    return db.query(Company).filter(Company.id == uuid.UUID(company_id)).one().organization_id


def _headers_for(user: User):
    return {"Authorization": f"Bearer {create_access_token({'sub': str(user.id)})}"}


def _make_user(db, email, *, org_id=None, role=UserRole.MEMBER, all_companies=False, is_superadmin=False):
    u = User(email=email, hashed_password="x", full_name="T", is_active=True, is_superadmin=is_superadmin)
    db.add(u)
    db.flush()
    if org_id is not None:
        db.add(UserOrganization(user_id=u.id, organization_id=org_id, role=role, all_companies=all_companies))
    db.commit()
    return u


def _grant(db, user, company_id):
    db.add(UserCompanyAccess(user_id=user.id, company_id=uuid.UUID(company_id)))
    db.commit()


# ── read scoping ─────────────────────────────────────────────────────────────

def test_member_without_grant_cannot_read_company_data(client, auth_headers, db):
    cid = _create_company(client, auth_headers)
    member = _make_user(db, "m1@e.com", org_id=_org_id_of(db, cid), role=UserRole.MEMBER)
    r = client.get(f"/api/companies/{cid}/account-mappings", headers=_headers_for(member))
    assert r.status_code == 404


def test_member_with_grant_can_read_and_write(client, auth_headers, db):
    cid = _create_company(client, auth_headers)
    member = _make_user(db, "m2@e.com", org_id=_org_id_of(db, cid), role=UserRole.MEMBER)
    _grant(db, member, cid)
    h = _headers_for(member)

    assert client.get(f"/api/companies/{cid}/account-mappings", headers=h).status_code == 200
    w = client.put(
        f"/api/companies/{cid}/account-mappings",
        json=[{"account_number": "1000", "description": "Cash"}],
        headers=h,
    )
    assert w.status_code == 200


def test_all_companies_toggle_grants_read_without_explicit_grant(client, auth_headers, db):
    cid = _create_company(client, auth_headers)
    member = _make_user(
        db, "m3@e.com", org_id=_org_id_of(db, cid), role=UserRole.MEMBER, all_companies=True
    )
    assert client.get(f"/api/companies/{cid}/account-mappings", headers=_headers_for(member)).status_code == 200


# ── viewer is read-only ──────────────────────────────────────────────────────

def test_viewer_with_grant_can_read_but_not_write(client, auth_headers, db):
    cid = _create_company(client, auth_headers)
    viewer = _make_user(db, "v1@e.com", org_id=_org_id_of(db, cid), role=UserRole.VIEWER)
    _grant(db, viewer, cid)
    h = _headers_for(viewer)

    assert client.get(f"/api/companies/{cid}/account-mappings", headers=h).status_code == 200
    w = client.put(
        f"/api/companies/{cid}/account-mappings",
        json=[{"account_number": "1000", "description": "Cash"}],
        headers=h,
    )
    assert w.status_code == 403


# ── company administration is admin-only ─────────────────────────────────────

def test_member_cannot_create_company(client, auth_headers, db):
    cid = _create_company(client, auth_headers)
    member = _make_user(db, "m4@e.com", org_id=_org_id_of(db, cid), role=UserRole.MEMBER)
    r = client.post("/api/companies", json={"name": "Nope"}, headers=_headers_for(member))
    assert r.status_code == 403


# ── list scoping ─────────────────────────────────────────────────────────────

def test_list_companies_is_scoped_for_member(client, auth_headers, db):
    c1 = _create_company(client, auth_headers, name="A")
    c2 = _create_company(client, auth_headers, name="B")
    member = _make_user(db, "m5@e.com", org_id=_org_id_of(db, c1), role=UserRole.MEMBER)
    _grant(db, member, c1)

    r = client.get("/api/companies", headers=_headers_for(member))
    assert r.status_code == 200
    ids = {c["id"] for c in r.json()["companies"]}
    assert c1 in ids and c2 not in ids


# ── superadmin bypass ────────────────────────────────────────────────────────

def test_superadmin_can_access_any_company(client, auth_headers, db):
    cid = _create_company(client, auth_headers)
    su = _make_user(db, "su@e.com", is_superadmin=True)  # no org membership at all
    assert client.get(f"/api/companies/{cid}/account-mappings", headers=_headers_for(su)).status_code == 200


# ── cross-org isolation ──────────────────────────────────────────────────────

def test_user_in_other_org_cannot_access(client, auth_headers, db):
    cid = _create_company(client, auth_headers)  # org A
    # Register a second user → creates its own org B.
    rb = client.post(
        "/api/auth/register",
        json={
            "email": "orgb@example.com",
            "password": "TestPassword123",
            "full_name": "B",
            "organization_name": "Org B",
        },
    )
    hb = {"Authorization": f"Bearer {rb.json()['access_token']}"}
    assert client.get(f"/api/companies/{cid}/account-mappings", headers=hb).status_code == 404
