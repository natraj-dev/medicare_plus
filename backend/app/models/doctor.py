from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum


class AvailabilityStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    ON_LEAVE = "ON_LEAVE"
    OFFLINE = "OFFLINE"


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"),
                     unique=True, nullable=False)
    department_id = Column(Integer, ForeignKey(
        "departments.id"), nullable=True)
    full_name = Column(String(255), nullable=False)
    specialization = Column(String(255), nullable=False)
    qualification = Column(String(500), nullable=True)
    experience = Column(Integer, default=0)
    consultation_fee = Column(Float, default=0.0)
    availability_status = Column(
        Enum(AvailabilityStatus), default=AvailabilityStatus.AVAILABLE)
    bio = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)
    total_patients = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(),
                        onupdate=func.now())

    user = relationship("User", back_populates="doctor")
    department = relationship(
        "Department",
        back_populates="doctors",
        foreign_keys=[department_id]
    )
    appointments = relationship("Appointment", back_populates="doctor")
    consultations = relationship("Consultation", back_populates="doctor")
    prescriptions = relationship("Prescription", back_populates="doctor")
    reviews = relationship("Review", back_populates="doctor")
    schedules = relationship("DoctorSchedule", back_populates="doctor")
