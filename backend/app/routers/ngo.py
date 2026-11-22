from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.entities import (
    User, NgoProfile, DonationAllocation, Donation, Mission,
    AllocationStatusEnum
)
from backend.app.models.schemas import (
    OfferResponseRequest, NgoPreferencesUpdate, NgoProfileOut
)
from backend.app.auth.dependencies import get_current_user, require_role
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/ngo", tags=["NGO Workspace"])

@router.get("/dashboard-stats")
async def get_ngo_dashboard_stats(
    current_user: User = Depends(require_role(["ngo"])),
    db: AsyncSession = Depends(get_db)
):
    ngo_prof = current_user.ngo_profile
    if not ngo_prof:
        raise HTTPException(status_code=404, detail="NGO profile not found")
    ngo_id = ngo_prof.id

    # Pending offers count
    res_pending = await db.execute(
        select(func.count(DonationAllocation.id)).where(
            DonationAllocation.ngo_id == ngo_id,
            DonationAllocation.status.in_([AllocationStatusEnum.PROPOSED.value, AllocationStatusEnum.AWAITING_RESPONSE.value])
        )
    )
    pending_offers = res_pending.scalar() or 0

    # Accepted meals count
    res_accepted = await db.execute(
        select(func.sum(DonationAllocation.accepted_meals)).where(
            DonationAllocation.ngo_id == ngo_id,
            DonationAllocation.status == AllocationStatusEnum.ACCEPTED.value
        )
    )
    meals_accepted = res_accepted.scalar() or 0
    res_received = await db.execute(
        select(func.sum(DonationAllocation.accepted_meals)).where(
            DonationAllocation.ngo_id == ngo_id,
            DonationAllocation.status == AllocationStatusEnum.DELIVERED.value,
        )
    )
    meals_received = res_received.scalar() or 0

    return {
        "incoming_offers": pending_offers,
        "meals_accepted_week": meals_accepted,
        "received_today": meals_received,
        "available_capacity": ngo_prof.current_free_capacity,
        "daily_capacity": ngo_prof.daily_capacity_meals,
        "organization_name": ngo_prof.organization_name,
        "contact_person": ngo_prof.contact_person
    }

@router.get("/capacity")
async def get_ngo_capacity(
    current_user: User = Depends(require_role(["ngo"])),
    db: AsyncSession = Depends(get_db)
):
    ngo_prof = current_user.ngo_profile
    if not ngo_prof:
        raise HTTPException(status_code=404, detail="NGO profile not found")
    daily = ngo_prof.daily_capacity_meals
    free = ngo_prof.current_free_capacity
    allocated = max(0, daily - free)
    pct = round((allocated / daily) * 100) if daily > 0 else 0

    return {
        "daily_capacity": daily,
        "allocated_meals": allocated,
        "free_capacity": free,
        "percentage": pct,
        "operating_hours": f"{ngo_prof.operating_hours_start} – {ngo_prof.operating_hours_end}",
        "cold_storage": "Chilled storage available" if ngo_prof.has_refrigerated else "Ambient storage only"
    }

@router.get("/offers")
async def get_incoming_offers(
    status_filter: Optional[str] = "all",
    q: Optional[str] = None,
    current_user: User = Depends(require_role(["ngo"])),
    db: AsyncSession = Depends(get_db)
):
    ngo_prof = current_user.ngo_profile
    if not ngo_prof:
        raise HTTPException(status_code=404, detail="NGO profile not found")
    ngo_id = ngo_prof.id

    query = select(DonationAllocation).options(
        selectinload(DonationAllocation.donation)
        .selectinload(Donation.donor)
    ).order_by(DonationAllocation.created_at.desc())

    query = query.where(DonationAllocation.ngo_id == ngo_id)

    result = await db.execute(query)
    allocations = result.scalars().all()

    items = []
    for a in allocations:
        d = a.donation
        if not d:
            continue

        if q and q.lower() not in d.title.lower() and q.lower() not in d.food_category.lower():
            continue

        status_text = "Awaiting response"
        tone = "amber"
        if a.status == AllocationStatusEnum.ACCEPTED.value:
            status_text = "Accepted"
            tone = "green"
        elif a.status == AllocationStatusEnum.DECLINED.value:
            status_text = "Declined"
            tone = "gray"
        elif a.status == AllocationStatusEnum.PROPOSED.value:
            status_text = "New offer"
            tone = "blue"

        if status_filter == "new" and "Awaiting" not in status_text and "New" not in status_text:
            continue
        if status_filter == "accepted" and "Accepted" not in status_text:
            continue
        if status_filter == "declined" and "Declined" not in status_text:
            continue

        items.append({
            "id": a.id,
            "donation_id": d.id,
            "code": d.code,
            "donor": d.donor.organization_name if d.donor else "Donor",
            "location": d.pickup_address,
            "food": d.title,
            "quantity": f"{a.allocated_meals} meals",
            "allocated_meals": a.allocated_meals,
            "window": a.delivery_window,
            "status": status_text,
            "tone": tone
        })
    return items

