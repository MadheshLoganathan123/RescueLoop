import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_ngo_dashboard_stats(client: AsyncClient, ngo_token: str):
    headers = {"Authorization": f"Bearer {ngo_token}"}
    resp = await client.get("/api/v1/ngo/dashboard-stats", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "incoming_offers" in data
    assert "available_capacity" in data

@pytest.mark.asyncio
async def test_ngo_get_offers_queue(client: AsyncClient, ngo_token: str):
    headers = {"Authorization": f"Bearer {ngo_token}"}
    resp = await client.get("/api/v1/ngo/offers", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0

@pytest.mark.asyncio
async def test_ngo_accept_offer(client: AsyncClient, ngo_token: str):
    headers = {"Authorization": f"Bearer {ngo_token}"}
    # Get first offer
    offers_resp = await client.get("/api/v1/ngo/offers", headers=headers)
    offers = offers_resp.json()
    assert len(offers) > 0
    offer = next(
        (item for item in offers if item["status"] in ("New offer", "Awaiting response")),
        None,
    )
    if offer is None:
        pytest.skip("No pending offer exists in the seed dataset")
    offer_id = offer["id"]
    accept_qty = offer.get("allocated_meals", 40)

    resp = await client.post(
        f"/api/v1/ngo/offers/{offer_id}/respond?action=accept",
        json={"accepted_meals": accept_qty, "delivery_window": "04:15 PM"},
        headers=headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ACCEPTED"

@pytest.mark.asyncio
async def test_ngo_update_capacity_preferences(client: AsyncClient, ngo_token: str):
    headers = {"Authorization": f"Bearer {ngo_token}"}
    payload = {
        "daily_capacity_meals": 200,
        "operating_hours_end": "07:00 PM"
    }
    resp = await client.put("/api/v1/ngo/preferences", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["daily_capacity_meals"] == 200
