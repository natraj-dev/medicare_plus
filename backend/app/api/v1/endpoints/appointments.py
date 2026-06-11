from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.all_models import Appointment, AppointmentStatus, Notification, NotificationType
from app.schemas.schemas import AppointmentCreate, AppointmentUpdate, AppointmentResponse, MessageResponse
from app.core.deps import get_current_user

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def notify(db, user_id, title, message, ntype, ref_id=None, ref_type=None):
    n = Notification(user_id=user_id, title=title, message=message,
                     notification_type=ntype, reference_id=ref_id, reference_type=ref_type)
    db.add(n)


@router.post("", response_model=AppointmentResponse)
def book_appointment(data: AppointmentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(
        Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=404, detail="Patient profile not found")
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Check for conflicts
    existing = db.query(Appointment).filter(
        Appointment.doctor_id == data.doctor_id,
        Appointment.appointment_date == data.appointment_date,
        Appointment.appointment_time == data.appointment_time,
        Appointment.status.in_(["PENDING", "CONFIRMED"])
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Time slot already booked")

    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=data.doctor_id,
        appointment_date=data.appointment_date,
        appointment_time=data.appointment_time,
        appointment_type=data.appointment_type,
        reason=data.reason,
        symptoms=data.symptoms,
        duration_minutes=data.duration_minutes,
        status=AppointmentStatus.PENDING,
    )
    db.add(appointment)
    db.flush()

    # Notifications
    notify(db, current_user.id, "Appointment Booked",
           f"Your appointment with Dr. {doctor.full_name} on {data.appointment_date} is confirmed.",
           NotificationType.APPOINTMENT_CONFIRMATION, appointment.id, "appointment")
    notify(db, doctor.user_id, "New Appointment",
           f"New appointment booked by {patient.full_name} on {data.appointment_date}.",
           NotificationType.APPOINTMENT_CONFIRMATION, appointment.id, "appointment")

    db.commit()
    db.refresh(appointment)
    return appointment


@router.get("", response_model=List[AppointmentResponse])
def list_appointments(
    status: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    skip: int = 0, limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Appointment)
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        if patient:
            q = q.filter(Appointment.patient_id == patient.id)
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(
            Doctor.user_id == current_user.id).first()
        if doctor:
            q = q.filter(Appointment.doctor_id == doctor.id)
    if status:
        q = q.filter(Appointment.status == status)
    if from_date:
        q = q.filter(Appointment.appointment_date >= from_date)
    if to_date:
        q = q.filter(Appointment.appointment_date <= to_date)
    return q.order_by(Appointment.appointment_date.desc()).offset(skip).limit(limit).all()


@router.get("/id/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt


@router.put("/id/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(appointment_id: int, data: AppointmentUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(appt, field, value)
    db.commit()
    db.refresh(appt)
    return appt


@router.delete("/id/{appointment_id}", response_model=MessageResponse)
def cancel_appointment(appointment_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = AppointmentStatus.CANCELLED
    db.commit()
    return MessageResponse(message="Appointment cancelled")
