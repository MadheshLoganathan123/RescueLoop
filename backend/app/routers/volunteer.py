from typing import Optional, List
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from datetime import datetime, timedelta

logger = logging.getLogger("rescueloop.volunteer")

from backend.app.database import get_db
from backend.app.models.entities import (
    User, VolunteerProfile, DonorProfile, Mission, MissionAssignment, Donation,
    DonationAllocation, Handover, MissionEvent, AssignmentStatusEnum,
    MissionStatusEnum, RoleEnum
)
from backend.app.models.schemas import (
    VolunteerAvailabilityUpdate, TaskStepUpdate, HandoverVerifyRequest
)
from backend.app.auth.dependencies import get_current_user, require_role
from backend.app.services.audit_service import log_audit_event
from backend.app.limiter import OTP_VERIFY_LIMIT, limiter

router = APIRouter(prefix="/volunteer", tags=["Volunteer Workspace"])

OTP_TTL = timedelta(minutes=15)
OTP_RESEND_COOLDOWN = timedelta(seconds=60)
MAX_OTP_FAILURES = 5

@router.get("/dashboard-stats")
async def get_volunteer_dashboard_stats(
    current_user: User = Depends(require_role(["volunteer"])),
    db: AsyncSession = Depends(get_db)
):
    vol_prof = current_user.volunteer_profile
    if not vol_prof:
        raise HTTPException(status_code=404, detail="Volunteer profile not found")

    res_completed = await db.execute(
        select(func.count(MissionAssignment.id))
        .join(Mission, MissionAssignment.mission_id == Mission.id)
        .where(
            MissionAssignment.volunteer_id == vol_prof.id,
            Mission.status == MissionStatusEnum.COMPLETED.value,
        )
    )
    res_meals = await db.execute(
        select(func.sum(Handover.verified_qty))
        .join(MissionAssignment, Handover.mission_id == MissionAssignment.mission_id)
        .where(MissionAssignment.volunteer_id == vol_prof.id)
    )
    res_upcoming = await db.execute(
        select(func.count(MissionAssignment.id))
        .join(Mission, MissionAssignment.mission_id == Mission.id)
        .where(
            MissionAssignment.volunteer_id == vol_prof.id,
            Mission.status.in_([
                MissionStatusEnum.DISPATCHING.value,
                MissionStatusEnum.ASSIGNED.value,
                MissionStatusEnum.PICKUP_UNDERWAY.value,
                MissionStatusEnum.IN_TRANSIT.value,
                MissionStatusEnum.HANDOVER_PENDING.value,
            ]),
        )
    )
    completed = res_completed.scalar() or 0
    meals = res_meals.scalar() or 0
    upcoming = res_upcoming.scalar() or 0

    return {
        "tasks_completed": completed,
        "meals_delivered": f"{meals:,}",
        "upcoming_tasks": upcoming,
        "volunteer_status": "Online & Available" if vol_prof.is_available else "Offline",
        "is_available": vol_prof.is_available,
        "vehicle_type": vol_prof.vehicle_type,
        "rating": vol_prof.rating
    }

