import re
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.future import select

from backend.app.auth.security import get_password_hash
from backend.app.database import AsyncSessionLocal
from backend.app.models.entities import Mission, MissionStatusEnum, User
from backend.app.services.email_service import outbound_log


@pytest.mark.asyncio
async def test_password_reset_round_trip(client: AsyncClient):
    outbound_log.clear()
    forgot = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "alex@abcrestaurant.com"},
    )
    assert forgot.status_code == 200
    assert "if an account exists" in forgot.json()["message"].lower()
    assert "token" not in forgot.json()

    unknown = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nobody@example.com"},
    )
    assert unknown.status_code == 200
    assert unknown.json()["message"] == forgot.json()["message"]

    body = outbound_log[-1]["body"]
    match = re.search(r"reset_token=([A-Za-z0-9_\-]+)", body)
    assert match, "reset email should contain a token"
    token = match.group(1)

    reset = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "replacement123"},
    )
    assert reset.status_code == 200

    reused = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "anotherpass123"},
    )
    assert reused.status_code == 400

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "alex@abcrestaurant.com", "password": "replacement123"},
    )
    assert login.status_code == 200

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == "alex@abcrestaurant.com"))).scalars().first()
        user.hashed_password = get_password_hash("password123")
        await db.commit()


@pytest.mark.asyncio
async def test_expired_handover_otp_is_rejected(client: AsyncClient, volunteer_token: str):
    headers = {"Authorization": f"Bearer {volunteer_token}"}
    async with AsyncSessionLocal() as db:
        mission = (await db.execute(select(Mission).where(Mission.code == "RL-00124"))).scalars().first()
        original = (mission.status, mission.otp_expires_at, mission.otp_failed_attempts or 0, mission.otp_code)
        mission.status = MissionStatusEnum.HANDOVER_PENDING.value
        mission.otp_expires_at = datetime.utcnow() - timedelta(minutes=1)
        mission.otp_failed_attempts = 0
        await db.commit()

    try:
        resp = await client.post(
            "/api/v1/volunteer/tasks/RL-00124/verify-otp",
            json={"otp_code": original[3], "verified_qty": 1, "receiver_name": "Expiry Check"},
            headers=headers,
        )
        assert resp.status_code == 400
        assert "expired" in resp.json()["detail"].lower()
    finally:
        async with AsyncSessionLocal() as db:
            mission = (await db.execute(select(Mission).where(Mission.code == "RL-00124"))).scalars().first()
            mission.status, mission.otp_expires_at, mission.otp_failed_attempts = original[0], original[1], original[2]
            await db.commit()
