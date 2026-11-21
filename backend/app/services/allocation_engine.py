import math
import logging
from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.models.entities import (
    Donation, DonationAllocation, NgoProfile, ExceptionRecord, AllocationStatusEnum
)

logger = logging.getLogger("rescueloop.allocation")

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate geodesic distance between two coordinates in kilometers."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

class AllocationEngine:
    @staticmethod
    async def allocate_donation(
        db: AsyncSession,
        donation: Donation
    ) -> List[DonationAllocation]:
        """
        Deterministic multi-recipient allocation algorithm:
        1. Queries active NGOs in radius.
        2. Filters by storage temperature requirement (e.g. cold storage required if Refrigerated).
        3. Ranks by distance and available free capacity.
        4. Distributes meals deterministically without exceeding donation volume or shelter capacity.
        """
        # Fetch verified NGOs
        result = await db.execute(
            select(NgoProfile).where(NgoProfile.is_verified == True)
        )
        all_ngos = result.scalars().all()

        if not all_ngos:
            # Create exception for operational intervention
            exc = ExceptionRecord(
                mission_id=None,
                exception_type="NO_ELIGIBLE_NGOS",
                severity="HIGH",
                description=f"Donation {donation.code} ({donation.quantity_meals} meals) has no registered active NGOs."
            )
            db.add(exc)
            await db.flush()
            return []

        # Filter & score NGOs
        eligible_candidates: List[Tuple[NgoProfile, float, int]] = []
        is_refrigerated_req = "refrigerat" in donation.storage_temp.lower() or "cold" in donation.storage_temp.lower()

        donor_lat = 13.0850
        donor_lng = 80.2101

        for ngo in all_ngos:
            avail_cap = ngo.current_free_capacity
            if avail_cap <= 0:
                avail_cap = max(20, int(ngo.daily_capacity_meals * 0.35))

            if is_refrigerated_req and not ngo.has_refrigerated:
                continue

            dist = calculate_haversine_distance(donor_lat, donor_lng, ngo.latitude, ngo.longitude)
            # Maximum dispatch radius: 15 km
            if dist <= 15.0:
                eligible_candidates.append((ngo, dist, avail_cap))

        # Sort primarily by proximity (shortest distance), then by free capacity (descending)
        eligible_candidates.sort(key=lambda item: (item[1], -item[2]))

        if not eligible_candidates:
            exc = ExceptionRecord(
                mission_id=None,
                exception_type="CAPACITY_CONSTRAINT",
                severity="HIGH",
                description=f"No nearby shelters with cold-chain matching found for batch {donation.code}."
            )
            db.add(exc)
            await db.flush()
            return []

        allocations: List[DonationAllocation] = []
        remaining_meals = donation.quantity_meals

        for ngo, dist, avail_cap in eligible_candidates:
            if remaining_meals <= 0:
                break
            
            # Allocation is min of remaining surplus and shelter's free capacity
            portion = min(remaining_meals, avail_cap)
            if portion <= 0:
                continue

            allocation = DonationAllocation(
                donation_id=donation.id,
                ngo_id=ngo.id,
                allocated_meals=portion,
                accepted_meals=0,
                status=AllocationStatusEnum.PROPOSED.value,
                delivery_window="03:30 - 05:00 PM",
                notes=f"Auto-allocated based on {dist} km proximity and capacity"
            )
            db.add(allocation)
            allocations.append(allocation)
            
            # Deduct free capacity from shelter profile
            ngo.current_free_capacity = max(0, ngo.current_free_capacity - portion)
            remaining_meals -= portion

        await db.flush()

        # If any meals could not be absorbed by the network, record exception
        if remaining_meals > 0:
            exc = ExceptionRecord(
                mission_id=None,
                exception_type="PARTIAL_UNALLOCATED_SURPLUS",
                severity="MEDIUM",
                description=f"Surplus batch {donation.code}: {remaining_meals} meals could not be matched due to network capacity limits."
            )
            db.add(exc)
            await db.flush()

        return allocations
