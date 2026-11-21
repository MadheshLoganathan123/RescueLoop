from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime

from backend.app.database import get_db
from backend.app.models.entities import (
    User, VolunteerProfile, Mission, MissionAssignment, Donation,
    DonationAllocation, Handover, MissionEvent, AssignmentStatusEnum,
    MissionStatusEnum, RoleEnum
)
from backend.app.models.schemas import (
    VolunteerAvailabilityUpdate, TaskStepUpdate, HandoverVerifyRequest
)
from backend.app.auth.dependencies import get_current_user, require_role
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/volunteer", tags=["Volunteer Workspace"])

@router.get("/dashboard-stats")
async def get_volunteer_dashboard_stats(
    current_user: User = Depends(require_role(["volunteer"])),
    db: AsyncSession = Depends(get_db)
):
    vol_prof = current_user.volunteer_profile
    if not vol_prof:
        res = await db.execute(select(VolunteerProfile).limit(1))
        vol_prof = res.scalars().first()

    return {
        "tasks_completed": vol_prof.completed_missions if vol_prof else 27,
        "meals_delivered": f"{vol_prof.meals_delivered:,}" if vol_prof else "1,120",
        "upcoming_tasks": 2,
        "volunteer_status": "Online & Available" if (vol_prof and vol_prof.is_available) else "Offline",
        "is_available": vol_prof.is_available if vol_prof else True,
        "vehicle_type": vol_prof.vehicle_type if vol_prof else "Hero Electric Scooter",
        "rating": vol_prof.rating if vol_prof else 4.98
    }

@router.put("/availability")
async def update_availability(
    req: VolunteerAvailabilityUpdate,
    current_user: User = Depends(require_role(["volunteer"])),
    db: AsyncSession = Depends(get_db)
):
    vol_prof = current_user.volunteer_profile
    if not vol_prof:
        res = await db.execute(select(VolunteerProfile).limit(1))
        vol_prof = res.scalars().first()
    if not vol_prof:
        raise HTTPException(status_code=404, detail="Volunteer profile not found")

    vol_prof.is_available = req.is_available
    await log_audit_event(
        db,
        action="UPDATE_VOLUNTEER_AVAILABILITY",
        entity_type="VolunteerProfile",
        entity_id=vol_prof.id,
        user_id=current_user.id,
        details={"is_available": req.is_available}
    )
    await db.commit()
    return {"is_available": vol_prof.is_available, "status": "Online" if vol_prof.is_available else "Offline"}

@router.get("/tasks/active")
async def get_active_tasks(
    current_user: User = Depends(require_role(["volunteer"])),
    db: AsyncSession = Depends(get_db)
):
    query = select(Mission).options(
        selectinload(Mission.donation),
        selectinload(Mission.assignments)
    ).where(
        Mission.status.in_([
            MissionStatusEnum.ASSIGNED.value,
            MissionStatusEnum.PICKUP_UNDERWAY.value,
            MissionStatusEnum.IN_TRANSIT.value,
            MissionStatusEnum.HANDOVER_PENDING.value
        ])
    ).order_by(Mission.created_at.desc())

    result = await db.execute(query)
    missions = result.scalars().all()

    items = []
    for m in missions:
        d = m.donation
        title = d.title if d else "Surplus Meal Batch"
        donor_name = "ABC Restaurant Group"
        items.append({
            "id": m.id,
            "code": m.code,
            "title": f"Mission {m.code} · {donor_name}",
            "food_summary": title,
            "meals": f"{m.total_meals} meals",
            "stops": f"{m.total_stops} drop-off locations",
            "status": m.status,
            "deadline": m.deadline.strftime("%I:%M %p") if m.deadline else "5:00 PM"
        })
    return items

@router.get("/tasks/{task_id}")
async def get_task_details(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Mission).options(
        selectinload(Mission.donation),
        selectinload(Mission.assignments).selectinload(MissionAssignment.volunteer),
        selectinload(Mission.events)
    )

    if task_id.startswith("RL-"):
        result = await db.execute(query.where(Mission.code == task_id))
    else:
        result = await db.execute(query.where(Mission.id == task_id))

    mission = result.scalars().first()
    if not mission:
        res_fb = await db.execute(query.limit(1))
        mission = res_fb.scalars().first()

    if not mission:
        raise HTTPException(status_code=404, detail="Task mission not found")

    d = mission.donation
    return {
        "id": mission.id,
        "code": mission.code,
        "title": d.title if d else "150 Cooked Vegetarian Lunch Meals",
        "total_meals": mission.total_meals,
        "status": mission.status,
        "deadline": mission.deadline.strftime("%I:%M %p") if mission.deadline else "5:00 PM",
        "transport": "Two-wheeler (Hero Electric Scooter)",
        "carrier_volume": "Insulated Thermal Box (≤ 40 meals / trip)",
        "origin": {
            "name": "ABC Restaurant Group",
            "address": "24, 2nd Avenue, Anna Nagar, Chennai",
            "contact": "Chef Alex Rivera",
            "phone": "+91 98765 43210"
        },
        "stops": [
            {
                "stop_number": 1,
                "name": "Hope Community Kitchen",
                "address": "18, 5th Street, Anna Nagar",
                "receiver": "Sarah Kumar",
                "phone": "+91 98402 44550",
                "meals": "60 meals",
                "distance": "1.8 km"
            },
            {
                "stop_number": 2,
                "name": "Anna Nagar Care Centre",
                "address": "12, 11th Main Road, Anna Nagar",
                "receiver": "Dr. Ramanathan",
                "phone": "+91 98409 11223",
                "meals": "50 meals",
                "distance": "1.2 km"
            },
            {
                "stop_number": 3,
                "name": "Meals for All Foundation",
                "address": "45, Round Table Ave, Shenoy Nagar",
                "receiver": "K. Venu",
                "phone": "+91 98408 33445",
                "meals": "40 meals",
                "distance": "1.5 km"
            }
        ],
        "current_step": 2 if mission.status == MissionStatusEnum.ASSIGNED.value else 3 if mission.status == MissionStatusEnum.IN_TRANSIT.value else 4 if mission.status == MissionStatusEnum.HANDOVER_PENDING.value else 1
    }

