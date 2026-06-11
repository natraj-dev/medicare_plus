"""
Phase 2 Models:
  - TelemedicineSession      (Module 21)
  - DoctorSlot               (Module 22)
  - HealthRecord             (Module 23)
  - MedicineReminder         (Module 24)
  - Ward / HospitalBed       (Module 25)
  - Admission                (Module 26)
  - EmergencyRequest         (Module 27)
  - PatientFeedback          (Module 29)
"""
import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, Date, Time, Text, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


# ── Module 21: Telemedicine ────────────────────────────────────────────────────

class SessionStatus(str, enum.Enum):
    SCHEDULED  = "SCHEDULED"
    ACTIVE     = "ACTIVE"
    COMPLETED  = "COMPLETED"
    CANCELLED  = "CANCELLED"
    MISSED     = "MISSED"


class TelemedicineSession(Base):
    __tablename__ = "telemedicine_sessions"

    id             = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    patient_id     = Column(Integer, ForeignKey("patients.id"),     nullable=False)
    doctor_id      = Column(Integer, ForeignKey("doctors.id"),      nullable=False)
    session_token  = Column(String(255), unique=True, nullable=False)
    room_name      = Column(String(255), unique=True, nullable=False)
    status         = Column(Enum(SessionStatus), default=SessionStatus.SCHEDULED)
    scheduled_at   = Column(DateTime, nullable=False)
    started_at     = Column(DateTime, nullable=True)
    ended_at       = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    notes          = Column(Text, nullable=True)
    recording_url  = Column(String(500), nullable=True)
    created_at     = Column(DateTime, server_default=func.now())

    patient = relationship("Patient",  foreign_keys=[patient_id])
    doctor  = relationship("Doctor",   foreign_keys=[doctor_id])


# ── Module 22: Doctor Slots ────────────────────────────────────────────────────

class SlotStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BOOKED    = "BOOKED"
    BLOCKED   = "BLOCKED"


class DoctorSlot(Base):
    __tablename__ = "doctor_slots"

    id          = Column(Integer, primary_key=True, index=True)
    doctor_id   = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    slot_date   = Column(Date,    nullable=False)
    start_time  = Column(Time,    nullable=False)
    end_time    = Column(Time,    nullable=False)
    status      = Column(Enum(SlotStatus), default=SlotStatus.AVAILABLE)
    slot_type   = Column(String(50), default="IN_PERSON")   # IN_PERSON | ONLINE
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    notes       = Column(String(255), nullable=True)
    created_at  = Column(DateTime, server_default=func.now())

    doctor = relationship("Doctor", foreign_keys=[doctor_id])


# ── Module 23: Health Tracker ──────────────────────────────────────────────────

class HealthMetricType(str, enum.Enum):
    WEIGHT         = "WEIGHT"
    HEIGHT         = "HEIGHT"
    BLOOD_PRESSURE = "BLOOD_PRESSURE"
    SUGAR_LEVEL    = "SUGAR_LEVEL"
    HEART_RATE     = "HEART_RATE"
    TEMPERATURE    = "TEMPERATURE"
    OXYGEN_LEVEL   = "OXYGEN_LEVEL"
    BMI            = "BMI"


class HealthRecord(Base):
    __tablename__ = "health_records"

    id          = Column(Integer, primary_key=True, index=True)
    patient_id  = Column(Integer, ForeignKey("patients.id"), nullable=False)
    metric_type = Column(Enum(HealthMetricType), nullable=False)
    value       = Column(Float,   nullable=False)
    value2      = Column(Float,   nullable=True)   # diastolic BP
    unit        = Column(String(20), nullable=True)
    notes       = Column(String(255), nullable=True)
    recorded_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", foreign_keys=[patient_id])


# ── Module 24: Medicine Reminders ─────────────────────────────────────────────

class ReminderStatus(str, enum.Enum):
    ACTIVE    = "ACTIVE"
    PAUSED    = "PAUSED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class MedicineReminder(Base):
    __tablename__ = "medicine_reminders"

    id              = Column(Integer, primary_key=True, index=True)
    patient_id      = Column(Integer, ForeignKey("patients.id"), nullable=False)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=True)
    medicine_name   = Column(String(255), nullable=False)
    dosage          = Column(String(100), nullable=True)
    reminder_times  = Column(Text, nullable=False)   # JSON list of "HH:MM"
    start_date      = Column(Date, nullable=False)
    end_date        = Column(Date, nullable=True)
    status          = Column(Enum(ReminderStatus), default=ReminderStatus.ACTIVE)
    notes           = Column(String(255), nullable=True)
    created_at      = Column(DateTime, server_default=func.now())

    patient      = relationship("Patient",      foreign_keys=[patient_id])
    taken_logs   = relationship("ReminderLog",  back_populates="reminder")


class ReminderLog(Base):
    __tablename__ = "reminder_logs"

    id          = Column(Integer, primary_key=True, index=True)
    reminder_id = Column(Integer, ForeignKey("medicine_reminders.id"), nullable=False)
    scheduled_time = Column(DateTime, nullable=False)
    taken_at    = Column(DateTime, nullable=True)
    is_taken    = Column(Boolean, default=False)
    notes       = Column(String(255), nullable=True)

    reminder = relationship("MedicineReminder", back_populates="taken_logs")


# ── Module 25: Hospital Beds ───────────────────────────────────────────────────

