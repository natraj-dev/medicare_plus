from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, time, datetime, timedelta

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.all_models import (
    Appointment, AppointmentStatus, Billing, DoctorSchedule, Consultation, Notification, NotificationType
)
from app.schemas.schemas import MessageResponse
from app.core.deps import get_current_user, get_current_doctor
from datetime import datetime
import uuid

router = APIRouter(prefix="/appointments",
                   tags=["Appointments Extended"])


def _notify(db, user_id, title, message, ntype, ref_id=None):
    n = Notification(
        user_id=user_id, title=title, message=message,
        notification_type=ntype, reference_id=ref_id, reference_type="appointment"
    )
    db.add(n)


def gen_invoice():
    return f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

# ── Available slots ────────────────────────────────────────────────────────────


@router.get("/slots")
def get_available_slots(
    doctor_id: int,
    appointment_date: date,
    db: Session = Depends(get_db),
):
    print("=" * 50)
    print("SLOTS API HIT")
    print("doctor_id =", doctor_id)
    print("appointment_date =", appointment_date)

    dow = appointment_date.strftime("%A").upper()
    print("DAY =", dow)

    schedules = db.query(DoctorSchedule).filter(
        DoctorSchedule.doctor_id == doctor_id
    ).all()

    print("TOTAL SCHEDULES =", len(schedules))

    for s in schedules:
        print(
            "DB DAY =", s.day_of_week,
            "START =", s.start_time,
            "END =", s.end_time,
            "ACTIVE =", s.is_active
        )

    schedule = db.query(DoctorSchedule).filter(
        DoctorSchedule.doctor_id == doctor_id,
        DoctorSchedule.day_of_week == dow,
        DoctorSchedule.is_active == True,
    ).first()

    print("MATCHED SCHEDULE =", schedule)

    if not schedule:
        return {
            "available_slots": [],
            "message": "Doctor not available on this day"
        }

    slot_duration = schedule.slot_duration or 30

    print("START =", schedule.start_time)
    print("END =", schedule.end_time)
    print("DURATION =", slot_duration)

    start = datetime.combine(appointment_date, schedule.start_time)
    end = datetime.combine(appointment_date, schedule.end_time)

    all_slots = []
    current = start

    while current + timedelta(minutes=slot_duration) <= end:
        all_slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=slot_duration)

    print("ALL SLOTS =", all_slots)

    booked = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date == appointment_date,
        Appointment.status.in_([
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED
        ])
    ).all()

    booked_times = {str(b.appointment_time)[:5] for b in booked}

    print("BOOKED TIMES =", booked_times)

    available = [s for s in all_slots if s not in booked_times]

    print("AVAILABLE =", available)

    return {
        "doctor_id": doctor_id,
        "date": str(appointment_date),
        "day": dow,
        "slot_duration_minutes": slot_duration,
        "total_slots": len(all_slots),
        "booked_slots": len(booked_times),
        "available_slots": available,
    }
# ── Appointment detail (enriched) ──────────────────────────────────────────────


@router.get("/{appointment_id}/detail")
def get_appointment_detail(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == appt.doctor_id).first()
    consult = db.query(Consultation).filter(
        Consultation.appointment_id == appt.id).first()

    # Access control
    if current_user.role == UserRole.PATIENT:
        my_patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        if not my_patient or my_patient.id != appt.patient_id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == UserRole.DOCTOR:
        my_doctor = db.query(Doctor).filter(
            Doctor.user_id == current_user.id).first()
        if not my_doctor or my_doctor.id != appt.doctor_id:
            raise HTTPException(status_code=403, detail="Access denied")

    return {
        "appointment": {
            "id": appt.id,
            "appointment_date": str(appt.appointment_date),
            "appointment_time": str(appt.appointment_time)[:5],
            "appointment_type": str(appt.appointment_type),
            "status": str(appt.status),
            "reason": appt.reason,
            "symptoms": appt.symptoms,
            "notes": appt.notes,
            "duration_minutes": appt.duration_minutes,
            "created_at": str(appt.created_at),
        },
        "patient": {
            "id": patient.id if patient else None,
            "full_name": patient.full_name if patient else None,
            "age": patient.age if patient else None,
            "gender": str(patient.gender) if patient and patient.gender else None,
            "blood_group": str(patient.blood_group) if patient and patient.blood_group else None,
            "phone": patient.phone if patient else None,
            "allergies": patient.allergies if patient else None,
            "chronic_conditions": patient.chronic_conditions if patient else None,
        } if patient else None,
        "doctor": {
            "id": doctor.id if doctor else None,
            "full_name": doctor.full_name if doctor else None,
            "specialization": doctor.specialization if doctor else None,
            "qualification": doctor.qualification if doctor else None,
            "phone": doctor.phone if doctor else None,
        } if doctor else None,
        "consultation": {
            "id": consult.id,
            "diagnosis": consult.diagnosis,
            "treatment_plan": consult.treatment_plan,
            "doctor_notes": consult.doctor_notes,
            "follow_up_date": str(consult.follow_up_date) if consult.follow_up_date else None,
            "created_at": str(consult.created_at),
        } if consult else None,
    }