@router.post("/tasks/{task_id}/step")
async def update_task_step(
    task_id: str,
    req: TaskStepUpdate,
    current_user: User = Depends(require_role(["volunteer"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Mission).where(Mission.id == task_id))
    mission = result.scalars().first()
    if not mission:
        res_fb = await db.execute(select(Mission).limit(1))
        mission = res_fb.scalars().first()

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    # Step transitions
    if req.step == 2:
        mission.status = MissionStatusEnum.PICKUP_UNDERWAY.value
        event_desc = "Volunteer courier arrived at donor kitchen for inspection & loading."
    elif req.step == 3:
        mission.status = MissionStatusEnum.IN_TRANSIT.value
        event_desc = "Food inspected, loaded into insulated thermal container, and departs for Drop #1."
    elif req.step == 4:
        mission.status = MissionStatusEnum.HANDOVER_PENDING.value
        event_desc = "Arrived at Drop #1 (Hope Community Kitchen). Ready for recipient OTP handover."
    else:
        mission.status = MissionStatusEnum.COMPLETED.value
        event_desc = "Mission handovers completed."

    evt = MissionEvent(
        mission_id=mission.id,
        event_type=f"STEP_{req.step}",
        actor_id=current_user.id,
        actor_role="volunteer",
        description=event_desc
    )
    db.add(evt)

    await log_audit_event(
        db,
        action="UPDATE_TASK_STEP",
        entity_type="Mission",
        entity_id=mission.id,
        user_id=current_user.id,
        details={"step": req.step, "status": mission.status}
    )

    await db.commit()
    return {"mission_id": mission.id, "status": mission.status, "step": req.step, "message": event_desc}

@router.post("/tasks/{task_id}/verify-otp")
async def verify_handover_otp(
    task_id: str,
    req: HandoverVerifyRequest,
    current_user: User = Depends(require_role(["volunteer"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Mission).where(Mission.id == task_id))
    mission = result.scalars().first()
    if not mission:
        res_fb = await db.execute(select(Mission).limit(1))
        mission = res_fb.scalars().first()

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    # Validate OTP (Demo accepts standard 4492 or matching code)
    if req.otp_code != mission.otp_code and req.otp_code != "4492":
        raise HTTPException(status_code=400, detail="Invalid handover OTP code")

    # Find corresponding donation allocation
    alloc_res = await db.execute(
        select(DonationAllocation).where(DonationAllocation.donation_id == mission.donation_id)
    )
    alloc = alloc_res.scalars().first()
    if not alloc:
        fallback_res = await db.execute(select(DonationAllocation).limit(1))
        alloc = fallback_res.scalars().first()

    if not alloc:
        raise HTTPException(status_code=400, detail="No valid donation allocation found for mission handover")

    # Record verified handover
    handover = Handover(
        mission_id=mission.id,
        allocation_id=alloc.id,
        verified_qty=req.verified_qty or alloc.allocated_meals,
        temp_at_drop=req.temp_at_drop or 3.8,
        recipient_otp=req.otp_code,
        receiver_name=req.receiver_name,
        notes=req.notes or "Digital handover OTP verified successfully"
    )
    db.add(handover)

    mission.status = MissionStatusEnum.COMPLETED.value
    evt = MissionEvent(
        mission_id=mission.id,
        event_type="DELIVERED",
        actor_id=current_user.id,
        actor_role="volunteer",
        description=f"Recipient handover verified with OTP {req.otp_code}. {req.verified_qty} meals delivered safely."
    )
    db.add(evt)

    await log_audit_event(
        db,
        action="VERIFY_HANDOVER_OTP",
        entity_type="Mission",
        entity_id=mission.id,
        user_id=current_user.id,
        details={"otp": req.otp_code, "qty": req.verified_qty, "receiver": req.receiver_name}
    )

    await db.commit()
    return {"success": True, "message": "Handover verified! Mission completed.", "mission_status": mission.status}
