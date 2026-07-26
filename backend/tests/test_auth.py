def test_register_success(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "new@example.com",
            "password": "SecurePassword123",
            "full_name": "New User",
            "organization_name": "New Org",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_email(client, registered_user):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "AnotherPassword123",
            "full_name": "Another User",
            "organization_name": "Another Org",
        },
    )
    assert response.status_code == 409


def test_login_success(client, registered_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPassword123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_login_wrong_password(client, registered_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "WrongPassword123",
        },
    )
    assert response.status_code == 401


def test_login_nonexistent_user(client):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "Password123",
        },
    )
    assert response.status_code == 401


def test_refresh_token(client, registered_user):
    response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": registered_user["refresh_token"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_refresh_with_access_token_fails(client, registered_user):
    # Clear cookies to ensure we test the body parameter, not the cookie
    client.cookies.clear()
    response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": registered_user["access_token"]},
    )
    assert response.status_code == 401


def test_me_authenticated(client, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["full_name"] == "Test User"
    assert len(data["organizations"]) == 1
    assert data["organizations"][0]["name"] == "Test Org"
    assert data["organizations"][0]["role"] == "admin"


def test_me_unauthenticated(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.headers.get("www-authenticate") == "Bearer"


def test_missing_credentials_are_401_even_when_fastapi_raises_403(client, monkeypatch):
    """FastAPI <0.130 raises 403 for a missing bearer token; we must still return 401.

    Guards against the status code silently tracking the installed FastAPI
    version (the pinned 0.115.0 raises 403, newer releases raise 401).
    """
    from fastapi import HTTPException
    from fastapi.security import HTTPBearer

    async def raise_403(self, request):
        raise HTTPException(status_code=403, detail="Not authenticated")

    monkeypatch.setattr(HTTPBearer, "__call__", raise_403)

    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_me_invalid_token(client):
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalidtoken"},
    )
    assert response.status_code == 401
