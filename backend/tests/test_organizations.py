"""Tests for organization member management endpoints."""
import pytest


def _register(client, email="admin@example.com", org_name="Test Org"):
    """Register a user and return (tokens, org_id)."""
    resp = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "testpassword123",
            "full_name": "Admin User",
            "organization_name": org_name,
        },
    )
    assert resp.status_code == 201
    tokens = resp.json()

    # Get org id from /me
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    org_id = me.json()["organizations"][0]["id"]
    return tokens, org_id


def _auth(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


class TestListMembers:
    def test_list_members_returns_creator(self, client):
        tokens, org_id = _register(client)
        resp = client.get(f"/api/organizations/{org_id}/members", headers=_auth(tokens))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["members"]) == 1
        assert data["members"][0]["email"] == "admin@example.com"
        assert data["members"][0]["role"] == "admin"

    def test_list_members_requires_membership(self, client):
        _, org_id = _register(client, "admin@example.com")
        tokens2, _ = _register(client, "other@example.com", "Other Org")
        resp = client.get(f"/api/organizations/{org_id}/members", headers=_auth(tokens2))
        assert resp.status_code == 403


class TestInviteMember:
    def test_invite_new_user(self, client):
        tokens, org_id = _register(client)
        resp = client.post(
            f"/api/organizations/{org_id}/members",
            json={"email": "new@example.com", "role": "member"},
            headers=_auth(tokens),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "new@example.com"
        assert data["role"] == "member"

    def test_invite_existing_user(self, client):
        tokens, org_id = _register(client)
        # Register a second user in a different org
        tokens2, _ = _register(client, "existing@example.com", "Other Org")
        # Invite them to first org
        resp = client.post(
            f"/api/organizations/{org_id}/members",
            json={"email": "existing@example.com", "role": "viewer"},
            headers=_auth(tokens),
        )
        assert resp.status_code == 201
        assert resp.json()["role"] == "viewer"

    def test_invite_duplicate_fails(self, client):
        tokens, org_id = _register(client)
        client.post(
            f"/api/organizations/{org_id}/members",
            json={"email": "dup@example.com", "role": "member"},
            headers=_auth(tokens),
        )
        resp = client.post(
            f"/api/organizations/{org_id}/members",
            json={"email": "dup@example.com", "role": "member"},
            headers=_auth(tokens),
        )
        assert resp.status_code == 409

    def test_invite_requires_admin(self, client):
        tokens, org_id = _register(client)
        # Invite a member
        client.post(
            f"/api/organizations/{org_id}/members",
            json={"email": "member@example.com", "role": "member"},
            headers=_auth(tokens),
        )
        # Login as the member
        login_resp = client.post(
            "/api/auth/login",
            json={"email": "member@example.com", "password": "TemporaryPassword123!"},
        )
        member_tokens = login_resp.json()
        # Member tries to invite - should fail
        resp = client.post(
            f"/api/organizations/{org_id}/members",
            json={"email": "another@example.com", "role": "member"},
            headers=_auth(member_tokens),
        )
        assert resp.status_code == 403

    def test_invite_invalid_role(self, client):
        tokens, org_id = _register(client)
        resp = client.post(
            f"/api/organizations/{org_id}/members",
            json={"email": "bad@example.com", "role": "superadmin"},
            headers=_auth(tokens),
        )
        assert resp.status_code == 400


class TestUpdateRole:
    def test_change_role(self, client):
        tokens, org_id = _register(client)
        invite = client.post(
            f"/api/organizations/{org_id}/members",
            json={"email": "user@example.com", "role": "member"},
            headers=_auth(tokens),
        )
        user_id = invite.json()["id"]
        resp = client.patch(
            f"/api/organizations/{org_id}/members/{user_id}",
            json={"role": "viewer"},
            headers=_auth(tokens),
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "viewer"

    def test_cannot_demote_last_admin(self, client):
        tokens, org_id = _register(client)
        me = client.get("/api/auth/me", headers=_auth(tokens))
        admin_id = me.json()["user"]["id"]
        resp = client.patch(
            f"/api/organizations/{org_id}/members/{admin_id}",
            json={"role": "member"},
            headers=_auth(tokens),
        )
        assert resp.status_code == 400
        assert "last admin" in resp.json()["detail"].lower()

    def test_update_requires_admin(self, client):
        tokens, org_id = _register(client)
        invite = client.post(
            f"/api/organizations/{org_id}/members",
            json={"email": "member@example.com", "role": "member"},
            headers=_auth(tokens),
        )
        user_id = invite.json()["id"]
        # Login as member
        login_resp = client.post(
            "/api/auth/login",
            json={"email": "member@example.com", "password": "TemporaryPassword123!"},
        )
        member_tokens = login_resp.json()
        resp = client.patch(
            f"/api/organizations/{org_id}/members/{user_id}",
            json={"role": "admin"},
            headers=_auth(member_tokens),
        )
        assert resp.status_code == 403


class TestRemoveMember:
    def test_remove_member(self, client):
        tokens, org_id = _register(client)
        invite = client.post(
            f"/api/organizations/{org_id}/members",
            json={"email": "user@example.com", "role": "member"},
            headers=_auth(tokens),
        )
        user_id = invite.json()["id"]
        resp = client.delete(
            f"/api/organizations/{org_id}/members/{user_id}",
            headers=_auth(tokens),
        )
        assert resp.status_code == 204

        # Verify removed
        members = client.get(f"/api/organizations/{org_id}/members", headers=_auth(tokens))
        assert len(members.json()["members"]) == 1

    def test_cannot_remove_last_admin(self, client):
        tokens, org_id = _register(client)
        me = client.get("/api/auth/me", headers=_auth(tokens))
        admin_id = me.json()["user"]["id"]
        resp = client.delete(
            f"/api/organizations/{org_id}/members/{admin_id}",
            headers=_auth(tokens),
        )
        assert resp.status_code == 400
        assert "last admin" in resp.json()["detail"].lower()

    def test_remove_requires_admin(self, client):
        tokens, org_id = _register(client)
        invite = client.post(
            f"/api/organizations/{org_id}/members",
            json={"email": "member@example.com", "role": "member"},
            headers=_auth(tokens),
        )
        user_id = invite.json()["id"]
        # Login as member
        login_resp = client.post(
            "/api/auth/login",
            json={"email": "member@example.com", "password": "TemporaryPassword123!"},
        )
        member_tokens = login_resp.json()
        resp = client.delete(
            f"/api/organizations/{org_id}/members/{user_id}",
            headers=_auth(member_tokens),
        )
        assert resp.status_code == 403
