from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    # Phase 1 models
    from app.models import user, patient, doctor
    from app.models.all_models import (
        Department, Appointment, Consultation, MedicalRecord,
        Prescription, LabTest, Billing, Insurance, Notification,
        Review, EmergencyContact, DoctorSchedule, AuditLog,
    )
    # Phase 2 models
    from app.models.phase2_models import (
        TelemedicineSession, DoctorSlot, HealthRecord,
        MedicineReminder, ReminderLog, Ward, HospitalBed,
        Admission, EmergencyRequest, PatientFeedback,
    )
    Base.metadata.create_all(bind=engine)
