from datetime import datetime, timedelta, timezone

import pytest
import respx
from httpx import Response

from app.integrations.quickbooks import encryption, oauth, service
from app.models.quickbooks_connection import QuickBooksConnection


def _tokens(at="AT", rt="RT"):
    return oauth.TokenResponse(
        access_token=at,
        refresh_token=rt,
        expires_in=3600,
        x_refresh_token_expires_in=8640000,
    )


def test_upsert_creates_new_connection(db, org_user_company):
    _, user, company = org_user_company
    conn = service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    assert conn.realm_id == "realm-1"
    assert encryption.decrypt(conn.access_token) == "AT"
    assert encryption.decrypt(conn.refresh_token) == "RT"
    assert conn.status == "active"


def test_upsert_overwrites_existing(db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens("A1", "R1"), user.id)
    conn = service.upsert_connection(db, company.id, "realm-2", _tokens("A2", "R2"), user.id)
    assert encryption.decrypt(conn.access_token) == "A2"
    assert conn.realm_id == "realm-2"
    assert db.query(QuickBooksConnection).count() == 1


def test_get_valid_access_token_returns_existing_when_fresh(db, org_user_company):
    _, user, company = org_user_company
    conn = service.upsert_connection(db, company.id, "r", _tokens(), user.id)
    assert service.get_valid_access_token(db, conn) == "AT"


@respx.mock
def test_get_valid_access_token_refreshes_when_expired(db, org_user_company):
    _, user, company = org_user_company
    conn = service.upsert_connection(db, company.id, "r", _tokens(), user.id)
    conn.access_token_expires_at = datetime.now(timezone.utc) - timedelta(seconds=10)
    db.commit()
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer").mock(
        return_value=Response(200, json={
            "access_token": "AT-new",
            "refresh_token": "RT-new",
            "expires_in": 3600,
            "x_refresh_token_expires_in": 8640000,
            "token_type": "bearer",
        })
    )
    assert service.get_valid_access_token(db, conn) == "AT-new"
    db.refresh(conn)
    assert encryption.decrypt(conn.refresh_token) == "RT-new"


@respx.mock
def test_get_valid_access_token_marks_revoked_on_invalid_grant(db, org_user_company):
    _, user, company = org_user_company
    conn = service.upsert_connection(db, company.id, "r", _tokens(), user.id)
    conn.access_token_expires_at = datetime.now(timezone.utc) - timedelta(seconds=10)
    db.commit()
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer").mock(
        return_value=Response(400, json={"error": "invalid_grant"})
    )
    with pytest.raises(service.ConnectionRevokedError):
        service.get_valid_access_token(db, conn)
    db.refresh(conn)
    assert conn.status == "revoked"


def test_get_valid_access_token_rejects_revoked(db, org_user_company):
    _, user, company = org_user_company
    conn = service.upsert_connection(db, company.id, "r", _tokens(), user.id)
    conn.status = "revoked"
    db.commit()
    with pytest.raises(service.ConnectionRevokedError):
        service.get_valid_access_token(db, conn)


@respx.mock
def test_disconnect_revokes_and_deletes(db, org_user_company):
    _, user, company = org_user_company
    conn = service.upsert_connection(db, company.id, "r", _tokens(), user.id)
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/revoke").mock(
        return_value=Response(200)
    )
    service.disconnect(db, conn)
    assert db.query(QuickBooksConnection).count() == 0


@respx.mock
def test_disconnect_proceeds_when_revoke_returns_500(db, org_user_company):
    _, user, company = org_user_company
    conn = service.upsert_connection(db, company.id, "r", _tokens(), user.id)
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/revoke").mock(
        return_value=Response(500)
    )
    service.disconnect(db, conn)
    assert db.query(QuickBooksConnection).count() == 0