@router.get("/offers/{allocation_id}")
async def get_offer_details(
    allocation_id: str,
    current_user: User = Depends(require_role(["ngo"])),
    db: AsyncSession = Depends(get_db)
):
    query = select(DonationAllocation).options(
        selectinload(DonationAllocation.donation).selectinload(Donation.donor)
    ).where(DonationAllocation.id == allocation_id)
    ngo_prof = current_user.ngo_profile
    if current_user.role == "ngo":
        if not ngo_prof:
            raise HTTPException(status_code=404, detail="NGO profile not found")
        query = query.where(DonationAllocation.ngo_id == ngo_prof.id)

    result = await db.execute(query)
    alloc = result.scalars().first()

    if not alloc or not alloc.donation:
        raise HTTPException(status_code=404, detail="Offer allocation not found")

    d = alloc.donation
    donor_org = d.donor.organization_name if d.donor else None
    donor_addr = d.pickup_address

    return {
        "allocation_id": alloc.id,
        "donation_id": d.id,
        "code": d.code,
        "title": d.title,
        "donor": donor_org,
        "donor_address": donor_addr,
        "distance": None,
        "quantity_offered": alloc.allocated_meals,
        "prep_time": d.prep_time.strftime("%I:%M %p"),
        "pickup_window": d.latest_pickup_time.strftime("%I:%M %p"),
        "food_category": d.food_category,
        "packaging": d.packaging_type,
        "storage_temp": d.storage_temp,
        "allergens": d.allergens or "None reported",
        "current_status": alloc.status
    }

