
import json
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.phase2_models import HealthRecord, HealthMetricType, MedicineReminder, ReminderLog, ReminderStatus
from app.schemas.phase2_schemas import (
    HealthRecordCreate, HealthRecordResponse, HealthAnalytics,
    MedicineReminderCreate, MedicineReminderResponse,
    ReminderLogResponse, MarkTakenRequest,
)
from app.schemas.schemas import MessageResponse
from app.core.deps import get_current_user

# ── Module 23 ──────────────────────────────────────────────────────────────────
health_router = APIRouter(prefix="/health-tracker", tags=["Health Tracker"])


def _get_patient(db: Session, user: User) -> Patient:
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(
            status_code=404, detail="Patient profile not found")
    return patient


@health_router.post("", response_model=HealthRecordResponse)
def add_health_record(
    data: HealthRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.PATIENT:
        patient = _get_patient(db, current_user)
        patient_id = patient.id
    else:
        raise HTTPException(
            status_code=403, detail="Only patients can log health records")

    # Auto-set units
    unit_map = {
        "WEIGHT": "kg", "HEIGHT": "cm", "BLOOD_PRESSURE": "mmHg",
        "SUGAR_LEVEL": "mg/dL", "HEART_RATE": "bpm",
        "TEMPERATURE": "°C", "OXYGEN_LEVEL": "%", "BMI": "kg/m²",
    }
    unit = data.unit or unit_map.get(data.metric_type, "")

    record = HealthRecord(
        patient_id=patient_id,
        metric_type=data.metric_type,
        value=data.value,
        value2=data.value2,
        unit=unit,
        notes=data.notes,
        recorded_at=data.recorded_at or datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@health_router.get("", response_model=List[HealthRecordResponse])
def list_health_records(
    metric_type: Optional[str] = None,
    days:        int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _get_patient(db, current_user)
    q = db.query(HealthRecord).filter(HealthRecord.patient_id == patient.id)
    if metric_type:
        q = q.filter(HealthRecord.metric_type == metric_type)
    since = datetime.utcnow() - timedelta(days=days)
    q = q.filter(HealthRecord.recorded_at >= since)
    return q.order_by(HealthRecord.recorded_at.desc()).all()


@health_router.get("/analytics", response_model=List[HealthAnalytics])
def health_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _get_patient(db, current_user)
    results = []

    for mt in HealthMetricType:
        records = db.query(HealthRecord).filter(
            HealthRecord.patient_id == patient.id,
            HealthRecord.metric_type == mt,
        ).order_by(HealthRecord.recorded_at.asc()).all()

        if not records:
            continue

        values = [r.value for r in records]
        latest = values[-1]
        avg = sum(values) / len(values)
        mn = min(values)
        mx = max(values)

        # Trend: compare last 3 vs previous 3
        trend = "STABLE"
        if len(values) >= 6:
            recent = sum(values[-3:]) / 3
            previous = sum(values[-6:-3]) / 3
            if recent > previous * 1.02:
                trend = "UP"
            elif recent < previous * 0.98:
                trend = "DOWN"

        results.append(HealthAnalytics(
            metric_type=mt.value,
            latest=round(latest, 2),
            average=round(avg, 2),
            min_val=round(mn, 2),
            max_val=round(mx, 2),
            count=len(values),
            trend=trend,
        ))

    return results


@health_router.get("/chart/{metric_type}")
def health_chart_data(
    metric_type: str,
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _get_patient(db, current_user)
    since = datetime.utcnow() - timedelta(days=days)

    records = db.query(HealthRecord).filter(
        HealthRecord.patient_id == patient.id,
        HealthRecord.metric_type == metric_type.upper(),
        HealthRecord.recorded_at >= since,
    ).order_by(HealthRecord.recorded_at.asc()).all()

    return {
        "metric_type": metric_type,
        "days": days,
        "data": [
            {
                "date": r.recorded_at.strftime("%Y-%m-%d"),
                "time": r.recorded_at.strftime("%H:%M"),
                "value": r.value,
                "value2": r.value2,
                "unit": r.unit,
                "notes": r.notes,
            }
            for r in records
        ],
    }


@health_router.delete("/{record_id}", response_model=MessageResponse)
def delete_health_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _get_patient(db, current_user)
    record = db.query(HealthRecord).filter(
        HealthRecord.id == record_id,
        HealthRecord.patient_id == patient.id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return MessageResponse(message="Record deleted")


# ── Module 24 ──────────────────────────────────────────────────────────────────
reminder_router = APIRouter(prefix="/reminders", tags=["Medicine Reminders"])


@reminder_router.post("", response_model=MedicineReminderResponse)
def create_reminder(
    data: MedicineReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _get_patient(db, current_user)

    reminder = MedicineReminder(
        patient_id=patient.id,
        prescription_id=data.prescription_id,
        medicine_name=data.medicine_name,
        dosage=data.dosage,
        reminder_times=json.dumps(data.reminder_times),
        start_date=data.start_date,
        end_date=data.end_date,
        notes=data.notes,
        status=ReminderStatus.ACTIVE,
    )
    db.add(reminder)
    db.flush()

    # Pre-generate logs for today
    today = date.today()
    if data.start_date <= today:
        for t_str in data.reminder_times:
            h, m = map(int, t_str.split(":"))
            scheduled = datetime.combine(
                today, __import__('datetime').time(h, m))
            log = ReminderLog(reminder_id=reminder.id,
                              scheduled_time=scheduled)
            db.add(log)

    db.commit()
    db.refresh(reminder)
    return reminder


@reminder_router.get("", response_model=List[MedicineReminderResponse])
def list_reminders(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _get_patient(db, current_user)
    q = db.query(MedicineReminder).filter(
        MedicineReminder.patient_id == patient.id)
    if status:
        q = q.filter(MedicineReminder.status == status)
    return q.order_by(MedicineReminder.created_at.desc()).all()


@reminder_router.get("/today")
def todays_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _get_patient(db, current_user)
    today = date.today()
    today_start = datetime.combine(today, __import__('datetime').time.min)
    today_end = datetime.combine(today, __import__('datetime').time.max)

    reminders = db.query(MedicineReminder).filter(
        MedicineReminder.patient_id == patient.id,
        MedicineReminder.status == ReminderStatus.ACTIVE,
    ).all()

    result = []
    for r in reminders:
        logs = db.query(ReminderLog).filter(
            ReminderLog.reminder_id == r.id,
            ReminderLog.scheduled_time >= today_start,
            ReminderLog.scheduled_time <= today_end,
        ).all()
        result.append({
            "reminder_id":   r.id,
            "medicine_name": r.medicine_name,
            "dosage":        r.dosage,
            "times":         json.loads(r.reminder_times),
            "logs": [
                {
                    "log_id":         l.id,
                    "scheduled_time": l.scheduled_time.strftime("%H:%M"),
                    "is_taken":       l.is_taken,
                    "taken_at":       l.taken_at.strftime("%H:%M") if l.taken_at else None,
                }
                for l in logs
            ],
        })
    return result


@reminder_router.post("/mark-taken", response_model=MessageResponse)
def mark_taken(
    data: MarkTakenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = db.query(ReminderLog).filter(ReminderLog.id == data.log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Reminder log not found")
    log.is_taken = True
    log.taken_at = datetime.utcnow()
    log.notes = data.notes
    db.commit()
    return MessageResponse(message="Marked as taken")


@reminder_router.get("/{reminder_id}/history", response_model=List[ReminderLogResponse])
def reminder_history(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = db.query(ReminderLog).filter(
        ReminderLog.reminder_id == reminder_id
    ).order_by(ReminderLog.scheduled_time.desc()).limit(60).all()
    return logs


@reminder_router.put("/{reminder_id}/pause", response_model=MedicineReminderResponse)
def pause_reminder(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.query(MedicineReminder).filter(
        MedicineReminder.id == reminder_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")
    r.status = ReminderStatus.PAUSED
    db.commit()
    db.refresh(r)
    return r


@reminder_router.delete("/{reminder_id}", response_model=MessageResponse)
def delete_reminder(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.query(MedicineReminder).filter(
        MedicineReminder.id == reminder_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")
    r.status = ReminderStatus.CANCELLED
    db.commit()
    return MessageResponse(message="Reminder cancelled")