@router.put("/availability")
async def update_availability(
    req: VolunteerAvailabilityUpdate,
    current_user: User = Depends(require_role(["volunteer"])),
    db: AsyncSession = Depends(get_db)
):
    vol_prof = current_user.volunteer_profile
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
    vol_prof = current_user.volunteer_profile
    if not vol_prof:
        raise HTTPException(status_code=404, detail="Volunteer profile not found")
    query = select(Mission).options(
        selectinload(Mission.donation).selectinload(Donation.donor),
        selectinload(Mission.assignments)
    ).join(MissionAssignment, MissionAssignment.mission_id == Mission.id).where(
        MissionAssignment.volunteer_id == vol_prof.id,
        Mission.status.in_([
            MissionStatusEnum.ASSIGNED.value,
            MissionStatusEnum.PICKUP_UNDERWAY.value,
            MissionStatusEnum.IN_TRANSIT.value,
            MissionStatusEnum.HANDOVER_PENDING.value,
        ]),
    ).order_by(Mission.created_at.desc())

    result = await db.execute(query)
    missions = result.scalars().all()

    items = []
    for m in missions:
        d = m.donation
        title = d.title if d else "Donation"
        donor_name = d.donor.organization_name if d and d.donor else "Donor"
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
    current_user: User = Depends(require_role(["volunteer"])),
    db: AsyncSession = Depends(get_db)
):
    query = select(Mission).options(
        selectinload(Mission.donation)
        .selectinload(Donation.donor)
        .selectinload(DonorProfile.user),
        selectinload(Mission.donation)
        .selectinload(Donation.allocations)
        .selectinload(DonationAllocation.ngo),
        selectinload(Mission.assignments)
        .selectinload(MissionAssignment.volunteer)
        .selectinload(VolunteerProfile.user),
        selectinload(Mission.events)
    )

    task_filter = Mission.code == task_id if task_id.startswith("RL-") else Mission.id == task_id
    if current_user.role == RoleEnum.VOLUNTEER.value:
        vol_prof = current_user.volunteer_profile
        if not vol_prof:
            raise HTTPException(status_code=404, detail="Volunteer profile not found")
        query = query.join(MissionAssignment).where(MissionAssignment.volunteer_id == vol_prof.id)
    result = await db.execute(query.where(task_filter))

    mission = result.scalars().first()
    if not mission:
        raise HTTPException(status_code=404, detail="Task mission not found")

    d = mission.donation
    donor = d.donor if d else None
    assignments = mission.assignments
    volunteer = assignments[0].volunteer if assignments else None
    allocations = sorted(d.allocations, key=lambda allocation: allocation.created_at) if d else []
    stops = [
        {
            "stop_number": index + 1,
            "name": allocation.ngo.organization_name if allocation.ngo else "Recipient",
            "address": allocation.ngo.address if allocation.ngo else None,
            "receiver": allocation.ngo.contact_person if allocation.ngo else None,
            "phone": allocation.ngo.contact_phone if allocation.ngo else None,
            "meals": f"{allocation.accepted_meals or allocation.allocated_meals} meals",
            "distance": None,
        }
        for index, allocation in enumerate(allocations)
    ]
    return {
        "id": mission.id,
        "code": mission.code,
        "title": d.title if d else "Donation",
        "total_meals": mission.total_meals,
        "status": mission.status,
        "deadline": mission.deadline.strftime("%I:%M %p") if mission.deadline else None,
        "current_stop_index": mission.current_stop_index,
        "transport": volunteer.vehicle_type if volunteer else None,
        "carrier_volume": f"{volunteer.max_meal_capacity} meals" if volunteer else None,
        "origin": {
            "name": donor.organization_name if donor else None,
            "address": d.pickup_address if d else None,
            "contact": d.on_site_contact if d else None,
            "phone": d.contact_phone if d else None,
        },
        "stops": stops,
        "current_step": {
            MissionStatusEnum.ASSIGNED.value: 1,
            MissionStatusEnum.PICKUP_UNDERWAY.value: 2,
            MissionStatusEnum.IN_TRANSIT.value: 3,
            MissionStatusEnum.HANDOVER_PENDING.value: 4,
            MissionStatusEnum.COMPLETED.value: 5,
        }.get(mission.status, 1),
    }

