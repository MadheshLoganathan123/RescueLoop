import pytest
from httpx import AsyncClient
from sqlalchemy.future import select

from backend.app.database import AsyncSessionLocal
from backend.app.models.entities import Mission, DonationAllocation

@pytest.mark.asyncio
async def test_volunteer_dashboard_stats(client: AsyncClient, volunteer_token: str):
    headers = {"Authorization": f"Bearer {volunteer_token}"}
    resp = await client.get("/api/v1/volunteer/dashboard-stats", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "tasks_completed" in data
    assert "meals_delivered" in data
    assert "is_available" in data

@pytest.mark.asyncio
async def test_volunteer_toggle_availability(client: AsyncClient, volunteer_token: str):
    headers = {"Authorization": f"Bearer {volunteer_token}"}
    resp = await client.put("/api/v1/volunteer/availability", json={"is_available": False}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_available"] is False

    # Toggle back to True
    resp2 = await client.put("/api/v1/volunteer/availability", json={"is_available": True}, headers=headers)
    assert resp2.status_code == 200
    assert resp2.json()["is_available"] is True

@pytest.mark.asyncio
async def test_volunteer_task_step_progression(client: AsyncClient, volunteer_token: str):
    headers = {"Authorization": f"Bearer {volunteer_token}"}
    # Update step 3
    resp = await client.post(
        "/api/v1/volunteer/tasks/RL-00124/step",
        json={"step": 3, "inspections_passed": True, "temp_checked": 3.8},
        headers=headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["step"] == 3
    assert data["status"] == "IN_TRANSIT"

@pytest.mark.asyncio
async def test_volunteer_verify_handover_otp(client: AsyncClient, volunteer_token: str):
    headers = {"Authorization": f"Bearer {volunteer_token}"}
    async with AsyncSessionLocal() as db:
        mission = (await db.execute(select(Mission).where(Mission.code == "RL-00124"))).scalars().first()
        allocations = (await db.execute(
            select(DonationAllocation).where(
                DonationAllocation.donation_id == mission.donation_id,
                DonationAllocation.status.in_(["ACCEPTED", "DELIVERED"]),
            )
        )).scalars().all()

    if not allocations:
        async with AsyncSessionLocal() as db:
            allocations = (await db.execute(
                select(DonationAllocation).where(DonationAllocation.donation_id == mission.donation_id)
            )).scalars().all()

    for allocation in allocations:
        qty = allocation.accepted_meals or allocation.allocated_meals
        resp = await client.post(
            "/api/v1/volunteer/tasks/RL-00124/verify-otp",
            json={"otp_code": mission.otp_code, "verified_qty": qty, "receiver_name": "Sarah Kumar"},
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        if allocation is allocations[-1]:
            assert data["mission_status"] == "COMPLETED"
