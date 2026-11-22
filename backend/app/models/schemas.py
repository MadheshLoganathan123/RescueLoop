from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    full_name: str
    organization_name: Optional[str] = None
    user: Optional[Dict[str, Any]] = None

class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: int

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str  # donor, ngo, volunteer, ops
    phone: Optional[str] = None
    organization_name: Optional[str] = None
    address: Optional[str] = None
    vehicle_type: Optional[str] = None

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    organization_name: Optional[str] = None
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"

    class Config:
        from_attributes = True

# --- Donor & Donation Schemas ---
class DonationCreate(BaseModel):
    title: str
    food_category: str
    quantity_meals: int
    prep_time: Optional[datetime] = None
    latest_pickup_time: Optional[datetime] = None
    packaging_type: str = "Sealed individual food-grade containers"
    storage_temp: str = "Refrigerated (3.5°C)"
    allergens: Optional[str] = "None reported"
    handling_notes: Optional[str] = None
    pickup_address: Optional[str] = "24, 2nd Avenue, Anna Nagar, Chennai"
    on_site_contact: Optional[str] = "Kitchen Director"
    contact_phone: Optional[str] = "+91 98765 43210"

class DonationOut(BaseModel):
    id: str
    code: str
    donor_id: str
    title: str
    food_category: str
    quantity_meals: int
    prep_time: datetime
    latest_pickup_time: datetime
    packaging_type: str
    storage_temp: str
    allergens: Optional[str]
    handling_notes: Optional[str]
    pickup_address: str
    on_site_contact: str
    contact_phone: str
    status: str
    created_at: datetime
    allocations_count: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Allocation Schemas ---
class AllocationOut(BaseModel):
    id: str
    donation_id: str
    ngo_id: str
    ngo_name: Optional[str] = None
    ngo_address: Optional[str] = None
    allocated_meals: int
    accepted_meals: int
    status: str
    delivery_window: str
    notes: Optional[str]

    class Config:
        from_attributes = True

class OfferResponseRequest(BaseModel):
    accepted_meals: int
    delivery_window: Optional[str] = "04:15 PM"
    notes: Optional[str] = None

# --- NGO Capacity & Preferences ---
class NgoPreferencesUpdate(BaseModel):
    daily_capacity_meals: Optional[int] = None
    current_free_capacity: Optional[int] = None
    operating_hours_start: Optional[str] = None
    operating_hours_end: Optional[str] = None
    has_refrigerated: Optional[bool] = None
    has_ambient: Optional[bool] = None
    has_frozen: Optional[bool] = None
    has_certified_staff: Optional[bool] = None
    dietary_preferences: Optional[str] = None
    service_area_zones: Optional[str] = None
    special_instructions: Optional[str] = None

class NgoProfileOut(BaseModel):
    id: str
    organization_name: str
    address: str
    daily_capacity_meals: int
    current_free_capacity: int
    operating_hours_start: str
    operating_hours_end: str
    has_refrigerated: bool
    has_ambient: bool
    has_frozen: bool
    has_certified_staff: bool
    dietary_preferences: str
    service_area_zones: str
    special_instructions: Optional[str]

    class Config:
        from_attributes = True

# --- Volunteer & Tasks ---
class VolunteerAvailabilityUpdate(BaseModel):
    is_available: bool

class TaskStepUpdate(BaseModel):
    step: int  # 1: heading to donor, 2: inspect & collect, 3: in transit, 4: handover
    inspections_passed: Optional[bool] = True
    temp_checked: Optional[float] = 3.8
    notes: Optional[str] = None

class HandoverVerifyRequest(BaseModel):
    otp_code: str
    verified_qty: int
    receiver_name: str
    temp_at_drop: Optional[float] = 3.8
    notes: Optional[str] = None

# --- Mission Schemas ---
class MissionOut(BaseModel):
    id: str
    code: str
    donation_id: str
    donation_title: Optional[str] = None
    donor_name: Optional[str] = None
    status: str
    total_meals: int
    total_stops: int
    current_stop_index: int
    deadline: datetime
    estimated_pickup: Optional[datetime]
    otp_code: str
    is_cold_chain_safe: bool
    volunteer_name: Optional[str] = None
    volunteer_phone: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- AI Extract Request ---
class AiIntakeRequest(BaseModel):
    prompt: str

class AiIntakeResponse(BaseModel):
    title: str
    food_category: str
    quantity_meals: int
    packaging_type: str
    storage_temp: str
    allergens: str
    handling_notes: str
    estimated_shelf_life_hours: int

# --- Operational / Telemetry Map ---
class TelemetryNode(BaseModel):
    id: str
    type: str  # donor, volunteer, ngo
    name: str
    lat: float
    lng: float
    status: str
    metric: str
