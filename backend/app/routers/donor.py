from datetime import datetime, timedelta
import secrets
from typing import Optional, List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.entities import (
    User, DonorProfile, Donation, DonationAllocation, Mission,
    MissionAssignment, VolunteerProfile, NgoProfile, DonationStatusEnum,
    RoleEnum, MissionStatusEnum
)
from backend.app.models.schemas import DonationCreate, DonationOut, AllocationOut
from backend.app.auth.dependencies import require_role
from backend.app.services.allocation_engine import AllocationEngine
from backend.app.services.audit_service import log_audit_event
from backend.app.agents.orchestrator import AgentOrchestrator

router = APIRouter(prefix="/donor", tags=["Donor Workspace"])

@router.get("/dashboard-stats")
async def get_donor_dashboard_stats(
    current_user: User = Depends(require_role(["donor"])),
    db: AsyncSession = Depends(get_db)
):
    donor_prof = current_user.donor_profile
    if not donor_prof:
        raise HTTPException(status_code=404, detail="Donor profile not found")

    # Total donations
    res_total = await db.execute(
        select(func.count(Donation.id)).where(Donation.donor_id == donor_prof.id)
    )
    total_donations = res_total.scalar() or 0

    # Total meals rescued
    res_meals = await db.execute(
        select(func.sum(Donation.quantity_meals)).where(
            Donation.donor_id == donor_prof.id,
            Donation.status == DonationStatusEnum.DELIVERED.value
        )
    )
    total_meals = res_meals.scalar() or 0

    # Active donations
    res_active = await db.execute(
        select(func.count(Donation.id)).where(
            Donation.donor_id == donor_prof.id,
            Donation.status.in_([
                DonationStatusEnum.SUBMITTED.value,
                DonationStatusEnum.ALLOCATED.value,
                DonationStatusEnum.IN_TRANSIT.value
            ])
        )
    )
    active_donations = res_active.scalar() or 0
    res_pending = await db.execute(
        select(func.count(Donation.id)).where(
            Donation.donor_id == donor_prof.id,
            Donation.status == DonationStatusEnum.SUBMITTED.value,
        )
    )
    pending_actions = res_pending.scalar() or 0

    return {
        "total_donations": total_donations,
        "meals_redistributed": f"{total_meals:,}",
        "total_meals_rescued": total_meals,
        "active_donations": active_donations,
        "active_missions": active_donations,
        "pending_actions": pending_actions,
        "kitchen_name": donor_prof.organization_name,
        "contact_person": donor_prof.contact_person
    }

@router.get("/active-donations")
async def get_active_donations(
    current_user: User = Depends(require_role(["donor"])),
    db: AsyncSession = Depends(get_db)
):
    donor_id = current_user.donor_profile.id if current_user.donor_profile else None
    if current_user.role != RoleEnum.OPS_ADMIN.value and not donor_id:
        raise HTTPException(status_code=404, detail="Donor profile not found")

    query = select(Donation).options(selectinload(Donation.allocations)).where(
        Donation.status.in_([
            DonationStatusEnum.SUBMITTED.value,
            DonationStatusEnum.ALLOCATED.value,
            DonationStatusEnum.IN_TRANSIT.value,
        ])
    ).order_by(Donation.created_at.desc())
    if donor_id and current_user.role != RoleEnum.OPS_ADMIN.value:
        query = query.where(Donation.donor_id == donor_id)
    
    result = await db.execute(query.limit(10))
    donations = result.scalars().all()

    items = []
    for d in donations:
        status_label = "Matching Shelters"
        tone = "purple"
        if d.status == DonationStatusEnum.ALLOCATED.value:
            status_label = "Allocation Ready"
            tone = "blue"
        elif d.status == DonationStatusEnum.IN_TRANSIT.value:
            status_label = "In Transit (Courier en route)"
            tone = "amber"

        items.append({
            "id": d.id,
            "code": d.code,
            "title": d.title,
            "food_category": d.food_category,
            "quantity": f"{d.quantity_meals} meals",
            "status": status_label,
            "tone": tone,
            "pickup_window": d.latest_pickup_time.strftime("%d %b, %I:%M %p") if d.latest_pickup_time else None,
            "allocations_count": len(d.allocations)
        })
    return items

