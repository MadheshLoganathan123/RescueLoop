import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_donor_dashboard_stats(client: AsyncClient, donor_token: str):
    headers = {"Authorization": f"Bearer {donor_token}"}
    resp = await client.get("/api/v1/donor/dashboard-stats", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_donations" in data
    assert "meals_redistributed" in data
    assert "active_donations" in data

@pytest.mark.asyncio
async def test_create_donation_and_auto_allocate(client: AsyncClient, donor_token: str):
    headers = {"Authorization": f"Bearer {donor_token}"}
    payload = {
        "title": "Fresh Paneer Curry and Basmati Rice",
        "food_category": "Prepared Cooked Meals",
        "quantity_meals": 100,
        "packaging_type": "Individually sealed trays",
        "storage_temp": "Refrigerated (3.5°C)",
        "allergens": "Contains dairy",
        "handling_notes": "Sanitary kitchen packaging",
        "pickup_address": "24, 2nd Avenue, Anna Nagar",
        "on_site_contact": "Alex Rivera",
        "contact_phone": "+91 98765 43210"
    }
    resp = await client.post("/api/v1/donor/donations", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"].startswith("RL-")
    assert data["quantity_meals"] == 100
    assert data["status"] == "ALLOCATED"
    assert data["allocations_count"] > 0

@pytest.mark.asyncio
async def test_get_donation_details(client: AsyncClient, donor_token: str):
    headers = {"Authorization": f"Bearer {donor_token}"}
    resp = await client.get("/api/v1/donor/donations/RL-00124", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "RL-00124"
    assert "allocations" in data
    assert "courier" in data

@pytest.mark.asyncio
async def test_ai_intake_copilot(client: AsyncClient):
    payload = {
        "prompt": "We have 75 portions of hot vegetable biryani prepared at 12:30 PM. Stored in hot boxes."
    }
    resp = await client.post("/api/v1/ai/intake-extract", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["quantity_meals"] == 75
    assert "food_category" in data
    assert "storage_temp" in data
