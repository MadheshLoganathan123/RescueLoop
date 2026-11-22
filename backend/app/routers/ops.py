from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.entities import (
    User, Mission, Donation, DonationAllocation, VolunteerProfile,
    NgoProfile, DonorProfile, ExceptionRecord, AuditLog, AgentRun,
    MissionEvent, MissionAssignment, MissionStatusEnum, AssignmentStatusEnum
)
from backend.app.models.schemas import TelemetryNode
from backend.app.models.schemas import ExceptionResolutionRequest
from backend.app.auth.dependencies import get_current_user, require_role
from backend.app.services.audit_service import log_audit_event
from backend.app.agents.orchestrator import AgentOrchestrator

router = APIRouter(prefix="/ops", tags=["Operations Console"])

@router.get("/network-stats")
async def get_network_stats(
    current_user: User = Depends(require_role(["ops"])),
    db: AsyncSession = Depends(get_db)
):
    # Live mission counts
    res_active = await db.execute(
        select(func.count(Mission.id)).where(
            Mission.status.in_([
                MissionStatusEnum.DISPATCHING.value,
                MissionStatusEnum.ASSIGNED.value,
                MissionStatusEnum.PICKUP_UNDERWAY.value,
                MissionStatusEnum.IN_TRANSIT.value,
                MissionStatusEnum.HANDOVER_PENDING.value
            ])
        )
    )
    active_missions = res_active.scalar() or 0

    # Active volunteer couriers online
    res_vol = await db.execute(
        select(func.count(VolunteerProfile.id)).where(VolunteerProfile.is_available == True)
    )
    active_couriers = res_vol.scalar() or 0

    start_of_day = datetime.combine(datetime.utcnow().date(), datetime.min.time())
    res_completed = await db.execute(
        select(func.count(Mission.id)).where(
            Mission.status == MissionStatusEnum.COMPLETED.value,
            Mission.updated_at >= start_of_day,
        )
    )
    completed_today = res_completed.scalar() or 0

    res_exc = await db.execute(
        select(func.count(ExceptionRecord.id)).where(ExceptionRecord.resolution_status == "OPEN")
    )
    open_exceptions = res_exc.scalar() or 0

    res_meals = await db.execute(
        select(func.sum(Mission.total_meals)).where(
            Mission.status.in_([
                MissionStatusEnum.DISPATCHING.value,
                MissionStatusEnum.ASSIGNED.value,
            ])
        )
    )
    meals_awaiting_pickup = res_meals.scalar() or 0
    res_safe = await db.execute(
        select(func.count(Mission.id)).where(
            Mission.status == MissionStatusEnum.COMPLETED.value,
            Mission.updated_at >= start_of_day,
            Mission.is_cold_chain_safe.is_(True),
        )
    )
    on_time_rate = round((res_safe.scalar() or 0) * 100 / completed_today, 1) if completed_today else 0
    res_donations = await db.execute(select(func.count(Donation.id)))
    donation_count = res_donations.scalar() or 0
    res_missions = await db.execute(select(func.count(Mission.id)))
    mission_count = res_missions.scalar() or 0
    auto_match_rate = round(mission_count * 100 / donation_count, 1) if donation_count else 0

    return {
        "active_missions": active_missions,
        "meals_awaiting_pickup": meals_awaiting_pickup,
        "active_fleet_couriers": active_couriers,
        "completed_today": completed_today,
        "open_exceptions": open_exceptions,
        "on_time_freshness_rate": f"{on_time_rate}%",
        "auto_match_rate": f"{auto_match_rate}%",
        "daily_co2_saved_kg": None
    }

