import uuid

import pytest
import respx
from httpx import Response

from app.config import settings
from app.integrations.quickbooks import oauth


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setattr(settings, "intuit_client_id", "test-client")
    monkeypatch.setattr(settings, "intuit_client_secret", "test-secret")
    monkeypatch.setattr(settings, "intuit_redirect_uri", "http://localhost:8000/api/quickbooks/callback")


def test_state_round_trip():
    company_id = uuid.uuid4()
    user_id = uuid.uuid4()
    token = oauth.create_state(company_id, user_id)
    payload = oauth.verify_state(token)
    assert payload.company_id == company_id
    assert payload.user_id == user_id


def test_state_wrong_audience_rejected():
    from app.utils.security import create_access_token
    bad = create_access_token({"sub": str(uuid.uuid4())})
    with pytest.raises(oauth.InvalidStateError):
        oauth.verify_state(bad)


def test_state_expired_rejected(monkeypatch):
    monkeypatch.setattr(oauth, "_STATE_TTL_SECONDS", -1)
    token = oauth.create_state(uuid.uuid4(), uuid.uuid4())
    with pytest.raises(oauth.InvalidStateError):
        oauth.verify_state(token)


def test_state_garbage_rejected():
    with pytest.raises(oauth.InvalidStateError):
        oauth.verify_state("not-a-jwt")


def test_build_authorize_url():
    url = oauth.build_authorize_url("state-jwt-here")
    assert url.startswith("https://appcenter.intuit.com/connect/oauth2?")
    assert "client_id=test-client" in url
    assert "scope=com.intuit.quickbooks.accounting" in url
    assert "state=state-jwt-here" in url


@respx.mock
def test_exchange_code_for_tokens():
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer").mock(
        return_value=Response(200, json={
            "access_token": "AT-123",
            "refresh_token": "RT-456",
            "expires_in": 3600,
            "x_refresh_token_expires_in": 8640000,
            "token_type": "bearer",
        })
    )
    tokens = oauth.exchange_code_for_tokens("auth-code")
    assert tokens.access_token == "AT-123"
    assert tokens.refresh_token == "RT-456"


@respx.mock
def test_exchange_code_failure_raises():
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer").mock(
        return_value=Response(400, json={"error": "invalid_grant"})
    )
    with pytest.raises(oauth.TokenExchangeError):
        oauth.exchange_code_for_tokens("bad")


@respx.mock
def test_refresh_tokens_success():
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer").mock(
        return_value=Response(200, json={
            "access_token": "AT-new",
            "refresh_token": "RT-rotated",
            "expires_in": 3600,
            "x_refresh_token_expires_in": 8640000,
            "token_type": "bearer",
        })
    )
    tokens = oauth.refresh_tokens("RT-old")
    assert tokens.access_token == "AT-new"


@respx.mock
def test_refresh_tokens_invalid_grant_raises():
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer").mock(
        return_value=Response(400, json={"error": "invalid_grant"})
    )
    with pytest.raises(oauth.TokenExchangeError):
        oauth.refresh_tokens("expired")


@respx.mock
def test_revoke_token_swallows_401():
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/revoke").mock(
        return_value=Response(401)
    )
    oauth.revoke_token("RT-anything")  # no exception