@router.post("/tasks/{task_id}/step")
async def update_task_step(
    task_id: str,
    req: TaskStepUpdate,
    current_user: User = Depends(require_role(["volunteer"])),
    db: AsyncSession = Depends(get_db)
):
    task_filter = Mission.code == task_id if task_id.startswith("RL-") else Mission.id == task_id
    query = select(Mission).where(task_filter)
    if current_user.role == RoleEnum.VOLUNTEER.value:
        vol_prof = current_user.volunteer_profile
        if not vol_prof:
            raise HTTPException(status_code=404, detail="Volunteer profile not found")
        query = query.join(MissionAssignment).where(MissionAssignment.volunteer_id == vol_prof.id)
    result = await db.execute(query)
    mission = result.scalars().first()

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    if req.step == 1:
        raise HTTPException(status_code=400, detail="Step 1 is informational; valid updates are steps 2 through 4")
    if mission.status in (MissionStatusEnum.COMPLETED.value, MissionStatusEnum.CANCELLED.value):
        raise HTTPException(status_code=409, detail="This mission can no longer be updated")

    if req.step == 2:
        if mission.status not in (MissionStatusEnum.ASSIGNED.value, MissionStatusEnum.PICKUP_UNDERWAY.value):
            raise HTTPException(status_code=409, detail="Mission is not awaiting pickup")
        mission.status = MissionStatusEnum.PICKUP_UNDERWAY.value
        event_desc = "Volunteer courier arrived at donor kitchen for inspection & loading."
    elif req.step == 3:
        if not req.inspections_passed:
            raise HTTPException(status_code=400, detail="Food safety inspection must pass before departure")
        if mission.status not in (
            MissionStatusEnum.PICKUP_UNDERWAY.value,
            MissionStatusEnum.IN_TRANSIT.value,
        ):
            raise HTTPException(status_code=409, detail="Mission is not ready to leave the donor")
        mission.status = MissionStatusEnum.IN_TRANSIT.value
        event_desc = f"Food inspected and departed for recipient; temperature checked at {req.temp_checked}°."
    elif req.step == 4:
        if mission.status not in (
            MissionStatusEnum.IN_TRANSIT.value,
            MissionStatusEnum.HANDOVER_PENDING.value,
        ):
            raise HTTPException(status_code=409, detail="Mission is not in transit to a recipient")
        mission.status = MissionStatusEnum.HANDOVER_PENDING.value
        event_desc = "Volunteer arrived at recipient location and is ready for OTP handover."

        # Dispatch the handover OTP once the courier reaches the recipient.
        # A short cooldown stops repeated step updates from texting the same code.
        try:
            from backend.app.services.sms_service import send_handover_otp
            from backend.app.services.notification_service import create_notification

            now = datetime.utcnow()
            recently_sent = (
                mission.otp_sent_at is not None
                and now - mission.otp_sent_at < OTP_RESEND_COOLDOWN
            )
            otp_to_send = mission.otp_code
            if not recently_sent:
                mission.otp_expires_at = now + OTP_TTL
                mission.otp_sent_at = now
                mission.otp_failed_attempts = 0

            alloc_res = await db.execute(
                select(DonationAllocation)
                .options(selectinload(DonationAllocation.ngo))
                .where(DonationAllocation.donation_id == mission.donation_id)
                .order_by(DonationAllocation.created_at)
            )
            alloc = alloc_res.scalars().first()
            ngo_phone = None
            if alloc and alloc.ngo:
                ngo_phone = alloc.ngo.contact_phone
                if alloc.ngo.user_id and not recently_sent:
                    await create_notification(
                        db,
                        user_id=alloc.ngo.user_id,
                        title=f"Courier Arrived: Mission {mission.code}",
                        message=(
                            f"Courier has arrived with {mission.total_meals} meals. "
                            f"Your handover OTP is {otp_to_send}. It expires in 15 minutes."
                        ),
                        type="ACTION_REQUIRED",
                    )

            if ngo_phone and not recently_sent:
                await send_handover_otp(
                    to_phone=ngo_phone,
                    otp_code=otp_to_send,
                    mission_code=mission.code,
                    meals=mission.total_meals,
                )
        except Exception as sms_err:
            logger.warning(f"Could not dispatch SMS OTP: {sms_err}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported mission step")

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
@limiter.limit(OTP_VERIFY_LIMIT)
async def verify_handover_otp(
    task_id: str,
    req: HandoverVerifyRequest,
    request: Request,
    current_user: User = Depends(require_role(["volunteer"])),
    db: AsyncSession = Depends(get_db)
):
    task_filter = Mission.code == task_id if task_id.startswith("RL-") else Mission.id == task_id
    query = select(Mission).where(task_filter)
    if current_user.role == RoleEnum.VOLUNTEER.value:
        vol_prof = current_user.volunteer_profile
        if not vol_prof:
            raise HTTPException(status_code=404, detail="Volunteer profile not found")
        query = query.join(MissionAssignment).where(MissionAssignment.volunteer_id == vol_prof.id)
    result = await db.execute(query)
    mission = result.scalars().first()

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    if mission.status not in (
        MissionStatusEnum.IN_TRANSIT.value,
        MissionStatusEnum.HANDOVER_PENDING.value,
    ):
        raise HTTPException(status_code=409, detail="Mission is not ready for handover")
    if (mission.otp_failed_attempts or 0) >= MAX_OTP_FAILURES:
        raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Ask the recipient for a fresh code.")
    if mission.otp_expires_at and datetime.utcnow() > mission.otp_expires_at:
        raise HTTPException(status_code=400, detail="Handover OTP has expired. Arrive at the stop again to request a new code.")
    if req.otp_code != mission.otp_code:
        mission.otp_failed_attempts = (mission.otp_failed_attempts or 0) + 1
        await db.commit()
        raise HTTPException(status_code=400, detail="Invalid handover OTP code")
    mission.otp_failed_attempts = 0

    alloc_res = await db.execute(
        select(DonationAllocation)
        .where(
            DonationAllocation.donation_id == mission.donation_id,
            DonationAllocation.status.in_(["ACCEPTED", "DELIVERED"]),
        )
        .order_by(DonationAllocation.created_at)
    )
    allocations = alloc_res.scalars().all()
    completed_res = await db.execute(
        select(func.count(Handover.id)).where(Handover.mission_id == mission.id)
    )
    completed_stops = completed_res.scalar() or 0
    if completed_stops >= len(allocations):
        raise HTTPException(status_code=409, detail="All recipient handovers are already complete")
    alloc = allocations[completed_stops]
    allowed_quantity = alloc.accepted_meals or alloc.allocated_meals
    if req.verified_qty > allowed_quantity:
        raise HTTPException(status_code=400, detail="Verified quantity exceeds the recipient's accepted allocation")
    if not alloc:
        raise HTTPException(status_code=400, detail="No valid donation allocation found for mission handover")

    handover = Handover(
        mission_id=mission.id,
        allocation_id=alloc.id,
        verified_qty=req.verified_qty,
        temp_at_drop=req.temp_at_drop,
        recipient_otp=req.otp_code,
        receiver_name=req.receiver_name,
        notes=req.notes
    )
    db.add(handover)

    alloc.status = "DELIVERED"
    mission.current_stop_index = completed_stops + 1
    mission.status = (
        MissionStatusEnum.COMPLETED.value
        if completed_stops + 1 >= len(allocations)
        else MissionStatusEnum.HANDOVER_PENDING.value
    )
    if mission.status == MissionStatusEnum.COMPLETED.value:
        assignment_result = await db.execute(
            select(MissionAssignment).where(MissionAssignment.mission_id == mission.id)
        )
        for assignment in assignment_result.scalars().all():
            assignment.status = AssignmentStatusEnum.COMPLETED.value
            assignment.completed_at = datetime.utcnow()
        donation_result = await db.execute(
            select(Donation).options(selectinload(Donation.donor)).where(Donation.id == mission.donation_id)
        )
        donation = donation_result.scalars().first()
        if donation:
            donation.status = "DELIVERED"
            if donation.donor and donation.donor.user_id:
                from backend.app.services.notification_service import create_notification
                await create_notification(
                    db,
                    user_id=donation.donor.user_id,
                    title=f"Donation {donation.code} delivered",
                    message=f"Mission {mission.code} is complete. Your receipt is ready to download.",
                    type="SUCCESS",
                )

    evt = MissionEvent(
        mission_id=mission.id,
        event_type="DELIVERED",
        actor_id=current_user.id,
        actor_role="volunteer",
        description=f"Recipient handover verified for {req.verified_qty} meals."
    )
    db.add(evt)

    await log_audit_event(
        db,
        action="VERIFY_HANDOVER_OTP",
        entity_type="Mission",
        entity_id=mission.id,
        user_id=current_user.id,
        details={"qty": req.verified_qty, "receiver": req.receiver_name, "allocation_id": alloc.id}
    )

    await db.commit()
    return {
        "success": True,
        "message": (
            "Handover verified! Mission completed."
            if mission.status == MissionStatusEnum.COMPLETED.value
            else "Handover verified! Continue to the next recipient."
        ),
        "status": mission.status,
        "mission_status": mission.status
    }

