import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, Float, DateTime, ForeignKey, Text, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
import enum

from backend.app.database import Base

class RoleEnum(str, enum.Enum):
    DONOR = "donor"
    NGO = "ngo"
    VOLUNTEER = "volunteer"
    OPS_ADMIN = "ops"

class DonationStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    MATCHING = "MATCHING"
    ALLOCATED = "ALLOCATED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class AllocationStatusEnum(str, enum.Enum):
    PROPOSED = "PROPOSED"
    AWAITING_RESPONSE = "AWAITING_RESPONSE"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class MissionStatusEnum(str, enum.Enum):
    DISPATCHING = "DISPATCHING"
    ASSIGNED = "ASSIGNED"
    PICKUP_UNDERWAY = "PICKUP_UNDERWAY"
    IN_TRANSIT = "IN_TRANSIT"
    HANDOVER_PENDING = "HANDOVER_PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    EXCEPTION = "EXCEPTION"

class AssignmentStatusEnum(str, enum.Enum):
    OFFERED = "OFFERED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class AgentTypeEnum(str, enum.Enum):
    INTAKE = "INTAKE"
    MATCHING = "MATCHING"
    DISPATCH = "DISPATCH"
    RECOVERY = "RECOVERY"
    ORCHESTRATOR = "ORCHESTRATOR"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), default=RoleEnum.DONOR.value, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    donor_profile = relationship("DonorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    ngo_profile = relationship("NgoProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    volunteer_profile = relationship("VolunteerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class DonorProfile(Base):
    __tablename__ = "donor_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    organization_name = Column(String(255), nullable=False)
    kitchen_type = Column(String(100), default="Commercial Kitchen")
    address = Column(String(255), nullable=False)
    latitude = Column(Float, default=13.0850)
    longitude = Column(Float, default=80.2101)
    contact_person = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    fssai_license = Column(String(100), nullable=True)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="donor_profile")
    donations = relationship("Donation", back_populates="donor", cascade="all, delete-orphan")


class NgoProfile(Base):
    __tablename__ = "ngo_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    organization_name = Column(String(255), nullable=False)
    address = Column(String(255), nullable=False)
    latitude = Column(Float, default=13.0830)
    longitude = Column(Float, default=80.2150)
    contact_person = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    daily_capacity_meals = Column(Integer, default=180)
    current_free_capacity = Column(Integer, default=70)
    operating_hours_start = Column(String(20), default="09:00 AM")
    operating_hours_end = Column(String(20), default="06:00 PM")
    has_refrigerated = Column(Boolean, default=True)
    has_ambient = Column(Boolean, default=True)
    has_frozen = Column(Boolean, default=False)
    has_certified_staff = Column(Boolean, default=True)
    dietary_preferences = Column(String(255), default="Vegetarian preferred; no alcohol-based ingredients")
    service_area_zones = Column(String(255), default="Anna Nagar, Kilpauk, Shenoy Nagar, Aminjikarai")
    special_instructions = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="ngo_profile")
    allocations = relationship("DonationAllocation", back_populates="ngo", cascade="all, delete-orphan")


class VolunteerProfile(Base):
    __tablename__ = "volunteer_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    vehicle_type = Column(String(50), default="Two-wheeler")
    vehicle_plate = Column(String(50), default="TN-02-AL-4491")
    max_meal_capacity = Column(Integer, default=40)
    is_available = Column(Boolean, default=True, index=True)
    current_lat = Column(Float, default=13.0870)
    current_lng = Column(Float, default=80.2120)
    rating = Column(Float, default=4.98)
    completed_missions = Column(Integer, default=27)
    meals_delivered = Column(Integer, default=1120)
    certified_handler = Column(Boolean, default=True)
    battery_level = Column(Integer, default=85)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="volunteer_profile")
    assignments = relationship("MissionAssignment", back_populates="volunteer", cascade="all, delete-orphan")