@router.get("/telemetry/map")
async def get_map_telemetry(
    current_user: User = Depends(require_role(["ops"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns live GPS coordinates and telemetry for all network nodes:
    Donors, Active Couriers, and NGO Receiver Hubs.
    """
    nodes = []
    donors = (await db.execute(select(DonorProfile))).scalars().all()
    volunteers = (await db.execute(
        select(VolunteerProfile).options(selectinload(VolunteerProfile.user))
    )).scalars().all()
    ngos = (await db.execute(select(NgoProfile))).scalars().all()

    for donor in donors:
        nodes.append({
            "id": donor.id,
            "type": "donor",
            "name": donor.organization_name,
            "lat": donor.latitude,
            "lng": donor.longitude,
            "status": "Active" if donor.is_verified else "Unverified",
            "metric": donor.address,
        })
    for volunteer in volunteers:
        nodes.append({
            "id": volunteer.id,
            "type": "volunteer",
            "name": volunteer.user.full_name if volunteer.user else "Volunteer",
            "lat": volunteer.current_lat,
            "lng": volunteer.current_lng,
            "status": "Available" if volunteer.is_available else "Unavailable",
            "metric": volunteer.vehicle_type,
        })
    for ngo in ngos:
        nodes.append({
            "id": ngo.id,
            "type": "ngo",
            "name": ngo.organization_name,
            "lat": ngo.latitude,
            "lng": ngo.longitude,
            "status": "Active" if ngo.is_verified else "Unverified",
            "metric": f"{ngo.current_free_capacity} meals capacity",
        })
    return nodes

@router.get("/missions")
async def get_missions_queue(
    status_filter: Optional[str] = "all",
    q: Optional[str] = None,
    current_user: User = Depends(require_role(["ops"])),
    db: AsyncSession = Depends(get_db)
):
    query = select(Mission).options(
        selectinload(Mission.donation).selectinload(Donation.donor),
        selectinload(Mission.assignments).selectinload(MissionAssignment.volunteer).selectinload(VolunteerProfile.user)
    ).order_by(Mission.created_at.desc())

    result = await db.execute(query)
    missions = result.scalars().all()

    items = []
    for m in missions:
        d = m.donation
        donor_name = d.donor.organization_name if d and d.donor else "Donor"
        if d and d.pickup_address:
            donor_name = f"{donor_name} · {d.pickup_address}"

        courier_name = "Unassigned"
        if m.assignments:
            asgn = m.assignments[0]
            if asgn.volunteer and asgn.volunteer.user:
                courier_name = asgn.volunteer.user.full_name

        tone = "green" if m.status == "COMPLETED" else "amber" if m.status == "IN_TRANSIT" else "blue" if m.status == "ASSIGNED" else "red"
        status_label = m.status.replace("_", " ").title()

        if q and q.lower() not in m.code.lower() and q.lower() not in donor_name.lower() and q.lower() not in courier_name.lower():
            continue

        if status_filter == "transit" and "Transit" not in status_label:
            continue
        if status_filter == "unassigned" and "Unassigned" not in courier_name and "Dispatching" not in status_label:
            continue
        if status_filter == "completed" and "Completed" not in status_label and "Delivered" not in status_label:
            continue

        items.append({
            "id": m.code,
            "uuid": m.id,
            "donor": donor_name,
            "quantity": f"{m.total_meals} meals",
            "stops": f"{m.total_stops}",
            "status": status_label,
            "tone": tone,
            "courier": courier_name,
            "deadline": m.deadline.strftime("%I:%M %p") if m.deadline else None
        })
    return items

@router.get("/missions/{mission_id}")
async def get_mission_inspection(
    mission_id: str,
    current_user: User = Depends(require_role(["ops"])),
    db: AsyncSession = Depends(get_db)
):
    query = select(Mission).options(
        selectinload(Mission.donation).selectinload(Donation.allocations).selectinload(DonationAllocation.ngo),
        selectinload(Mission.assignments).selectinload(MissionAssignment.volunteer).selectinload(VolunteerProfile.user),
        selectinload(Mission.agent_runs),
        selectinload(Mission.events)
    )

    mission_filter = Mission.code == mission_id if mission_id.startswith("RL-") else Mission.id == mission_id
    result = await db.execute(query.where(mission_filter))

    mission = result.scalars().first()

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    d = mission.donation
    courier_info = {"name": None, "phone": None, "vehicle": None, "battery": None, "eta": None}
    if mission.assignments:
        asgn = mission.assignments[0]
        if asgn.volunteer and asgn.volunteer.user:
            courier_info["name"] = asgn.volunteer.user.full_name
            courier_info["phone"] = asgn.volunteer.user.phone
            courier_info["vehicle"] = asgn.volunteer.vehicle_type

    # Allocations
    allocations_list = []
    if d and d.allocations:
        for a in d.allocations:
            allocations_list.append({
                "recipient": a.ngo.organization_name if a.ngo else None,
                "address": a.ngo.address if a.ngo else None,
                "requested": f"{a.allocated_meals}",
                "allocated": f"{a.allocated_meals} meals",
                "status": a.status,
                "arrival": None
            })

    # Agent runs
    agent_runs_list = []
    for ar in mission.agent_runs:
        agent_runs_list.append({
            "agent": ar.agent_name,
            "title": f"{ar.agent_name.title()} Agent: {ar.decision_output[:80]}...",
            "full_decision": ar.decision_output,
            "time": ar.created_at.strftime("%I:%M %p")
        })

    return {
        "id": mission.id,
        "code": mission.code,
        "title": d.title if d else "Surplus Meals",
        "created_at": mission.created_at.strftime("%I:%M %p"),
        "total_meals": mission.total_meals,
        "total_stops": mission.total_stops,
        "status": mission.status,
        "courier": courier_info,
        "allocations": allocations_list,
        "agent_runs": agent_runs_list
    }

@router.post("/missions/{mission_id}/reassign")
async def reassign_volunteer(
    mission_id: str,
    current_user: User = Depends(require_role(["ops"])),
    db: AsyncSession = Depends(get_db)
):
    mission_filter = Mission.code == mission_id if mission_id.startswith("RL-") else Mission.id == mission_id
    result = await db.execute(select(Mission).where(mission_filter))
    mission = result.scalars().first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    reassigned = await AgentOrchestrator.run_recovery_agent(
        db, mission, reason="Manual Operations dispatcher reassignment request"
    )

    await log_audit_event(
        db,
        action="OPS_REASSIGN_COURIER",
        entity_type="Mission",
        entity_id=mission.id,
        user_id=current_user.id,
        details={"reassigned": reassigned}
    )
    await db.commit()
    return {"message": "Standby volunteer courier assigned successfully." if reassigned else "Reassignment escalated to support."}

@router.post("/missions/{mission_id}/abort")
async def abort_mission(
    mission_id: str,
    current_user: User = Depends(require_role(["ops"])),
    db: AsyncSession = Depends(get_db)
):
    mission_filter = Mission.code == mission_id if mission_id.startswith("RL-") else Mission.id == mission_id
    result = await db.execute(select(Mission).where(mission_filter))
    mission = result.scalars().first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    mission.status = MissionStatusEnum.CANCELLED.value
    donation_result = await db.execute(select(Donation).where(Donation.id == mission.donation_id))
    donation = donation_result.scalars().first()
    if donation:
        donation.status = "CANCELLED"
    assignment_result = await db.execute(
        select(MissionAssignment).where(MissionAssignment.mission_id == mission.id)
    )
    for assignment in assignment_result.scalars().all():
        assignment.status = AssignmentStatusEnum.FAILED.value
    await log_audit_event(
        db,
        action="OPS_ABORT_MISSION",
        entity_type="Mission",
        entity_id=mission.id,
        user_id=current_user.id,
        details={"reason": "Emergency operational abort"}
    )
    await db.commit()
    return {"message": f"Mission {mission.code} has been aborted."}

@router.get("/exceptions")
async def get_exceptions(
    current_user: User = Depends(require_role(["ops"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ExceptionRecord).order_by(ExceptionRecord.created_at.desc())
    )
    records = result.scalars().all()
    
    items = []
    for r in records:
        items.append({
            "id": r.id,
            "type": r.exception_type,
            "severity": r.severity,
            "description": r.description,
            "status": r.resolution_status,
            "created_at": r.created_at.strftime("%I:%M %p")
        })

    return items

@router.post("/exceptions/{exception_id}/resolve")
async def resolve_exception(
    exception_id: str,
    req: ExceptionResolutionRequest,
    current_user: User = Depends(require_role(["ops"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExceptionRecord).where(ExceptionRecord.id == exception_id)
    )
    record = result.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Exception record not found")
    if record.resolution_status in ("RESOLVED", "DISMISSED"):
        raise HTTPException(status_code=409, detail="Exception has already been resolved")

    record.resolution_status = req.resolution_status
    record.resolved_by = current_user.id
    await log_audit_event(
        db,
        action="RESOLVE_EXCEPTION",
        entity_type="ExceptionRecord",
        entity_id=record.id,
        user_id=current_user.id,
        details={
            "resolution_status": req.resolution_status,
            "action_taken": req.action_taken,
        },
    )
    await db.commit()
    return {
        "id": record.id,
        "resolution_status": record.resolution_status,
        "resolved_by": record.resolved_by,
    }

@router.get("/audit-trail")
async def get_audit_trail(
    limit: int = 50,
    current_user: User = Depends(require_role(["ops"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    )
    logs = result.scalars().all()

    items = []
    for log in logs:
        items.append({
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "timestamp": log.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    return items
