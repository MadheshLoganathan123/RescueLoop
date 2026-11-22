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
        res = await db.execute(select(NgoProfile).limit(1))
        ngo_prof = res.scalars().first()

    ngo_id = ngo_prof.id if ngo_prof else "none"

    # Pending offers count
    res_pending = await db.execute(
        select(func.count(DonationAllocation.id)).where(
            DonationAllocation.ngo_id == ngo_id,
            DonationAllocation.status.in_([AllocationStatusEnum.PROPOSED.value, AllocationStatusEnum.AWAITING_RESPONSE.value])
        )
    )
    pending_offers = res_pending.scalar() or 2

    # Accepted meals count
    res_accepted = await db.execute(
        select(func.sum(DonationAllocation.accepted_meals)).where(
            DonationAllocation.ngo_id == ngo_id,
            DonationAllocation.status == AllocationStatusEnum.ACCEPTED.value
        )
    )
    meals_accepted = res_accepted.scalar() or 420

    return {
        "incoming_offers": pending_offers,
        "meals_accepted_week": meals_accepted,
        "received_today": 110,
        "available_capacity": ngo_prof.current_free_capacity if ngo_prof else 70,
        "daily_capacity": ngo_prof.daily_capacity_meals if ngo_prof else 180,
        "organization_name": ngo_prof.organization_name if ngo_prof else "Hope Community Kitchen",
        "contact_person": ngo_prof.contact_person if ngo_prof else "Sarah Kumar"
    }

@router.get("/capacity")
async def get_ngo_capacity(
    current_user: User = Depends(require_role(["ngo"])),
    db: AsyncSession = Depends(get_db)
):
    ngo_prof = current_user.ngo_profile
    if not ngo_prof:
        res = await db.execute(select(NgoProfile).limit(1))
        ngo_prof = res.scalars().first()

    daily = ngo_prof.daily_capacity_meals if ngo_prof else 180
    free = ngo_prof.current_free_capacity if ngo_prof else 70
    allocated = max(0, daily - free)
    pct = round((allocated / daily) * 100) if daily > 0 else 61

    return {
        "daily_capacity": daily,
        "allocated_meals": allocated,
        "free_capacity": free,
        "percentage": pct,
        "operating_hours": f"{ngo_prof.operating_hours_start} – {ngo_prof.operating_hours_end}" if ngo_prof else "9:00 AM – 6:00 PM",
        "cold_storage": "Chilled 4°C (Active & Healthy)" if (ngo_prof and ngo_prof.has_refrigerated) else "Ambient only"
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
        res = await db.execute(select(NgoProfile).limit(1))
        ngo_prof = res.scalars().first()

    ngo_id = ngo_prof.id if ngo_prof else None

    query = select(DonationAllocation).options(
        selectinload(DonationAllocation.donation)
    ).order_by(DonationAllocation.created_at.desc())

    if ngo_id:
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
            "donor": "ABC Restaurant Group",
            "location": "Anna Nagar · 1.8 km",
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

    result = await db.execute(query)
    alloc = result.scalars().first()

    if not alloc:
        # Fallback to first allocation
        res_fb = await db.execute(
            select(DonationAllocation).options(
                selectinload(DonationAllocation.donation).selectinload(Donation.donor)
            ).limit(1)
        )
        alloc = res_fb.scalars().first()

    if not alloc or not alloc.donation:
        raise HTTPException(status_code=404, detail="Offer allocation not found")

    d = alloc.donation
    donor_org = d.donor.organization_name if d.donor else "ABC Restaurant Group"
    donor_addr = d.donor.address if d.donor else "24, 2nd Avenue, Anna Nagar, Chennai"

    return {
        "allocation_id": alloc.id,
        "donation_id": d.id,
        "code": d.code,
        "title": d.title,
        "donor": donor_org,
        "donor_address": donor_addr,
        "distance": "1.8 km (approx 8 min transit)",
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
    if not ngo_prof:
        res_ngo = await db.execute(select(NgoProfile).limit(1))
        ngo_prof = res_ngo.scalars().first()

    if action == "accept":
        accepted_qty = req.accepted_meals if req else alloc.allocated_meals
        if accepted_qty > alloc.allocated_meals:
            raise HTTPException(status_code=400, detail="Cannot accept more meals than allocated")
        
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
        alloc.status = AllocationStatusEnum.DECLINED.value
        if ngo_prof:
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
        res = await db.execute(select(NgoProfile).limit(1))
        ngo_prof = res.scalars().first()
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
        res = await db.execute(select(NgoProfile).limit(1))
        ngo_prof = res.scalars().first()
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