@router.post("/offers/{allocation_id}/respond")
async def respond_to_offer(
    allocation_id: str,
    action: str = Query(..., pattern="^(accept|decline)$"),
    req: Optional[OfferResponseRequest] = None,
    current_user: User = Depends(require_role(["ngo"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(DonationAllocation)
        .options(selectinload(DonationAllocation.donation))
        .where(DonationAllocation.id == allocation_id)
    )
    alloc = result.scalars().first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Offer allocation not found")

    ngo_prof = current_user.ngo_profile
    if not ngo_prof or alloc.ngo_id != ngo_prof.id:
        raise HTTPException(status_code=404, detail="Offer allocation not found")

    if action == "accept":
        if alloc.status == AllocationStatusEnum.ACCEPTED.value:
            return {
                "message": f"Accepted {alloc.accepted_meals} meals successfully.",
                "allocation_id": alloc.id,
                "status": alloc.status,
            }
        if alloc.status == AllocationStatusEnum.DECLINED.value:
            raise HTTPException(status_code=409, detail="A declined offer cannot be accepted")
        if alloc.status not in (
            AllocationStatusEnum.PROPOSED.value,
            AllocationStatusEnum.AWAITING_RESPONSE.value,
        ):
            raise HTTPException(status_code=409, detail="Offer has already been answered")
        accepted_qty = req.accepted_meals if req else alloc.allocated_meals
        if accepted_qty <= 0 or accepted_qty > alloc.allocated_meals:
            raise HTTPException(status_code=400, detail="Accepted meals must be between 1 and the offered quantity")
        
        alloc.accepted_meals = accepted_qty
        alloc.status = AllocationStatusEnum.ACCEPTED.value
        if req and req.delivery_window:
            alloc.delivery_window = req.delivery_window
        if req and req.notes:
            alloc.notes = req.notes

        # If accepted less than allocated, restore remaining capacity to shelter
        diff = alloc.allocated_meals - accepted_qty
        if diff > 0 and ngo_prof:
            ngo_prof.current_free_capacity += diff

        msg = f"Accepted {accepted_qty} meals successfully."
    else:
        if alloc.status == AllocationStatusEnum.DECLINED.value:
            return {
                "message": "Offer already declined.",
                "allocation_id": alloc.id,
                "status": alloc.status,
            }
        if alloc.status == AllocationStatusEnum.ACCEPTED.value:
            raise HTTPException(status_code=409, detail="An accepted offer cannot be declined")
        if alloc.status not in (
            AllocationStatusEnum.PROPOSED.value,
            AllocationStatusEnum.AWAITING_RESPONSE.value,
        ):
            raise HTTPException(status_code=409, detail="Offer has already been answered")
        alloc.status = AllocationStatusEnum.DECLINED.value
        ngo_prof.current_free_capacity += alloc.allocated_meals
        msg = "Offer declined. Operations dispatcher has been alerted to reroute."

    await log_audit_event(
        db,
        action=f"NGO_OFFER_{action.upper()}",
        entity_type="DonationAllocation",
        entity_id=alloc.id,
        user_id=current_user.id,
        details={"status": alloc.status, "accepted": alloc.accepted_meals}
    )

    await db.commit()
    return {"message": msg, "allocation_id": alloc.id, "status": alloc.status}

@router.get("/preferences", response_model=NgoProfileOut)
async def get_ngo_preferences(
    current_user: User = Depends(require_role(["ngo"])),
    db: AsyncSession = Depends(get_db)
):
    ngo_prof = current_user.ngo_profile
    if not ngo_prof:
        raise HTTPException(status_code=404, detail="NGO profile not found")
    return ngo_prof

@router.put("/preferences", response_model=NgoProfileOut)
async def update_ngo_preferences(
    req: NgoPreferencesUpdate,
    current_user: User = Depends(require_role(["ngo"])),
    db: AsyncSession = Depends(get_db)
):
    ngo_prof = current_user.ngo_profile
    if not ngo_prof:
        raise HTTPException(status_code=404, detail="NGO profile not found")

    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(ngo_prof, field, val)

    await log_audit_event(
        db,
        action="UPDATE_NGO_PREFERENCES",
        entity_type="NgoProfile",
        entity_id=ngo_prof.id,
        user_id=current_user.id,
        details={"daily_capacity": ngo_prof.daily_capacity_meals}
    )

    await db.commit()
    await db.refresh(ngo_prof)
    return ngo_prof

@router.get("/history")
async def get_ngo_history(
    current_user: User = Depends(require_role(["ngo"])),
    db: AsyncSession = Depends(get_db),
):
    ngo_prof = current_user.ngo_profile
    if not ngo_prof:
        raise HTTPException(status_code=404, detail="NGO profile not found")
    result = await db.execute(
        select(DonationAllocation)
        .options(selectinload(DonationAllocation.donation))
        .where(DonationAllocation.ngo_id == ngo_prof.id)
        .order_by(DonationAllocation.updated_at.desc())
    )
    return [
        {
            "id": allocation.donation.code if allocation.donation else allocation.id,
            "uuid": allocation.id,
            "name": allocation.donation.title if allocation.donation else "Donation",
            "food": allocation.donation.food_category if allocation.donation else "Food donation",
            "quantity": f"{allocation.accepted_meals or allocation.allocated_meals} meals",
            "status": allocation.status.replace("_", " ").title(),
            "tone": "green" if allocation.status == AllocationStatusEnum.DELIVERED.value else "amber",
            "date": allocation.updated_at.strftime("%d %b %Y"),
        }
        for allocation in result.scalars().all()
    ]
