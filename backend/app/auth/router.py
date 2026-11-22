import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.models.entities import User, DonorProfile, NgoProfile, VolunteerProfile, PasswordResetToken, RoleEnum
from backend.app.models.schemas import LoginRequest, Token, UserCreate, UserOut
from backend.app.auth.security import verify_password, get_password_hash, create_access_token
from backend.app.auth.dependencies import get_current_user
from backend.app.config import settings
from backend.app.limiter import LOGIN_LIMIT, PASSWORD_RESET_LIMIT, REGISTER_LIMIT, limiter
from backend.app.services.email_service import send_email

router = APIRouter(prefix="/auth", tags=["Authentication"])

RESET_TOKEN_MINUTES = 30


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20)
    new_password: str = Field(min_length=8, max_length=72)


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.post("/login", response_model=Token)
@limiter.limit(LOGIN_LIMIT)
async def login(request: Request, db: AsyncSession = Depends(get_db)):
    email_val = None
    password_val = None

    content_type = request.headers.get("content-type", "").lower()
    if "application/json" in content_type:
        try:
            body = await request.json()
            email_val = body.get("email") or body.get("username")
            password_val = body.get("password")
        except Exception:
            pass
    elif "form" in content_type:
        try:
            form = await request.form()
            email_val = form.get("username") or form.get("email")
            password_val = form.get("password")
        except Exception:
            pass

    if not email_val or not password_val:
        try:
            body = await request.json()
            email_val = email_val or body.get("email") or body.get("username")
            password_val = password_val or body.get("password")
        except Exception:
            try:
                form = await request.form()
                email_val = email_val or form.get("username") or form.get("email")
                password_val = password_val or form.get("password")
            except Exception:
                pass

    if not email_val or not password_val:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email/username and password are required"
        )

    result = await db.execute(
        select(User)
        .options(
            selectinload(User.donor_profile),
            selectinload(User.ngo_profile),
            selectinload(User.volunteer_profile)
        )
        .where(User.email == str(email_val).lower().strip())
    )
    user = result.scalars().first()

    demo_emails = {
        "alex@abcrestaurant.com",
        "sarah@hopefoundation.org",
        "care@annagarcenter.org",
        "jordan@rescuecouriers.org",
        "priya@rescuecouriers.org",
        "admin@rescueloop.org",
    }
    if settings.ENVIRONMENT.lower() == "production" and user and user.email in demo_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Development demo accounts cannot sign in in production",
        )
    if not user or not verify_password(str(password_val), user.hashed_password):
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
    user_data = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "phone": user.phone,
        "organization_name": org_name,
    }

    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        organization_name=org_name,
        user=user_data
    )

@router.post("/register", response_model=UserOut)
@limiter.limit(REGISTER_LIMIT)
async def register(request: Request, req: UserCreate, db: AsyncSession = Depends(get_db)):
    target_role = req.role.lower()
    if target_role not in {RoleEnum.DONOR.value, RoleEnum.NGO.value, RoleEnum.VOLUNTEER.value}:
        raise HTTPException(status_code=400, detail="Registration is limited to donor, NGO, and volunteer roles")

    # Check if user exists
    existing = await db.execute(select(User).where(User.email == req.email.lower().strip()))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="User with this email already registered")

    new_user = User(
        email=req.email.lower().strip(),
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=target_role,
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
            contact_phone=new_user.phone or "+91 98402 44550",
            daily_capacity_meals=150,
            current_free_capacity=150
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

    token = create_access_token(subject=new_user.id, role=new_user.role)
    user_out = UserOut.model_validate(new_user)
    user_out.organization_name = org_name
    user_out.access_token = token
    user_out.token_type = "bearer"
    return user_out

@router.post("/demo-login/{role}", response_model=Token)
async def demo_login(role: str, db: AsyncSession = Depends(get_db)):
    if settings.ENVIRONMENT.lower() == "production":
        raise HTTPException(status_code=404, detail="Demo sign-in is disabled")
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
    user_data = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "phone": user.phone,
        "organization_name": org_name,
    }

    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        organization_name=org_name,
        user=user_data
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


@router.post("/forgot-password")
@limiter.limit(PASSWORD_RESET_LIMIT)
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Always returns the same message so callers cannot discover which emails exist.
    """
    generic = {"message": "If an account exists for that email, a password reset link has been sent."}
    result = await db.execute(select(User).where(User.email == str(body.email).lower().strip()))
    user = result.scalars().first()
    if not user or not user.is_active:
        return generic

    raw_token = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    existing = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
    )
    for prior in existing.scalars().all():
        prior.used_at = now

    db.add(PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_reset_token(raw_token),
        expires_at=now + timedelta(minutes=RESET_TOKEN_MINUTES),
    ))
    await db.commit()

    reset_link = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/?reset_token={raw_token}"
    await send_email(
        to_email=user.email,
        subject="Reset your RescueLoop password",
        body=(
            "A password reset was requested for your RescueLoop account.\n\n"
            f"Open this link within {RESET_TOKEN_MINUTES} minutes:\n{reset_link}\n\n"
            f"Or paste this token into the reset form:\n{raw_token}\n\n"
            "If you did not request this, you can ignore this message."
        ),
    )
    return generic


@router.post("/reset-password")
@limiter.limit(PASSWORD_RESET_LIMIT)
async def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    token_hash = _hash_reset_token(body.token.strip())
    result = await db.execute(
        select(PasswordResetToken)
        .options(selectinload(PasswordResetToken.user))
        .where(PasswordResetToken.token_hash == token_hash)
    )
    record = result.scalars().first()
    now = datetime.utcnow()
    if not record or record.used_at is not None or record.expires_at < now:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")
    if not record.user or not record.user.is_active:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    record.user.hashed_password = get_password_hash(body.new_password)
    record.used_at = now
    await db.commit()
    return {"message": "Password updated. You can sign in with the new password."}