@router.get("/history")
async def get_volunteer_history(
    current_user: User = Depends(require_role(["volunteer"])),
    db: AsyncSession = Depends(get_db),
):
    vol_prof = current_user.volunteer_profile
    if not vol_prof:
        raise HTTPException(status_code=404, detail="Volunteer profile not found")
    result = await db.execute(
        select(Mission)
        .join(MissionAssignment, MissionAssignment.mission_id == Mission.id)
        .options(selectinload(Mission.donation).selectinload(Donation.donor))
        .where(
            MissionAssignment.volunteer_id == vol_prof.id,
            Mission.status == MissionStatusEnum.COMPLETED.value,
        )
        .order_by(Mission.updated_at.desc())
    )
    return [
        {
            "id": mission.code,
            "uuid": mission.id,
            "name": (
                mission.donation.donor.organization_name
                if mission.donation and mission.donation.donor
                else "Donor"
            ),
            "food": mission.donation.title if mission.donation else "Donation",
            "quantity": f"{mission.total_meals} meals",
            "stops": f"{mission.total_stops} stops",
            "status": "Delivered",
            "tone": "green",
            "date": mission.updated_at.strftime("%d %b %Y"),
        }
        for mission in result.scalars().all()
    ]

from pydantic import BaseModel

class VolunteerLocationPayload(BaseModel):
    mission_id: Optional[str] = None
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    battery_level: Optional[int] = None

@router.post("/location")
async def update_volunteer_location(
    req: VolunteerLocationPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    vol_prof = current_user.volunteer_profile
    if not vol_prof:
        res = await db.execute(select(VolunteerProfile).limit(1))
        vol_prof = res.scalars().first()

    if vol_prof:
        vol_prof.current_lat = req.latitude
        vol_prof.current_lng = req.longitude
        if req.battery_level is not None:
            vol_prof.battery_level = req.battery_level
        await db.commit()

    return {
        "success": True,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "updated_at": datetime.utcnow().isoformat()
    }