# ── Status transitions ─────────────────────────────────────────────────────────

@router.put("/{appointment_id}/confirm", response_model=MessageResponse)
def confirm_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.status != AppointmentStatus.PENDING:
        raise HTTPException(
            status_code=400, detail="Only PENDING appointments can be confirmed")

    appt.status = AppointmentStatus.CONFIRMED
    # Notify patient
    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    if patient:
        _notify(db, patient.user_id, "Appointment Confirmed",
                f"Your appointment on {appt.appointment_date} has been confirmed.",
                NotificationType.APPOINTMENT_CONFIRMATION, appt.id)
    db.commit()
    return MessageResponse(message="Appointment confirmed")


@router.put("/{appointment_id}/complete", response_model=MessageResponse)
def complete_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id
    ).first()

    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Prevent duplicate billing
    existing_bill = db.query(Billing).filter(
        Billing.appointment_id == appt.id
    ).first()

    appt.status = AppointmentStatus.COMPLETED

    if not existing_bill:
        doctor = db.query(Doctor).filter(
            Doctor.id == appt.doctor_id
        ).first()

        consultation_fee = doctor.consultation_fee if doctor else 0

        bill = Billing(
            patient_id=appt.patient_id,
            appointment_id=appt.id,
            invoice_number=gen_invoice(),
            consultation_fee=consultation_fee,
            lab_fee=0,
            medication_fee=0,
            other_charges=0,
            discount=0,
            tax=0,
            total_amount=consultation_fee,
            paid_amount=0,
            payment_status="PENDING",
            notes=f"Consultation fee for Appointment #{appt.id}"
        )

        db.add(bill)

    db.commit()

    return MessageResponse(
        message="Appointment completed and billing generated"
    )


@router.put("/{appointment_id}/reschedule", response_model=MessageResponse)
def reschedule_appointment(
    appointment_id: int,
    new_date: date,
    new_time: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.status not in [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]:
        raise HTTPException(
            status_code=400, detail="Cannot reschedule this appointment")

    # Check no conflict on new slot
    from datetime import time as time_type
    h, m = map(int, new_time.split(":"))
    new_time_obj = time_type(h, m)

    conflict = db.query(Appointment).filter(
        Appointment.doctor_id == appt.doctor_id,
        Appointment.appointment_date == new_date,
        Appointment.appointment_time == new_time_obj,
        Appointment.id != appointment_id,
        Appointment.status.in_(["PENDING", "CONFIRMED"]),
    ).first()
    if conflict:
        raise HTTPException(
            status_code=409, detail="New time slot is already booked")

    appt.appointment_date = new_date
    appt.appointment_time = new_time_obj
    appt.status = AppointmentStatus.RESCHEDULED

    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    if patient:
        _notify(db, patient.user_id, "Appointment Rescheduled",
                f"Your appointment has been rescheduled to {new_date} at {new_time}.",
                NotificationType.APPOINTMENT_REMINDER, appt.id)
    db.commit()
    return MessageResponse(message="Appointment rescheduled")


# ── Doctor's patient list ──────────────────────────────────────────────────────

@router.get("/my-patients")
def get_my_patients(
    current_user: User = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Doctor sees list of their unique patients with last appointment."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    appts = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.id).all()
    patient_ids = list({a.patient_id for a in appts})
    patients = db.query(Patient).filter(Patient.id.in_(patient_ids)).all()

    result = []
    for p in patients:
        last = db.query(Appointment).filter(
            Appointment.doctor_id == doctor.id,
            Appointment.patient_id == p.id,
        ).order_by(Appointment.appointment_date.desc()).first()
        result.append({
            "id": p.id, "full_name": p.full_name,
            "age": p.age, "gender": str(p.gender) if p.gender else None,
            "blood_group": str(p.blood_group) if p.blood_group else None,
            "phone": p.phone,
            "last_appointment": str(last.appointment_date) if last else None,
            "total_appointments": db.query(Appointment).filter(
                Appointment.doctor_id == doctor.id, Appointment.patient_id == p.id
            ).count(),
        })
    return result
