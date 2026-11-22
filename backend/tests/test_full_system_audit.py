"""
RescueLoop Full-System Integrity Audit & End-to-End Verification Test Suite
Executes database consistency, security/RBAC boundaries, multi-role lifecycle, and edge case recovery.
"""

import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.future import select
from sqlalchemy import func

from backend.app.database import AsyncSessionLocal
from backend.app.models.entities import (
    User, DonorProfile, NgoProfile, VolunteerProfile, Donation,
    DonationAllocation, Mission, MissionAssignment, MissionEvent,
    ExceptionRecord, Handover, AuditLog, RoleEnum,
    DonationStatusEnum, AllocationStatusEnum, MissionStatusEnum
)

# ==================== 1. DATABASE RELATIONAL INTEGRITY ====================

@pytest.mark.asyncio
async def test_db_relational_integrity_audit():
    """Verify primary keys, profile links, and relational foreign keys."""
    async with AsyncSessionLocal() as db:
        # Check all users have valid profiles according to their roles
        users = (await db.execute(select(User))).scalars().all()
        assert len(users) >= 6, "Expected at least 6 core seed users"

        for u in users:
            assert u.id is not None
            assert u.role in [r.value for r in RoleEnum]

            if u.role == RoleEnum.DONOR.value:
                prof = (await db.execute(select(DonorProfile).where(DonorProfile.user_id == u.id))).scalars().first()
                assert prof is not None, f"Donor {u.email} missing DonorProfile"
            elif u.role == RoleEnum.NGO.value:
                prof = (await db.execute(select(NgoProfile).where(NgoProfile.user_id == u.id))).scalars().first()
                assert prof is not None, f"NGO {u.email} missing NgoProfile"
            elif u.role == RoleEnum.VOLUNTEER.value:
                prof = (await db.execute(select(VolunteerProfile).where(VolunteerProfile.user_id == u.id))).scalars().first()
                assert prof is not None, f"Volunteer {u.email} missing VolunteerProfile"

        # Check all allocations reference valid donations and NGOs
        allocations = (await db.execute(select(DonationAllocation))).scalars().all()
        for alloc in allocations:
            d = (await db.execute(select(Donation).where(Donation.id == alloc.donation_id))).scalars().first()
            assert d is not None, f"Allocation {alloc.id} references non-existent donation {alloc.donation_id}"
            ngo = (await db.execute(select(NgoProfile).where(NgoProfile.id == alloc.ngo_id))).scalars().first()
            assert ngo is not None, f"Allocation {alloc.id} references non-existent NGO {alloc.ngo_id}"

        # Check all missions reference valid donations
        missions = (await db.execute(select(Mission))).scalars().all()
        for m in missions:
            d = (await db.execute(select(Donation).where(Donation.id == m.donation_id))).scalars().first()
            assert d is not None, f"Mission {m.code} references non-existent donation {m.donation_id}"

        # Check shelter capacity bounds (0 <= current_free_capacity <= daily_capacity_meals)
        ngos = (await db.execute(select(NgoProfile))).scalars().all()
        for n in ngos:
            assert 0 <= n.current_free_capacity <= n.daily_capacity_meals, (
                f"NGO {n.organization_name} capacity out of bounds: "
                f"free={n.current_free_capacity}, daily={n.daily_capacity_meals}"
            )


# ==================== 2. SECURITY & RBAC ISOLATION AUDIT ====================

