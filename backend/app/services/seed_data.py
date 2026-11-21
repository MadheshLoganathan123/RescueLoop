import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.models.entities import (
    User, DonorProfile, NgoProfile, VolunteerProfile, Donation,
    DonationAllocation, Mission, MissionAssignment, MissionEvent,
    AgentRun, ExceptionRecord, Handover, RoleEnum, DonationStatusEnum,
    AllocationStatusEnum, MissionStatusEnum, AssignmentStatusEnum
)
from backend.app.auth.security import get_password_hash

logger = logging.getLogger("rescueloop.seed")

async def init_seed_data(db: AsyncSession):
    """
    Seeds only the minimal required dataset:
    - 1 Donor (Alex Rivera, ABC Restaurant Group)
    - 2 NGOs (Sarah Kumar, Hope Community Foundation; Anna Nagar Care Centre)
    - 2 Volunteers (Jordan Mathew; Priya S.)
    - 1 Operations Admin (K. Mathew, RescueLoop Command Central)
    - 3 sample donations (RL-00124 in transit, RL-00128 courier assigned, RL-00119 delivered)
    """
    # Check if already seeded
    existing = await db.execute(select(User).limit(1))
    if existing.scalars().first():
        logger.info("Database already seeded with core accounts. Skipping seed.")
        return

    logger.info("Initializing minimal seed dataset...")
    default_pwd = get_password_hash("password123")

    # 1. Donor User
    donor_user = User(
        email="alex@abcrestaurant.com",
        hashed_password=default_pwd,
        full_name="Alex Rivera",
        role=RoleEnum.DONOR.value,
        phone="+91 98765 43210"
    )
    db.add(donor_user)
    await db.flush()

    donor_prof = DonorProfile(
        user_id=donor_user.id,
        organization_name="ABC Restaurant Group",
        kitchen_type="Commercial Kitchen",
        address="24, 2nd Avenue, Anna Nagar, Chennai",
        latitude=13.0850,
        longitude=80.2101,
        contact_person="Alex Rivera",
        contact_phone="+91 98765 43210",
        fssai_license="FSSAI-112233445566"
    )
    db.add(donor_prof)
    await db.flush()

    # 2. NGO 1: Hope Community Kitchen (Sarah Kumar)
    ngo1_user = User(
        email="sarah@hopefoundation.org",
        hashed_password=default_pwd,
        full_name="Sarah Kumar",
        role=RoleEnum.NGO.value,
        phone="+91 98402 44550"
    )
    db.add(ngo1_user)
    await db.flush()

    ngo1_prof = NgoProfile(
        user_id=ngo1_user.id,
        organization_name="Hope Community Kitchen",
        address="18, 5th Street, Anna Nagar, Chennai",
        latitude=13.0835,
        longitude=80.2140,
        contact_person="Sarah Kumar",
        contact_phone="+91 98402 44550",
        daily_capacity_meals=250,
        current_free_capacity=160,
        has_refrigerated=True,
        has_ambient=True
    )
    db.add(ngo1_prof)

    # 3. NGO 2: Anna Nagar Care Centre
    ngo2_user = User(
        email="care@annagarcenter.org",
        hashed_password=default_pwd,
        full_name="Dr. Ramanathan",
        role=RoleEnum.NGO.value,
        phone="+91 98409 11223"
    )
    db.add(ngo2_user)
    await db.flush()

    ngo2_prof = NgoProfile(
        user_id=ngo2_user.id,
        organization_name="Anna Nagar Care Centre",
        address="12, 11th Main Road, Anna Nagar, Chennai",
        latitude=13.0890,
        longitude=80.2080,
        contact_person="Dr. Ramanathan",
        contact_phone="+91 98409 11223",
        daily_capacity_meals=180,
        current_free_capacity=120,
        has_refrigerated=True,
        has_ambient=True
    )
    db.add(ngo2_prof)

    # 4. Volunteer 1: Jordan Mathew
    vol1_user = User(
        email="jordan@rescuecouriers.org",
        hashed_password=default_pwd,
        full_name="Jordan Mathew",
        role=RoleEnum.VOLUNTEER.value,
        phone="+91 98401 22334"
    )
    db.add(vol1_user)
    await db.flush()

    vol1_prof = VolunteerProfile(
        user_id=vol1_user.id,
        vehicle_type="Two-wheeler (Hero Electric)",
        vehicle_plate="TN-02-AL-4491",
        max_meal_capacity=40,
        is_available=True,
        current_lat=13.0860,
        current_lng=80.2115,
        rating=4.98,
        completed_missions=27,
        meals_delivered=1120
    )
    db.add(vol1_prof)

    # 5. Volunteer 2: Priya S.
    vol2_user = User(
        email="priya@rescuecouriers.org",
        hashed_password=default_pwd,
        full_name="Priya S.",
        role=RoleEnum.VOLUNTEER.value,
        phone="+91 98403 77889"
    )
    db.add(vol2_user)
    await db.flush()

    vol2_prof = VolunteerProfile(
        user_id=vol2_user.id,
        vehicle_type="Van (Refrigerated Mini)",
        vehicle_plate="TN-02-BV-8802",
        max_meal_capacity=150,
        is_available=True,
        current_lat=13.0880,
        current_lng=80.2090,
        rating=4.95,
        completed_missions=34,
        meals_delivered=1940
    )
    db.add(vol2_prof)

    # 6. Operations Admin: K. Mathew
    ops_user = User(
        email="admin@rescueloop.org",
        hashed_password=default_pwd,
        full_name="K. Mathew",
        role=RoleEnum.OPS_ADMIN.value,
        phone="+91 98400 00001"
    )
    db.add(ops_user)
    await db.flush()

    # 7. Sample Donations
    now = datetime.utcnow()

    # Donation 1: RL-00124 (In Transit)
    d1 = Donation(
        code="RL-00124",
        donor_id=donor_prof.id,
        title="150 Vegetarian Lunch Meals",
        food_category="Prepared Cooked Meals",
        quantity_meals=150,
        prep_time=now - timedelta(hours=2),
        latest_pickup_time=now + timedelta(hours=3),
        packaging_type="Sealed individual food-grade containers",
        storage_temp="Refrigerated (3.5°C)",
        allergens="Contains dairy. Vegetarian. Nut-free.",
        handling_notes="Prepared in commercial sanitary kitchen. Tamper-evident seals applied.",
        pickup_address="24, 2nd Avenue, Anna Nagar, Chennai",
        on_site_contact="Alex Rivera",
        contact_phone="+91 98765 43210",
        status=DonationStatusEnum.IN_TRANSIT.value,
        created_at=now - timedelta(hours=2)
    )
    db.add(d1)
    await db.flush()

    # Allocation for RL-00124: 60 to Hope, 50 to Care Centre, 40 remaining
    alloc1 = DonationAllocation(
        donation_id=d1.id,
        ngo_id=ngo1_prof.id,
        allocated_meals=60,
        accepted_meals=60,
        status=AllocationStatusEnum.ACCEPTED.value,
        delivery_window="03:30 - 04:30 PM",
        notes="Recipient shelter kitchen confirmed intake"
    )
    alloc2 = DonationAllocation(
        donation_id=d1.id,
        ngo_id=ngo2_prof.id,
        allocated_meals=50,
        accepted_meals=50,
        status=AllocationStatusEnum.ACCEPTED.value,
        delivery_window="04:15 - 05:00 PM",
        notes="Care centre intake confirmed"
    )
    db.add_all([alloc1, alloc2])

    # Mission 1 for RL-00124
    m1 = Mission(
        code="RL-00124",
        donation_id=d1.id,
        status=MissionStatusEnum.IN_TRANSIT.value,
        total_meals=150,
        total_stops=3,
        current_stop_index=1,
        deadline=now + timedelta(hours=3),
        estimated_pickup=now - timedelta(minutes=20),
        estimated_drop=now + timedelta(minutes=35),
        otp_code="4492",
        is_cold_chain_safe=True
    )
    db.add(m1)
    await db.flush()

    asgn1 = MissionAssignment(
        mission_id=m1.id,
        volunteer_id=vol1_prof.id,
        status=AssignmentStatusEnum.ACCEPTED.value,
        assigned_at=now - timedelta(hours=1),
        accepted_at=now - timedelta(minutes=50)
    )
    db.add(asgn1)

    # Mission Events for RL-00124
    e1 = MissionEvent(mission_id=m1.id, event_type="SUBMITTED", description="Donation RL-00124 registered by Kitchen Director Alex Rivera")
    e2 = MissionEvent(mission_id=m1.id, event_type="MATCHED", description="AI Matching engine allocated 150 meals across 3 shelters")
    e3 = MissionEvent(mission_id=m1.id, event_type="COURIER_ACCEPTED", description="Volunteer Jordan Mathew accepted route and departed for kitchen")
    db.add_all([e1, e2, e3])

    # Agent runs for RL-00124
    ar1 = AgentRun(
        mission_id=m1.id,
        agent_name="INTAKE",
        status="COMPLETED",
        input_summary="Verified ABC Restaurant commercial food handling credentials and 3.5°C refrigerated storage.",
        decision_output="Food safety parameters approved. Batch eligible for expedited multi-drop matching.",
        execution_ms=85
    )
    ar2 = AgentRun(
        mission_id=m1.id,
        agent_name="MATCHING",
        status="COMPLETED",
        input_summary="Matched 150 meals against active shelters in North Chennai.",
        decision_output="Allocated: 60 meals to Hope Kitchen, 50 meals to Care Centre, 40 meals to Meals for All.",
        execution_ms=130
    )
    ar3 = AgentRun(
        mission_id=m1.id,
        agent_name="DISPATCH",
        status="COMPLETED",
        input_summary="Evaluated courier proximity and carrier capacity.",
        decision_output="Assigned Courier Jordan Mathew (1.2 km away, thermal insulated carrier).",
        execution_ms=105
    )
    db.add_all([ar1, ar2, ar3])

    # Donation 2: RL-00128 (Courier Assigned)
    d2 = Donation(
        code="RL-00128",
        donor_id=donor_prof.id,
        title="80 Fresh Vegetarian Lunch Trays",
        food_category="Prepared Cooked Meals",
        quantity_meals=80,
        prep_time=now - timedelta(hours=1),
        latest_pickup_time=now + timedelta(hours=4),
        packaging_type="Sealed individual food-grade trays",
        storage_temp="Refrigerated (3.5°C)",
        allergens="Contains dairy",
        pickup_address="24, 2nd Avenue, Anna Nagar, Chennai",
        on_site_contact="Alex Rivera",
        contact_phone="+91 98765 43210",
        status=DonationStatusEnum.ALLOCATED.value,
        created_at=now - timedelta(hours=1)
    )
    db.add(d2)
    await db.flush()

    alloc3 = DonationAllocation(
        donation_id=d2.id,
        ngo_id=ngo1_prof.id,
        allocated_meals=80,
        accepted_meals=60,
        status=AllocationStatusEnum.AWAITING_RESPONSE.value,
        delivery_window="03:30 - 05:00 PM",
        notes="Awaiting shelter acceptance"
    )
    db.add(alloc3)

    m2 = Mission(
        code="RL-00128",
        donation_id=d2.id,
        status=MissionStatusEnum.ASSIGNED.value,
        total_meals=80,
        total_stops=2,
        deadline=now + timedelta(hours=4),
        otp_code="7812"
    )
    db.add(m2)
    await db.flush()

    asgn2 = MissionAssignment(
        mission_id=m2.id,
        volunteer_id=vol2_prof.id,
        status=AssignmentStatusEnum.OFFERED.value,
        assigned_at=now - timedelta(minutes=20)
    )
    db.add(asgn2)

    # Donation 3: RL-00119 (Delivered & Verified)
    d3 = Donation(
        code="RL-00119",
        donor_id=donor_prof.id,
        title="42 Bakery Assortments & Breads",
        food_category="Baked Goods",
        quantity_meals=42,
        prep_time=now - timedelta(days=1),
        latest_pickup_time=now - timedelta(hours=20),
        packaging_type="Food-grade cartons",
        storage_temp="Ambient (clean, dry)",
        allergens="Contains wheat/gluten",
        pickup_address="24, 2nd Avenue, Anna Nagar, Chennai",
        on_site_contact="Alex Rivera",
        contact_phone="+91 98765 43210",
        status=DonationStatusEnum.DELIVERED.value,
        created_at=now - timedelta(days=1)
    )
    db.add(d3)
    await db.flush()

    alloc4 = DonationAllocation(
        donation_id=d3.id,
        ngo_id=ngo1_prof.id,
        allocated_meals=42,
        accepted_meals=42,
        status=AllocationStatusEnum.DELIVERED.value
    )
    db.add(alloc4)
    await db.flush()

    m3 = Mission(
        code="RL-00119",
        donation_id=d3.id,
        status=MissionStatusEnum.COMPLETED.value,
        total_meals=42,
        deadline=now - timedelta(hours=18),
        otp_code="9012"
    )
    db.add(m3)
    await db.flush()

    ho1 = Handover(
        mission_id=m3.id,
        allocation_id=alloc4.id,
        verified_qty=42,
        temp_at_drop=21.0,
        recipient_otp="9012",
        receiver_name="Sarah Kumar",
        notes="All 42 bakery assortments delivered in excellent condition"
    )
    db.add(ho1)

    await db.commit()
    logger.info("Minimal seed dataset successfully created.")
