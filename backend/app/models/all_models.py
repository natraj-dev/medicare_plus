from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Float, Enum, Date, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum


# ─── Department ───────────────────────────────────────────────────────────────

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    head_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    icon = Column(String(100), default="🏥")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    doctors = relationship(
        "Doctor",
        back_populates="department",
        foreign_keys="Doctor.department_id"
    )


# ─── Appointment ───────────────────────────────────────────────────────────────

class AppointmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    RESCHEDULED = "RESCHEDULED"
    NO_SHOW = "NO_SHOW"


class AppointmentType(str, enum.Enum):
    IN_PERSON = "IN_PERSON"
    ONLINE = "ONLINE"


class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    appointment_type = Column(Enum(AppointmentType),
                              default=AppointmentType.IN_PERSON)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.PENDING)
    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)
    duration_minutes = Column(Integer, default=30)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(),
                        onupdate=func.now())

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    consultation = relationship(
        "Consultation", back_populates="appointment", uselist=False)
    billing = relationship(
        "Billing", back_populates="appointment", uselist=False)


# ─── Consultation ──────────────────────────────────────────────────────────────

class Consultation(Base):
    __tablename__ = "consultations"
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey(
        "appointments.id"), unique=True, nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    diagnosis = Column(Text, nullable=True)
    treatment_plan = Column(Text, nullable=True)
    doctor_notes = Column(Text, nullable=True)
    follow_up_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    appointment = relationship("Appointment", back_populates="consultation")
    doctor = relationship("Doctor", back_populates="consultations")
    prescriptions = relationship("Prescription", back_populates="consultation")


# ─── MedicalRecord ─────────────────────────────────────────────────────────────

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    record_type = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    doctor_name = Column(String(255), nullable=True)
    hospital_name = Column(String(255), nullable=True)
    record_date = Column(Date, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", back_populates="medical_records")


# ─── Prescription ──────────────────────────────────────────────────────────────

class Prescription(Base):
    __tablename__ = "prescriptions"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    consultation_id = Column(Integer, ForeignKey(
        "consultations.id"), nullable=True)
    medications = Column(Text, nullable=False)  # JSON string
    instructions = Column(Text, nullable=True)
    valid_until = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", back_populates="prescriptions")
    doctor = relationship("Doctor", back_populates="prescriptions")
    consultation = relationship("Consultation", back_populates="prescriptions")


# ─── LabTest ───────────────────────────────────────────────────────────────────

class LabTestStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    SAMPLE_COLLECTED = "SAMPLE_COLLECTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class LabTest(Base):
    __tablename__ = "lab_tests"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    test_name = Column(String(255), nullable=False)
    test_type = Column(String(100), nullable=True)
    status = Column(Enum(LabTestStatus), default=LabTestStatus.REQUESTED)
    result = Column(Text, nullable=True)
    result_file_url = Column(String(500), nullable=True)
    normal_range = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    requested_date = Column(DateTime, server_default=func.now())
    completed_date = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="lab_tests")


# ─── Billing ───────────────────────────────────────────────────────────────────

class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class Billing(Base):
    __tablename__ = "billings"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey(
        "appointments.id"), nullable=True)
    invoice_number = Column(String(50), unique=True, nullable=False)
    consultation_fee = Column(Float, default=0.0)
    lab_fee = Column(Float, default=0.0)
    medication_fee = Column(Float, default=0.0)
    other_charges = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(String(50), nullable=True)
    payment_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", back_populates="billings")
    appointment = relationship("Appointment", back_populates="billing")


# ─── Insurance ─────────────────────────────────────────────────────────────────

class Insurance(Base):
    __tablename__ = "insurances"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    provider_name = Column(String(255), nullable=False)
    policy_number = Column(String(100), nullable=False)
    coverage_type = Column(String(100), nullable=True)
    coverage_amount = Column(Float, nullable=True)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)
    is_verified = Column(Boolean, default=False)
    claim_status = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", back_populates="insurances")


# ─── Notification ──────────────────────────────────────────────────────────────

class NotificationType(str, enum.Enum):
    APPOINTMENT_CONFIRMATION = "APPOINTMENT_CONFIRMATION"
    APPOINTMENT_REMINDER = "APPOINTMENT_REMINDER"
    PRESCRIPTION_UPDATE = "PRESCRIPTION_UPDATE"
    TEST_RESULT = "TEST_RESULT"
    PAYMENT_SUCCESS = "PAYMENT_SUCCESS"
    GENERAL = "GENERAL"


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(
        Enum(NotificationType), default=NotificationType.GENERAL)
    is_read = Column(Boolean, default=False)
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="notifications")


# ─── Review ────────────────────────────────────────────────────────────────────

class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    is_anonymous = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", back_populates="reviews")
    doctor = relationship("Doctor", back_populates="reviews")


# ─── EmergencyContact ──────────────────────────────────────────────────────────

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    name = Column(String(255), nullable=False)
    contact_relationship = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", back_populates="emergency_contacts")


# ─── DoctorSchedule ────────────────────────────────────────────────────────────

class DayOfWeek(str, enum.Enum):
    MONDAY = "MONDAY"
    TUESDAY = "TUESDAY"
    WEDNESDAY = "WEDNESDAY"
    THURSDAY = "THURSDAY"
    FRIDAY = "FRIDAY"
    SATURDAY = "SATURDAY"
    SUNDAY = "SUNDAY"


class DoctorSchedule(Base):
    __tablename__ = "doctor_schedules"
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    day_of_week = Column(Enum(DayOfWeek), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    slot_duration = Column(Integer, default=30)
    max_appointments = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)

    doctor = relationship("Doctor", back_populates="schedules")


# ─── AuditLog ──────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="audit_logs")