class Donation(Base):
    __tablename__ = "donations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, nullable=False, index=True)
    donor_id = Column(String(36), ForeignKey("donor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    food_category = Column(String(100), nullable=False)
    quantity_meals = Column(Integer, nullable=False)
    prep_time = Column(DateTime, nullable=False)
    latest_pickup_time = Column(DateTime, nullable=False)
    packaging_type = Column(String(100), nullable=False)
    storage_temp = Column(String(100), nullable=False)
    allergens = Column(String(255), nullable=True)
    handling_notes = Column(Text, nullable=True)
    pickup_address = Column(String(255), nullable=False)
    on_site_contact = Column(String(100), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    status = Column(String(30), default=DonationStatusEnum.SUBMITTED.value, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    donor = relationship("DonorProfile", back_populates="donations")
    allocations = relationship("DonationAllocation", back_populates="donation", cascade="all, delete-orphan")
    missions = relationship("Mission", back_populates="donation", cascade="all, delete-orphan")


class DonationAllocation(Base):
    __tablename__ = "donation_allocations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    donation_id = Column(String(36), ForeignKey("donations.id", ondelete="CASCADE"), nullable=False, index=True)
    ngo_id = Column(String(36), ForeignKey("ngo_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    allocated_meals = Column(Integer, nullable=False)
    accepted_meals = Column(Integer, default=0)
    status = Column(String(30), default=AllocationStatusEnum.PROPOSED.value, nullable=False, index=True)
    delivery_window = Column(String(100), default="03:30 - 05:00 PM")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    donation = relationship("Donation", back_populates="allocations")
    ngo = relationship("NgoProfile", back_populates="allocations")
    handovers = relationship("Handover", back_populates="allocation", cascade="all, delete-orphan")


class Mission(Base):
    __tablename__ = "missions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, nullable=False, index=True)
    donation_id = Column(String(36), ForeignKey("donations.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(30), default=MissionStatusEnum.DISPATCHING.value, nullable=False, index=True)
    total_meals = Column(Integer, nullable=False)
    total_stops = Column(Integer, default=1)
    current_stop_index = Column(Integer, default=0)
    deadline = Column(DateTime, nullable=False)
    estimated_pickup = Column(DateTime, nullable=True)
    estimated_drop = Column(DateTime, nullable=True)
    otp_code = Column(String(10), default="4492")
    is_cold_chain_safe = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    donation = relationship("Donation", back_populates="missions")
    assignments = relationship("MissionAssignment", back_populates="mission", cascade="all, delete-orphan")
    events = relationship("MissionEvent", back_populates="mission", cascade="all, delete-orphan")
    agent_runs = relationship("AgentRun", back_populates="mission", cascade="all, delete-orphan")
    exceptions = relationship("ExceptionRecord", back_populates="mission", cascade="all, delete-orphan")
    handovers = relationship("Handover", back_populates="mission", cascade="all, delete-orphan")


class MissionAssignment(Base):
    __tablename__ = "mission_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mission_id = Column(String(36), ForeignKey("missions.id", ondelete="CASCADE"), nullable=False, index=True)
    volunteer_id = Column(String(36), ForeignKey("volunteer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(30), default=AssignmentStatusEnum.OFFERED.value, nullable=False, index=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    mission = relationship("Mission", back_populates="assignments")
    volunteer = relationship("VolunteerProfile", back_populates="assignments")


class MissionEvent(Base):
    __tablename__ = "mission_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mission_id = Column(String(36), ForeignKey("missions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    actor_id = Column(String(36), nullable=True)
    actor_role = Column(String(20), nullable=True)
    description = Column(String(255), nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    mission = relationship("Mission", back_populates="events")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mission_id = Column(String(36), ForeignKey("missions.id", ondelete="CASCADE"), nullable=True, index=True)
    agent_name = Column(String(30), nullable=False)
    status = Column(String(30), default="COMPLETED")
    input_summary = Column(Text, nullable=False)
    decision_output = Column(Text, nullable=False)
    execution_ms = Column(Integer, default=150)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    mission = relationship("Mission", back_populates="agent_runs")


class ExceptionRecord(Base):
    __tablename__ = "exception_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mission_id = Column(String(36), ForeignKey("missions.id", ondelete="CASCADE"), nullable=True, index=True)
    exception_type = Column(String(100), nullable=False)
    severity = Column(String(20), default="HIGH")  # LOW, MEDIUM, HIGH, CRITICAL
    description = Column(Text, nullable=False)
    resolution_status = Column(String(30), default="OPEN", index=True)  # OPEN, IN_REVIEW, RESOLVED, DISMISSED
    resolved_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mission = relationship("Mission", back_populates="exceptions")


class Handover(Base):
    __tablename__ = "handovers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mission_id = Column(String(36), ForeignKey("missions.id", ondelete="CASCADE"), nullable=False, index=True)
    allocation_id = Column(String(36), ForeignKey("donation_allocations.id", ondelete="CASCADE"), nullable=False, index=True)
    verified_qty = Column(Integer, nullable=False)
    temp_at_drop = Column(Float, default=3.8)
    recipient_otp = Column(String(10), nullable=False)
    receiver_name = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, default=datetime.utcnow)

    mission = relationship("Mission", back_populates="handovers")
    allocation = relationship("DonationAllocation", back_populates="handovers")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(30), default="INFO")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=True)
    ip_address = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")
