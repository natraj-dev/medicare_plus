from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.schemas.schemas import DoctorCreate, DoctorUpdate, DoctorResponse
from app.core.deps import get_current_user, get_current_admin, get_current_doctor

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get("", response_model=List[DoctorResponse])
def list_doctors(
    skip: int = 0, limit: int = 20,
    search: Optional[str] = None,
    specialization: Optional[str] = None,
    department_id: Optional[int] = None,
    available_only: bool = False,
    min_rating: Optional[float] = None,
    max_fee: Optional[float] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Doctor)
    if search:
        q = q.filter(Doctor.full_name.ilike(f"%{search}%"))
    if specialization:
        q = q.filter(Doctor.specialization.ilike(f"%{specialization}%"))
    if department_id:
        q = q.filter(Doctor.department_id == department_id)
    if available_only:
        q = q.filter(Doctor.availability_status == "AVAILABLE")
    if min_rating:
        q = q.filter(Doctor.rating >= min_rating)
    if max_fee:
        q = q.filter(Doctor.consultation_fee <= max_fee)
    return q.offset(skip).limit(limit).all()


@router.get("/me", response_model=DoctorResponse)
def get_my_profile(current_user: User = Depends(get_current_doctor), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return doctor


@router.put("/me", response_model=DoctorResponse)
def update_my_profile(data: DoctorUpdate, current_user: User = Depends(get_current_doctor), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(doctor, field, value)
    db.commit()
    db.refresh(doctor)
    return doctor


@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@router.put("/{doctor_id}/verify")
def verify_doctor(doctor_id: int, current_user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doctor.is_verified = True
    db.commit()
    return {"message": "Doctor verified successfully"}