@router.get("/pickups/today")
async def get_today_pickups(
    current_user: User = Depends(require_role(["donor"])),
    db: AsyncSession = Depends(get_db)
):
    donor_prof = current_user.donor_profile
    if not donor_prof:
        raise HTTPException(status_code=404, detail="Donor profile not found")
    today = datetime.utcnow().date()
    result = await db.execute(
        select(Mission)
        .join(Donation, Mission.donation_id == Donation.id)
        .options(
            selectinload(Mission.assignments)
            .selectinload(MissionAssignment.volunteer)
            .selectinload(VolunteerProfile.user),
        )
        .where(
            Donation.donor_id == donor_prof.id,
            func.date(Mission.deadline) == today,
            Mission.status.in_([
                MissionStatusEnum.DISPATCHING.value,
                MissionStatusEnum.ASSIGNED.value,
                MissionStatusEnum.PICKUP_UNDERWAY.value,
                MissionStatusEnum.IN_TRANSIT.value,
            ]),
        )
        .order_by(Mission.deadline)
    )
    return [
        {
            "title": (
                f"{mission.assignments[0].volunteer.user.full_name} pickup"
                if mission.assignments
                and mission.assignments[0].volunteer
                and mission.assignments[0].volunteer.user
                else "Volunteer pickup"
            ),
            "time": f"Mission {mission.code} · {mission.total_meals} meals · "
            f"{mission.deadline.strftime('%I:%M %p')}",
        }
        for mission in result.scalars().all()
    ]

@router.get("/activity-feed")
async def get_activity_feed(
    current_user: User = Depends(require_role(["donor"])),
    db: AsyncSession = Depends(get_db)
):
    donor_prof = current_user.donor_profile
    if not donor_prof:
        raise HTTPException(status_code=404, detail="Donor profile not found")
    result = await db.execute(
        select(Donation)
        .where(Donation.donor_id == donor_prof.id)
        .order_by(Donation.updated_at.desc())
        .limit(10)
    )
    return [
        {
            "title": f"Donation {donation.code}: {donation.status.replace('_', ' ').title()}",
            "time": donation.updated_at.strftime("%d %b %Y, %I:%M %p"),
            "active": donation.status in {
                DonationStatusEnum.SUBMITTED.value,
                DonationStatusEnum.ALLOCATED.value,
                DonationStatusEnum.IN_TRANSIT.value,
            },
        }
        for donation in result.scalars().all()
    ]

@router.post("/donations", response_model=DonationOut)
async def create_donation(
    req: DonationCreate,
    current_user: User = Depends(require_role(["donor"])),
    db: AsyncSession = Depends(get_db)
):
    donor_prof = current_user.donor_profile
    if not donor_prof:
        raise HTTPException(status_code=404, detail="Donor profile not found")

    now = datetime.utcnow()
    # Generate unique batch code
    code = f"RL-{uuid.uuid4().hex[:8].upper()}"

    prep_time = req.prep_time or now
    latest_pickup = req.latest_pickup_time or (now + timedelta(hours=4))

    new_donation = Donation(
        code=code,
        donor_id=donor_prof.id,
        title=req.title,
        food_category=req.food_category,
        quantity_meals=req.quantity_meals,
        prep_time=prep_time,
        latest_pickup_time=latest_pickup,
        packaging_type=req.packaging_type,
        storage_temp=req.storage_temp,
        allergens=req.allergens,
        handling_notes=req.handling_notes,
        pickup_address=req.pickup_address or donor_prof.address,
        on_site_contact=req.on_site_contact or donor_prof.contact_person,
        contact_phone=req.contact_phone or donor_prof.contact_phone,
        status=DonationStatusEnum.SUBMITTED.value
    )
    db.add(new_donation)
    await db.flush()

    # Automatically trigger Deterministic Allocation Engine
    allocations = await AllocationEngine.allocate_donation(db, new_donation)

    # Spawn corresponding Mission
    mission = Mission(
        code=code,
        donation_id=new_donation.id,
        status=MissionStatusEnum.DISPATCHING.value,
        total_meals=new_donation.quantity_meals,
        total_stops=max(1, len(allocations)),
        deadline=latest_pickup,
        otp_code=f"{secrets.randbelow(900000) + 100000}"
    )
    db.add(mission)
    await db.flush()

    # Trigger Matching and Dispatch Agents
    await AgentOrchestrator.run_matching_agent(db, mission, new_donation)
    await AgentOrchestrator.run_dispatch_agent(db, mission)

    # Update donation status
    new_donation.status = DonationStatusEnum.ALLOCATED.value

    # Audit log
    await log_audit_event(
        db,
        action="CREATE_DONATION",
        entity_type="Donation",
        entity_id=new_donation.id,
        user_id=current_user.id,
        details={"code": code, "meals": req.quantity_meals, "allocations": len(allocations)}
    )

    await db.commit()
    await db.refresh(new_donation)
    
    out = DonationOut.model_validate(new_donation)
    out.allocations_count = len(allocations)
    return out

