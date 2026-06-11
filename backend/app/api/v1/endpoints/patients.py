from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.schemas.schemas import PatientCreate, PatientUpdate, PatientResponse, MessageResponse
from app.core.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("/me", response_model=PatientResponse)
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(
        Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=404, detail="Patient profile not found")
    return patient


@router.put("/me", response_model=PatientResponse)
def update_my_profile(data: PatientUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(
        Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=404, detail="Patient profile not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("", response_model=List[PatientResponse])
def list_patients(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.DOCTOR]:
        raise HTTPException(status_code=403, detail="Access denied")

    q = db.query(Patient)

    if search:
        q = q.filter(Patient.full_name.ilike(f"%{search}%"))

    return q.offset(skip).limit(limit).all()


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if current_user.role == UserRole.PATIENT and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return patient
