from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.models.entities import User, DonorProfile, NgoProfile, VolunteerProfile, RoleEnum
from backend.app.models.schemas import LoginRequest, Token, UserCreate, UserOut
from backend.app.auth.security import verify_password, get_password_hash, create_access_token
from backend.app.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.donor_profile),
            selectinload(User.ngo_profile),
            selectinload(User.volunteer_profile)
        )
        .where(User.email == req.email.lower().strip())
    )
    user = result.scalars().first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    org_name = None
    if user.role == "donor" and user.donor_profile:
        org_name = user.donor_profile.organization_name
    elif user.role == "ngo" and user.ngo_profile:
        org_name = user.ngo_profile.organization_name
    elif user.role == "volunteer":
        org_name = "City Rescue Volunteers"
    elif user.role == "ops":
        org_name = "RescueLoop Command Central"

    token = create_access_token(subject=user.id, role=user.role)
    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        organization_name=org_name
    )

@router.post("/register", response_model=UserOut)
async def register(req: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    existing = await db.execute(select(User).where(User.email == req.email.lower().strip()))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="User with this email already registered")

    new_user = User(
        email=req.email.lower().strip(),
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=req.role.lower(),
        phone=req.phone
    )
    db.add(new_user)
    await db.flush()

    org_name = req.organization_name or f"{req.full_name}'s Organization"
    address = req.address or "Anna Nagar, Chennai"

    if new_user.role == "donor":
        donor_prof = DonorProfile(
            user_id=new_user.id,
            organization_name=org_name,
            address=address,
            contact_person=new_user.full_name,
            contact_phone=new_user.phone or "+91 98765 43210"
        )
        db.add(donor_prof)
    elif new_user.role == "ngo":
        ngo_prof = NgoProfile(
            user_id=new_user.id,
            organization_name=org_name,
            address=address,
            contact_person=new_user.full_name,
            contact_phone=new_user.phone or "+91 98402 44550"
        )
        db.add(ngo_prof)
    elif new_user.role == "volunteer":
        vol_prof = VolunteerProfile(
            user_id=new_user.id,
            vehicle_type=req.vehicle_type or "Two-wheeler"
        )
        db.add(vol_prof)

    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/demo-login/{role}", response_model=Token)
async def demo_login(role: str, db: AsyncSession = Depends(get_db)):
    target_role = role.lower()
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.donor_profile),
            selectinload(User.ngo_profile),
            selectinload(User.volunteer_profile)
        )
        .where(User.role == target_role)
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No seed account found for role: {role}")

    org_name = None
    if user.role == "donor" and user.donor_profile:
        org_name = user.donor_profile.organization_name
    elif user.role == "ngo" and user.ngo_profile:
        org_name = user.ngo_profile.organization_name
    elif user.role == "volunteer":
        org_name = "City Rescue Volunteers"
    elif user.role == "ops":
        org_name = "RescueLoop Command Central"

    token = create_access_token(subject=user.id, role=user.role)
    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        organization_name=org_name
    )

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    org_name = None
    if current_user.role == "donor" and current_user.donor_profile:
        org_name = current_user.donor_profile.organization_name
    elif current_user.role == "ngo" and current_user.ngo_profile:
        org_name = current_user.ngo_profile.organization_name
    elif current_user.role == "volunteer":
        org_name = "City Rescue Volunteers"
    elif current_user.role == "ops":
        org_name = "RescueLoop Command Central"

    user_out = UserOut.model_validate(current_user)
    user_out.organization_name = org_name
    return user_out