class WardType(str, enum.Enum):
    GENERAL    = "GENERAL"
    ICU        = "ICU"
    EMERGENCY  = "EMERGENCY"
    MATERNITY  = "MATERNITY"
    PEDIATRIC  = "PEDIATRIC"
    SURGICAL   = "SURGICAL"
    ISOLATION  = "ISOLATION"


class Ward(Base):
    __tablename__ = "wards"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), unique=True, nullable=False)
    ward_type     = Column(Enum(WardType), default=WardType.GENERAL)
    floor         = Column(Integer, default=1)
    total_beds    = Column(Integer, default=10)
    description   = Column(Text, nullable=True)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, server_default=func.now())

    beds = relationship("HospitalBed", back_populates="ward")


class BedStatus(str, enum.Enum):
    AVAILABLE   = "AVAILABLE"
    OCCUPIED    = "OCCUPIED"
    MAINTENANCE = "MAINTENANCE"
    RESERVED    = "RESERVED"


class HospitalBed(Base):
    __tablename__ = "hospital_beds"

    id          = Column(Integer, primary_key=True, index=True)
    ward_id     = Column(Integer, ForeignKey("wards.id"), nullable=False)
    bed_number  = Column(String(20), nullable=False)
    bed_type    = Column(String(50), default="STANDARD")
    status      = Column(Enum(BedStatus), default=BedStatus.AVAILABLE)
    features    = Column(String(255), nullable=True)  # e.g. "oxygen,monitor"
    created_at  = Column(DateTime, server_default=func.now())

    ward       = relationship("Ward", back_populates="beds")
    admissions = relationship("Admission", back_populates="bed")


# ── Module 26: Admissions ──────────────────────────────────────────────────────

class AdmissionStatus(str, enum.Enum):
    ADMITTED   = "ADMITTED"
    DISCHARGED = "DISCHARGED"
    TRANSFERRED = "TRANSFERRED"


class Admission(Base):
    __tablename__ = "admissions"

    id               = Column(Integer, primary_key=True, index=True)
    patient_id       = Column(Integer, ForeignKey("patients.id"),      nullable=False)
    doctor_id        = Column(Integer, ForeignKey("doctors.id"),       nullable=True)
    bed_id           = Column(Integer, ForeignKey("hospital_beds.id"), nullable=True)
    admission_date   = Column(DateTime, server_default=func.now())
    discharge_date   = Column(DateTime, nullable=True)
    status           = Column(Enum(AdmissionStatus), default=AdmissionStatus.ADMITTED)
    reason           = Column(Text, nullable=False)
    diagnosis        = Column(Text, nullable=True)
    treatment_summary = Column(Text, nullable=True)
    discharge_notes  = Column(Text, nullable=True)
    total_cost       = Column(Float, default=0.0)
    created_at       = Column(DateTime, server_default=func.now())

    patient = relationship("Patient",     foreign_keys=[patient_id])
    doctor  = relationship("Doctor",      foreign_keys=[doctor_id])
    bed     = relationship("HospitalBed", back_populates="admissions")


# ── Module 27: Emergency Requests ─────────────────────────────────────────────

class EmergencyPriority(str, enum.Enum):
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class EmergencyRequestStatus(str, enum.Enum):
    PENDING     = "PENDING"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED    = "RESOLVED"
    CANCELLED   = "CANCELLED"


class EmergencyRequest(Base):
    __tablename__ = "emergency_requests"

    id            = Column(Integer, primary_key=True, index=True)
    patient_id    = Column(Integer, ForeignKey("patients.id"), nullable=True)
    requester_name = Column(String(255), nullable=False)
    requester_phone = Column(String(20), nullable=False)
    location      = Column(Text, nullable=True)
    description   = Column(Text, nullable=False)
    priority      = Column(Enum(EmergencyPriority), default=EmergencyPriority.HIGH)
    status        = Column(Enum(EmergencyRequestStatus), default=EmergencyRequestStatus.PENDING)
    assigned_to   = Column(String(255), nullable=True)
    response_notes = Column(Text, nullable=True)
    resolved_at   = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", foreign_keys=[patient_id])


# ── Module 29: Patient Feedback ────────────────────────────────────────────────

class FeedbackCategory(str, enum.Enum):
    DOCTOR_SERVICE   = "DOCTOR_SERVICE"
    HOSPITAL_FACILITY = "HOSPITAL_FACILITY"
    NURSING_STAFF    = "NURSING_STAFF"
    BILLING          = "BILLING"
    APPOINTMENT      = "APPOINTMENT"
    CLEANLINESS      = "CLEANLINESS"
    GENERAL          = "GENERAL"


class PatientFeedback(Base):
    __tablename__ = "patient_feedbacks"

    id            = Column(Integer, primary_key=True, index=True)
    patient_id    = Column(Integer, ForeignKey("patients.id"), nullable=True)
    category      = Column(Enum(FeedbackCategory), default=FeedbackCategory.GENERAL)
    rating        = Column(Integer, nullable=False)   # 1-5
    title         = Column(String(255), nullable=True)
    message       = Column(Text, nullable=False)
    is_anonymous  = Column(Boolean, default=False)
    is_resolved   = Column(Boolean, default=False)
    admin_response = Column(Text, nullable=True)
    created_at    = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", foreign_keys=[patient_id])
