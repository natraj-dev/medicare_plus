from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.schemas.schemas import UserRegister, UserLogin, TokenResponse, PasswordReset, PasswordResetConfirm, ChangePassword, MessageResponse
from app.core.deps import get_current_user
from app.utils.audit import log_action

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=MessageResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    role = UserRole(data.role.upper()) if data.role.upper() in [r.value for r in UserRole] else UserRole.PATIENT
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        role=role,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()

    if role == UserRole.PATIENT:
        patient = Patient(user_id=user.id, full_name=data.full_name)
        db.add(patient)
    elif role == UserRole.DOCTOR:
        doctor = Doctor(user_id=user.id, full_name=data.full_name, specialization="General")
        db.add(doctor)

    db.commit()
    log_action(db, user.id, "REGISTER", "User", user.id)
    return MessageResponse(message="Registration successful")


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    log_action(db, user.id, "LOGIN", "User", user.id, ip_address=request.client.host if request.client else None)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        role=user.role,
        email=user.email,
    )


@router.post("/refresh", response_model=dict)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    new_access_token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(data: PasswordReset, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        # In production, send email with token
    return MessageResponse(message="If email exists, reset instructions sent")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: PasswordResetConfirm, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.reset_token == data.token,
        User.reset_token_expires > datetime.utcnow()
    ).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user.hashed_password = get_password_hash(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return MessageResponse(message="Password reset successful")


@router.post("/change-password", response_model=MessageResponse)
def change_password(data: ChangePassword, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return MessageResponse(message="Password changed successfully")


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = None
    if current_user.role == UserRole.PATIENT and current_user.patient:
        profile = {
            "id": current_user.patient.id,
            "full_name": current_user.patient.full_name,
            "avatar_url": current_user.patient.avatar_url,
        }
    elif current_user.role == UserRole.DOCTOR and current_user.doctor:
        profile = {
            "id": current_user.doctor.id,
            "full_name": current_user.doctor.full_name,
            "avatar_url": current_user.doctor.avatar_url,
            "specialization": current_user.doctor.specialization,
        }
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "profile": profile,
    }
