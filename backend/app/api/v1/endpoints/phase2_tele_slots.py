"""
Module 21: Telemedicine Video Consultation
Module 22: Doctor Availability & Slot Booking
"""
import uuid
import secrets
from datetime import datetime, date, time, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.all_models import Appointment, Notification, NotificationType
from app.models.phase2_models import (
    TelemedicineSession, SessionStatus,
    DoctorSlot, SlotStatus,
)
from app.schemas.phase2_schemas import (
    TelemedicineSessionCreate, TelemedicineSessionResponse, JoinSessionResponse,
    DoctorSlotCreate, DoctorSlotBulkCreate, DoctorSlotResponse,
)
from app.schemas.schemas import MessageResponse
from app.core.deps import get_current_user, get_current_doctor, get_current_admin

# ── Module 21 ──────────────────────────────────────────────────────────────────
tele_router = APIRouter(prefix="/telemedicine", tags=["Telemedicine"])


def _notify(db, user_id, title, message, ntype, ref_id=None):
    n = Notification(
        user_id=user_id, title=title, message=message,
        notification_type=ntype, reference_id=ref_id,
        reference_type="telemedicine",
    )
    db.add(n)


@tele_router.post("", response_model=TelemedicineSessionResponse)
def create_session(
    data: TelemedicineSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token = secrets.token_urlsafe(32)
    room_name = f"medicare-{uuid.uuid4().hex[:12]}"

    session = TelemedicineSession(
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        appointment_id=data.appointment_id,
        session_token=token,
        room_name=room_name,
        scheduled_at=data.scheduled_at,
        notes=data.notes,
        status=SessionStatus.SCHEDULED,
    )
    db.add(session)
    db.flush()

    # Notify both parties
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    if patient:
        _notify(db, patient.user_id, "Video Consultation Scheduled",
                f"Your video consultation is scheduled for {data.scheduled_at.strftime('%b %d %Y %H:%M')}.",
                NotificationType.APPOINTMENT_CONFIRMATION, session.id)
    if doctor:
        _notify(db, doctor.user_id, "New Video Consultation",
                f"Video consultation scheduled with patient on {data.scheduled_at.strftime('%b %d %Y %H:%M')}.",
                NotificationType.APPOINTMENT_CONFIRMATION, session.id)

    db.commit()
    db.refresh(session)
    return session


@tele_router.get("", response_model=List[TelemedicineSessionResponse])
def list_sessions(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(TelemedicineSession)
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        if patient:
            q = q.filter(TelemedicineSession.patient_id == patient.id)
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(
            Doctor.user_id == current_user.id).first()
        if doctor:
            q = q.filter(TelemedicineSession.doctor_id == doctor.id)
    if status:
        q = q.filter(TelemedicineSession.status == status)
    return q.order_by(TelemedicineSession.scheduled_at.desc()).all()


@tele_router.get("/{session_id}", response_model=TelemedicineSessionResponse)
def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(TelemedicineSession).filter(
        TelemedicineSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s


@tele_router.post("/{session_id}/join", response_model=JoinSessionResponse)
def join_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(TelemedicineSession).filter(
        TelemedicineSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    if s.status == SessionStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Session is cancelled")
    if s.status == SessionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Session has ended")

    # Mark as ACTIVE when joined
    if s.status == SessionStatus.SCHEDULED:
        s.status = SessionStatus.ACTIVE
        s.started_at = datetime.utcnow()
        db.commit()
        db.refresh(s)

    # Determine role
    role = "patient"
    if current_user.role == UserRole.DOCTOR:
        role = "doctor"
    elif current_user.role == UserRole.ADMIN:
        role = "admin"

    # Build Jitsi URL (free, no server needed)
    join_url = f"https://meet.jit.si/{s.room_name}#userInfo.displayName={current_user.role.lower()}"

    return JoinSessionResponse(
        session_token=s.session_token,
        room_name=s.room_name,
        join_url=join_url,
        role=role,
    )


@tele_router.put("/{session_id}/end", response_model=TelemedicineSessionResponse)
def end_session(
    session_id: int,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    s = db.query(TelemedicineSession).filter(
        TelemedicineSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    s.status = SessionStatus.COMPLETED
    s.ended_at = datetime.utcnow()
    if s.started_at:
        delta = (s.ended_at - s.started_at).seconds // 60
        s.duration_minutes = delta
    if notes:
        s.notes = notes
    db.commit()
    db.refresh(s)
    return s


@tele_router.delete("/{session_id}", response_model=MessageResponse)
def cancel_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(TelemedicineSession).filter(
        TelemedicineSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    s.status = SessionStatus.CANCELLED
    db.commit()
    return MessageResponse(message="Session cancelled")


# ── Module 22 ──────────────────────────────────────────────────────────────────
slots_router = APIRouter(prefix="/slots", tags=["Doctor Slots"])


@slots_router.post("", response_model=DoctorSlotResponse)
def create_slot(
    data: DoctorSlotCreate,
    current_user: User = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Check duplicate
    existing = db.query(DoctorSlot).filter(
        DoctorSlot.doctor_id == doctor.id,
        DoctorSlot.slot_date == data.slot_date,
        DoctorSlot.start_time == data.start_time,
    ).first()
    if existing:
        raise HTTPException(
            status_code=409, detail="Slot already exists at this time")

    slot = DoctorSlot(doctor_id=doctor.id, **data.dict())
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@slots_router.post("/bulk", response_model=List[DoctorSlotResponse])
def create_bulk_slots(
    data: DoctorSlotBulkCreate,
    current_user: User = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Generate multiple slots from a time range with given duration."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    created = []
    start = datetime.combine(data.slot_date, data.start_time)
    end = datetime.combine(data.slot_date, data.end_time)
    current = start

    while current + timedelta(minutes=data.slot_duration) <= end:
        slot_start = current.time()
        slot_end = (current + timedelta(minutes=data.slot_duration)).time()

        existing = db.query(DoctorSlot).filter(
            DoctorSlot.doctor_id == doctor.id,
            DoctorSlot.slot_date == data.slot_date,
            DoctorSlot.start_time == slot_start,
        ).first()

        if not existing:
            slot = DoctorSlot(
                doctor_id=doctor.id,
                slot_date=data.slot_date,
                start_time=slot_start,
                end_time=slot_end,
                slot_type=data.slot_type,
            )
            db.add(slot)
            db.flush()
            created.append(slot)

        current += timedelta(minutes=data.slot_duration)

    db.commit()
    for s in created:
        db.refresh(s)
    return created


@slots_router.get("/doctor/{doctor_id}", response_model=List[DoctorSlotResponse])
def get_doctor_slots(
    doctor_id:  int,
    slot_date:  Optional[date] = None,
    slot_type:  Optional[str] = None,
    available_only: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(DoctorSlot).filter(DoctorSlot.doctor_id == doctor_id)
    if slot_date:
        q = q.filter(DoctorSlot.slot_date == slot_date)
    if slot_type:
        q = q.filter(DoctorSlot.slot_type == slot_type)
    if available_only:
        q = q.filter(DoctorSlot.status == SlotStatus.AVAILABLE)
    return q.order_by(DoctorSlot.slot_date, DoctorSlot.start_time).all()


@slots_router.get("/my", response_model=List[DoctorSlotResponse])
def my_slots(
    slot_date: Optional[date] = None,
    current_user: User = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    q = db.query(DoctorSlot).filter(DoctorSlot.doctor_id == doctor.id)
    if slot_date:
        q = q.filter(DoctorSlot.slot_date == slot_date)
    return q.order_by(DoctorSlot.slot_date, DoctorSlot.start_time).all()


@slots_router.put("/{slot_id}/block", response_model=DoctorSlotResponse)
def block_slot(
    slot_id: int,
    current_user: User = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    slot = db.query(DoctorSlot).filter(DoctorSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    slot.status = SlotStatus.BLOCKED
    db.commit()
    db.refresh(slot)
    return slot


@slots_router.delete("/{slot_id}", response_model=MessageResponse)
def delete_slot(
    slot_id: int,
    current_user: User = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    slot = db.query(DoctorSlot).filter(DoctorSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.status == SlotStatus.BOOKED:
        raise HTTPException(
            status_code=400, detail="Cannot delete a booked slot")
    db.delete(slot)
    db.commit()
    return MessageResponse(message="Slot deleted")