@pytest.mark.asyncio
async def test_rbac_boundary_enforcement(client: AsyncClient, donor_token: str, volunteer_token: str, ngo_token: str):
    """Enforce strict role-based access isolation across API boundaries."""
    # 1. Unauthenticated requests are rejected
    resp_unauth = await client.get("/api/v1/donor/dashboard-stats")
    assert resp_unauth.status_code == 401

    # 2. Tampered / invalid token is rejected
    resp_bad_jwt = await client.get(
        "/api/v1/donor/dashboard-stats",
        headers={"Authorization": "Bearer invalid.token.payload"}
    )
    assert resp_bad_jwt.status_code == 401

    # 3. Volunteer cannot access Donor endpoints
    resp_vol_donor = await client.post(
        "/api/v1/donor/donations",
        json={"title": "Hacked meal batch", "quantity_meals": 50, "food_category": "Cooked"},
        headers={"Authorization": f"Bearer {volunteer_token}"}
    )
    assert resp_vol_donor.status_code == 403, "Volunteer must NOT be permitted to create donations"

    # 4. Donor cannot access Operations Admin endpoints
    resp_donor_ops = await client.get(
        "/api/v1/ops/network-stats",
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    assert resp_donor_ops.status_code == 403, "Donor must NOT be permitted to access Ops Network Stats"

    # 5. NGO cannot access Volunteer courier tasks
    resp_ngo_vol = await client.put(
        "/api/v1/volunteer/availability",
        json={"is_available": False},
        headers={"Authorization": f"Bearer {ngo_token}"}
    )
    assert resp_ngo_vol.status_code == 403, "NGO must NOT be permitted to toggle courier availability"


# ==================== 3. END-TO-END DONATION RESCUE LIFECYCLE ====================

@pytest.mark.asyncio
async def test_e2e_full_donation_lifecycle(client: AsyncClient):
    """
    Test complete multi-role flow from surplus creation to delivery verification:
    Donor Post -> AI Allocation -> NGO Accept -> Volunteer Step progression -> OTP Handover -> Audit.
    """
    # 1. Login as Donor
    donor_auth = await client.post("/api/v1/auth/demo-login/donor")
    assert donor_auth.status_code == 200
    donor_token = donor_auth.json()["access_token"]
    donor_headers = {"Authorization": f"Bearer {donor_token}"}

    # 2. Donor posts a new donation batch
    donation_payload = {
        "title": "120 Nutritious Vegetable Biryani Boxes",
        "food_category": "Prepared Cooked Meals",
        "quantity_meals": 120,
        "packaging_type": "Individually sealed trays",
        "storage_temp": "Refrigerated (3.8°C)",
        "allergens": "Vegetarian, contains nuts",
        "handling_notes": "Maintained in clean cold storage. Tamper seals verified.",
        "pickup_address": "24, 2nd Avenue, Anna Nagar, Chennai",
        "on_site_contact": "Chef Alex Rivera",
        "contact_phone": "+91 98765 43210"
    }
    create_resp = await client.post("/api/v1/donor/donations", json=donation_payload, headers=donor_headers)
    assert create_resp.status_code == 200
    donation_data = create_resp.json()
    donation_code = donation_data["code"]
    assert donation_code.startswith("RL-")
    assert donation_data["quantity_meals"] == 120
    assert donation_data["status"] == "ALLOCATED"
    assert donation_data["allocations_count"] > 0

    # 3. NGO logs in and checks incoming offers
    ngo_auth = await client.post("/api/v1/auth/demo-login/ngo")
    assert ngo_auth.status_code == 200
    ngo_token = ngo_auth.json()["access_token"]
    ngo_headers = {"Authorization": f"Bearer {ngo_token}"}

    offers_resp = await client.get("/api/v1/ngo/offers", headers=ngo_headers)
    assert offers_resp.status_code == 200
    offers = offers_resp.json()
    assert len(offers) > 0

    # Locate the allocation offer for our new donation
    matched_offer = next((o for o in offers if o["code"] == donation_code), offers[0])
    offer_id = matched_offer["id"]
    accept_qty = matched_offer.get("allocated_meals", 40)

    # 4. NGO accepts the offer
    accept_resp = await client.post(
        f"/api/v1/ngo/offers/{offer_id}/respond?action=accept",
        json={"accepted_meals": accept_qty, "delivery_window": "04:30 PM", "notes": "Staff ready at loading dock."},
        headers=ngo_headers
    )
    assert accept_resp.status_code == 200
    assert accept_resp.json()["status"] == "ACCEPTED"

    # 5. Volunteer courier logs in and checks tasks
    vol_auth = await client.post("/api/v1/auth/demo-login/volunteer")
    assert vol_auth.status_code == 200
    vol_token = vol_auth.json()["access_token"]
    vol_headers = {"Authorization": f"Bearer {vol_token}"}

    # Verify task details
    task_resp = await client.get(f"/api/v1/volunteer/tasks/{donation_code}", headers=vol_headers)
    assert task_resp.status_code == 200
    task_data = task_resp.json()
    assert task_data["code"] == donation_code

    # 6. Volunteer progresses through mission milestones
    # Step 2: Courier arrived at donor kitchen
    step2_resp = await client.post(
        f"/api/v1/volunteer/tasks/{task_data['id']}/step",
        json={"step": 2},
        headers=vol_headers
    )
    assert step2_resp.status_code == 200
    assert step2_resp.json()["status"] == MissionStatusEnum.PICKUP_UNDERWAY.value

    # Step 3: Food inspected and in transit
    step3_resp = await client.post(
        f"/api/v1/volunteer/tasks/{task_data['id']}/step",
        json={"step": 3},
        headers=vol_headers
    )
    assert step3_resp.status_code == 200
    assert step3_resp.json()["status"] == MissionStatusEnum.IN_TRANSIT.value

    # Step 4: Arrived at recipient shelter
    step4_resp = await client.post(
        f"/api/v1/volunteer/tasks/{task_data['id']}/step",
        json={"step": 4},
        headers=vol_headers
    )
    assert step4_resp.status_code == 200
    assert step4_resp.json()["status"] == MissionStatusEnum.HANDOVER_PENDING.value

    # 7. Recipient verifies OTP code and handover completes
    async with AsyncSessionLocal() as db:
        mission = (await db.execute(select(Mission).where(Mission.code == donation_code))).scalars().first()
        mission_otp = mission.otp_code if mission else "5821"

    otp_resp = await client.post(
        f"/api/v1/volunteer/tasks/{task_data['id']}/verify-otp",
        json={
            "verified_qty": accept_qty,
            "temp_at_drop": 3.6,
            "otp_code": mission_otp,
            "receiver_name": "Sarah Kumar",
            "notes": "Verified fresh and cold-chain intact"
        },
        headers=vol_headers
    )
    assert otp_resp.status_code == 200
    assert otp_resp.json()["status"] == MissionStatusEnum.COMPLETED.value

    # 8. Operations Console verifies mission status and audit trail
    ops_auth = await client.post("/api/v1/auth/demo-login/ops")
    assert ops_auth.status_code == 200
    ops_token = ops_auth.json()["access_token"]
    ops_headers = {"Authorization": f"Bearer {ops_token}"}

    audit_resp = await client.get("/api/v1/ops/audit-trail?limit=10", headers=ops_headers)
    assert audit_resp.status_code == 200
    audit_logs = audit_resp.json()
    assert len(audit_logs) > 0

    actions_logged = [log["action"] for log in audit_logs]
    assert "CREATE_DONATION" in actions_logged or "VERIFY_HANDOVER_OTP" in actions_logged


# ==================== 4. EDGE CASE & FAILURE RECOVERY AUDIT ====================

@pytest.mark.asyncio
async def test_invalid_otp_rejection(client: AsyncClient, volunteer_token: str):
    """Ensure invalid OTP codes are rejected with 400 Bad Request."""
    headers = {"Authorization": f"Bearer {volunteer_token}"}
    resp = await client.post(
        "/api/v1/volunteer/tasks/RL-00124/verify-otp",
        json={
            "verified_qty": 60,
            "temp_at_drop": 4.0,
            "otp_code": "0000",  # Deliberately invalid code
            "receiver_name": "Unknown"
        },
        headers=headers
    )
    assert resp.status_code == 400
    assert "Invalid handover OTP" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_ngo_decline_restores_capacity(client: AsyncClient, ngo_token: str):
    """Ensure declining an offer releases reserved capacity back to the shelter."""
    headers = {"Authorization": f"Bearer {ngo_token}"}

    # Fetch initial capacity
    cap_before_resp = await client.get("/api/v1/ngo/capacity", headers=headers)
    free_before = cap_before_resp.json()["free_capacity"]

    # Get offers
    offers_resp = await client.get("/api/v1/ngo/offers", headers=headers)
    offers = offers_resp.json()
    assert len(offers) > 0
    offer_id = offers[0]["id"]

    # Decline offer
    decline_resp = await client.post(
        f"/api/v1/ngo/offers/{offer_id}/respond?action=decline",
        headers=headers
    )
    assert decline_resp.status_code == 200
    assert decline_resp.json()["status"] == "DECLINED"

    # Capacity should not be deducted and reserved capacity is restored
    cap_after_resp = await client.get("/api/v1/ngo/capacity", headers=headers)
    free_after = cap_after_resp.json()["free_capacity"]
    assert free_after >= free_before


@pytest.mark.asyncio
async def test_cors_headers_audit(client: AsyncClient):
    """Verify CORS preflight and access control headers for frontend integration."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Authorization,Content-Type"
    }
    resp = await client.options("/api/v1/auth/login", headers=headers)
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") in ["*", "http://localhost:3000"]
