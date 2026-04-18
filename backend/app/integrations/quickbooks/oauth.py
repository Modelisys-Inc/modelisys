"""Intuit OAuth2 helpers: state JWT, authorize URL, token exchange + refresh."""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import settings

_STATE_AUDIENCE = "qbo-oauth"
_STATE_TTL_SECONDS = 600  # 10 minutes


class InvalidStateError(Exception):
    pass


class TokenExchangeError(Exception):
    pass


@dataclass
class StatePayload:
    company_id: uuid.UUID
    user_id: uuid.UUID


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    x_refresh_token_expires_in: int


def create_state(company_id: uuid.UUID, user_id: uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "aud": _STATE_AUDIENCE,
        "company_id": str(company_id),
        "user_id": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=_STATE_TTL_SECONDS)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_state(token: str) -> StatePayload:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            audience=_STATE_AUDIENCE,
        )
    except JWTError as e:
        raise InvalidStateError(str(e)) from e
    # python-jose 3.3 doesn't reject tokens missing the audience claim — check explicitly.
    if payload.get("aud") != _STATE_AUDIENCE:
        raise InvalidStateError("audience mismatch")
    if "company_id" not in payload or "user_id" not in payload:
        raise InvalidStateError("missing required claims")
    try:
        return StatePayload(
            company_id=uuid.UUID(payload["company_id"]),
            user_id=uuid.UUID(payload["user_id"]),
        )
    except (ValueError, TypeError) as e:
        raise InvalidStateError(f"invalid claim format: {e}") from e


def build_authorize_url(state: str) -> str:
    params = {
        "client_id": settings.intuit_client_id,
        "redirect_uri": settings.intuit_redirect_uri,
        "response_type": "code",
        "scope": "com.intuit.quickbooks.accounting",
        "state": state,
    }
    return f"{settings.intuit_authorize_base}?{urlencode(params)}"


def _token_endpoint() -> str:
    return f"{settings.intuit_oauth_base}/oauth2/v1/tokens/bearer"


def exchange_code_for_tokens(code: str) -> TokenResponse:
    response = httpx.post(
        _token_endpoint(),
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.intuit_redirect_uri,
        },
        auth=(settings.intuit_client_id, settings.intuit_client_secret),
        headers={"Accept": "application/json"},
        timeout=15.0,
    )
    if response.status_code != 200:
        raise TokenExchangeError(
            f"Intuit token exchange failed: {response.status_code} {response.text}"
        )
    return TokenResponse(**response.json())


def refresh_tokens(refresh_token: str) -> TokenResponse:
    response = httpx.post(
        _token_endpoint(),
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        auth=(settings.intuit_client_id, settings.intuit_client_secret),
        headers={"Accept": "application/json"},
        timeout=15.0,
    )
    if response.status_code != 200:
        raise TokenExchangeError(
            f"Intuit refresh failed: {response.status_code} {response.text}"
        )
    return TokenResponse(**response.json())


def revoke_token(token: str) -> None:
    """Best-effort revoke; treat 401 as already-revoked."""
    response = httpx.post(
        f"{settings.intuit_oauth_base}/oauth2/v1/tokens/revoke",
        json={"token": token},
        auth=(settings.intuit_client_id, settings.intuit_client_secret),
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        timeout=15.0,
    )
    if response.status_code not in (200, 401):
        raise TokenExchangeError(
            f"Intuit revoke failed: {response.status_code} {response.text}"
        )