@router.get("/donations/{donation_id}")
async def get_donation_details(
    donation_id: str,
    current_user: User = Depends(require_role(["donor"])),
    db: AsyncSession = Depends(get_db)
):
    query = select(Donation).options(
        selectinload(Donation.allocations).selectinload(DonationAllocation.ngo),
        selectinload(Donation.missions).selectinload(Mission.assignments).selectinload(MissionAssignment.volunteer).selectinload(VolunteerProfile.user)
    )
    
    # Allow lookup by UUID or by code like RL-00124
    id_filter = Donation.code == donation_id if donation_id.startswith("RL-") else Donation.id == donation_id
    if current_user.role == RoleEnum.DONOR.value:
        donor_prof = current_user.donor_profile
        if not donor_prof:
            raise HTTPException(status_code=404, detail="Donor profile not found")
        query = query.where(Donation.donor_id == donor_prof.id)
    result = await db.execute(query.where(id_filter))
    donation = result.scalars().first()

    if not donation:
        raise HTTPException(status_code=404, detail="Donation batch not found")

    # Build allocations list
    allocations_data = []
    for a in donation.allocations:
        allocations_data.append({
            "id": a.id,
            "ngo_name": a.ngo.organization_name if a.ngo else None,
            "address": a.ngo.address if a.ngo else None,
            "allocated_meals": f"{a.allocated_meals} meals",
            "accepted_meals": f"{a.accepted_meals} meals",
            "status": a.status,
            "delivery_window": a.delivery_window
        })

    # Courier info
    courier_name = None
    courier_phone = None
    courier_vehicle = None
    mission_status = None

    if donation.missions:
        m = donation.missions[0]
        mission_status = m.status
        if m.assignments:
            asgn = m.assignments[0]
            if asgn.volunteer and asgn.volunteer.user:
                courier_name = asgn.volunteer.user.full_name
                courier_phone = asgn.volunteer.user.phone
                courier_vehicle = f"{asgn.volunteer.vehicle_type} ({asgn.volunteer.vehicle_plate})"

    return {
        "id": donation.id,
        "code": donation.code,
        "title": donation.title,
        "food_category": donation.food_category,
        "quantity_meals": donation.quantity_meals,
        "prep_time": donation.prep_time.strftime("%I:%M %p"),
        "latest_pickup": donation.latest_pickup_time.strftime("%I:%M %p"),
        "storage_temp": donation.storage_temp,
        "allergens": donation.allergens or "Not specified",
        "pickup_address": donation.pickup_address,
        "contact_person": donation.on_site_contact,
        "contact_phone": donation.contact_phone,
        "status": donation.status,
        "allocations": allocations_data,
        "courier": {
            "name": courier_name,
            "phone": courier_phone,
            "vehicle": courier_vehicle,
            "status": mission_status
        }
    }

@router.get("/history")
async def get_donation_history(
    q: Optional[str] = None,
    current_user: User = Depends(require_role(["donor"])),
    db: AsyncSession = Depends(get_db)
):
    query = select(Donation).options(selectinload(Donation.donor)).order_by(Donation.created_at.desc())
    donor_prof = current_user.donor_profile
    if current_user.role == RoleEnum.DONOR.value:
        if not donor_prof:
            raise HTTPException(status_code=404, detail="Donor profile not found")
        query = query.where(Donation.donor_id == donor_prof.id)
    if q:
        query = query.where(
            Donation.title.ilike(f"%{q}%") | 
            Donation.code.ilike(f"%{q}%") |
            Donation.food_category.ilike(f"%{q}%")
        )

    result = await db.execute(query)
    donations = result.scalars().all()

    items = []
    for d in donations:
        tone = "green" if d.status == "DELIVERED" else "amber" if d.status == "IN_TRANSIT" else "blue"
        items.append({
            "id": d.code,
            "uuid": d.id,
            "name": d.donor.organization_name if d.donor else "Donor",
            "food": d.title,
            "quantity": f"{d.quantity_meals} meals",
            "status": d.status.replace("_", " ").title(),
            "tone": tone,
            "date": d.created_at.strftime("%d %b %Y")
        })
    return items
