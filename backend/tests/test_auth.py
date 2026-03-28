import pytest
from httpx import AsyncClient
import uuid

pytestmark = pytest.mark.asyncio


async def test_register_success(client: AsyncClient):
    uid = str(uuid.uuid4())[:8]
    resp = await client.post("/api/v1/auth/register", json={
        "email": f"new_{uid}@example.com",
        "username": f"newuser_{uid}",
        "password": "securepass123",
    })
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert "access_token" in data
    assert data["user"]["email"] == f"new_{uid}@example.com"


async def test_register_duplicate_email(client: AsyncClient):
    uid = str(uuid.uuid4())[:8]
    payload = {"email": f"dup_{uid}@example.com", "username": f"dup1_{uid}", "password": "password123"}
    r1 = await client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = await client.post("/api/v1/auth/register", json={**payload, "username": f"dup2_{uid}"})
    assert r2.status_code == 409


async def test_login_valid_credentials(client: AsyncClient):
    uid = str(uuid.uuid4())[:8]
    email = f"login_{uid}@example.com"
    await client.post("/api/v1/auth/register", json={
        "email": email, "username": f"loginuser_{uid}", "password": "password123"
    })
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()["data"]


async def test_login_wrong_password(client: AsyncClient):
    uid = str(uuid.uuid4())[:8]
    email = f"wrong_{uid}@example.com"
    await client.post("/api/v1/auth/register", json={
        "email": email, "username": f"wronguser_{uid}", "password": "password123"
    })
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": "wrongpassword"})
    assert resp.status_code == 401


async def test_refresh_token(client: AsyncClient):
    uid = str(uuid.uuid4())[:8]
    email = f"refresh_{uid}@example.com"
    await client.post("/api/v1/auth/register", json={
        "email": email, "username": f"refreshuser_{uid}", "password": "password123"
    })
    login_resp = await client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    refresh_token = login_resp.json()["data"]["refresh_token"]
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()["data"]


async def test_protected_route_no_token(client: AsyncClient):
    # No Authorization header → 401 Unauthorized (HTTPBearer behavior varies by version)
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code in (401, 403)  # Both are valid "not authenticated" responses


async def test_protected_route_expired_token(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert resp.status_code == 401
