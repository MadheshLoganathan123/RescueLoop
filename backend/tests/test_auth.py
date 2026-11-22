import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ["online", "healthy"]

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
    assert "user" in data
    assert data["user"]["email"] == "alex@abcrestaurant.com"

@pytest.mark.asyncio
async def test_login_form_data(client: AsyncClient):
    form_data = {
        "username": "alex@abcrestaurant.com",
        "password": "password123"
    }
    resp = await client.post("/api/v1/auth/login", data=form_data)
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "donor"

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
        assert "user" in data

@pytest.mark.asyncio
async def test_account_creation_and_login(client: AsyncClient):
    unique_suffix = str(uuid.uuid4())[:8]
    new_email = f"chef_{unique_suffix}@newbistro.org"
    reg_payload = {
        "email": new_email,
        "password": "securepass123",
        "full_name": f"Chef Mario {unique_suffix}",
        "role": "donor",
        "phone": "+91 91234 56789",
        "organization_name": f"Bistro {unique_suffix}",
        "address": "Kilpauk, Chennai"
    }
    # 1. Register account
    reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert reg_data["email"] == new_email
    assert reg_data["role"] == "donor"
    assert "access_token" in reg_data

    # 2. Login with newly created account
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": new_email,
        "password": "securepass123"
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["role"] == "donor"
    assert login_data["user"]["organization_name"] == f"Bistro {unique_suffix}"

    # 3. Duplicate registration rejection
    dup_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_resp.status_code == 400
    assert "already registered" in dup_resp.json()["detail"].lower()

@pytest.mark.asyncio
async def test_get_current_user_profile(client: AsyncClient, donor_token: str):
    headers = {"Authorization": f"Bearer {donor_token}"}
    resp = await client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "alex@abcrestaurant.com"
    assert data["role"] == "donor"
