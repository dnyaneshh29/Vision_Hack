import pytest
from httpx import AsyncClient
import uuid

pytestmark = pytest.mark.asyncio


async def test_create_session(auth_client: AsyncClient):
    resp = await auth_client.post("/api/v1/sessions", json={
        "title": "Deep Work Block",
        "intent": "Finish the API layer",
        "color": "#7c5cfc",
        "tags": ["backend", "focus"],
    })
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["title"] == "Deep Work Block"
    assert data["status"] == "active"
    assert data["focus_time_secs"] == 0


async def test_get_sessions_for_user(auth_client: AsyncClient):
    await auth_client.post("/api/v1/sessions", json={"title": "Session A", "intent": "Do A"})
    resp = await auth_client.get("/api/v1/sessions")
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 1


async def test_pause_session(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/v1/sessions", json={"title": "Pause Test", "intent": "Test pause"})
    session_id = create_resp.json()["data"]["id"]
    resp = await auth_client.post(f"/api/v1/sessions/{session_id}/pause", json={"focus_time_secs": 120})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "paused"
    assert data["focus_time_secs"] == 120


async def test_resume_session_returns_full_context(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/v1/sessions", json={"title": "Resume Test", "intent": "Test resume"})
    session_id = create_resp.json()["data"]["id"]
    await auth_client.post(f"/api/v1/sessions/{session_id}/pause", json={"focus_time_secs": 60})
    resp = await auth_client.post(f"/api/v1/sessions/{session_id}/resume")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "active"
    assert data["resumed_at"] is not None
    # Focus time preserved from pause
    assert data["focus_time_secs"] == 60


async def test_complete_session_calculates_momentum(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/v1/sessions", json={"title": "Complete Test", "intent": "Test complete"})
    session_id = create_resp.json()["data"]["id"]
    resp = await auth_client.post(
        f"/api/v1/sessions/{session_id}/complete",
        json={"outcome": "Completed successfully", "focus_time_secs": 3600}
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "completed"
    assert data["momentum_score"] > 0
    assert data["focus_time_secs"] == 3600


async def test_heartbeat_updates_focus_time(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/v1/sessions", json={"title": "Heartbeat Test", "intent": "Test"})
    session_id = create_resp.json()["data"]["id"]

    # Send heartbeat
    hb = await auth_client.post(f"/api/v1/sessions/{session_id}/heartbeat", json={"focus_time_secs": 90})
    assert hb.status_code == 200
    assert hb.json()["data"]["focus_time_secs"] == 90

    # Verify persisted
    get_resp = await auth_client.get(f"/api/v1/sessions/{session_id}")
    assert get_resp.json()["data"]["focus_time_secs"] == 90


async def test_cannot_access_other_users_session(client: AsyncClient):
    uid1 = str(uuid.uuid4())[:8]
    uid2 = str(uuid.uuid4())[:8]

    await client.post("/api/v1/auth/register", json={
        "email": f"user1_{uid1}@example.com", "username": f"user1_{uid1}", "password": "password123"
    })
    await client.post("/api/v1/auth/register", json={
        "email": f"user2_{uid2}@example.com", "username": f"user2_{uid2}", "password": "password123"
    })

    login1 = await client.post("/api/v1/auth/login", json={"email": f"user1_{uid1}@example.com", "password": "password123"})
    token1 = login1.json()["data"]["access_token"]

    login2 = await client.post("/api/v1/auth/login", json={"email": f"user2_{uid2}@example.com", "password": "password123"})
    token2 = login2.json()["data"]["access_token"]

    create_resp = await client.post(
        "/api/v1/sessions",
        json={"title": "Private Session", "intent": "Private"},
        headers={"Authorization": f"Bearer {token1}"}
    )
    session_id = create_resp.json()["data"]["id"]

    resp = await client.get(f"/api/v1/sessions/{session_id}", headers={"Authorization": f"Bearer {token2}"})
    assert resp.status_code == 404
