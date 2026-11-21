import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "online"

@pytest.mark.asyncio
async def test_login_valid_credentials(client: AsyncClient):
    payload = {
        "email": "alex@abcrestaurant.com",
        "password": "password123"
    }
    resp = await client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "donor"
    assert data["full_name"] == "Alex Rivera"

@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    payload = {
        "email": "alex@abcrestaurant.com",
        "password": "wrongpassword"
    }
    resp = await client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 401

@pytest.mark.asyncio
async def test_demo_login_all_four_roles(client: AsyncClient):
    for role in ["donor", "ngo", "volunteer", "ops"]:
        resp = await client.post(f"/api/v1/auth/demo-login/{role}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == role
        assert "access_token" in data

@pytest.mark.asyncio
async def test_get_current_user_profile(client: AsyncClient, donor_token: str):
    headers = {"Authorization": f"Bearer {donor_token}"}
    resp = await client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "alex@abcrestaurant.com"
    assert data["role"] == "donor"
