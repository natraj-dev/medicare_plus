from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List, Any
from datetime import datetime, date, time
from enum import Enum


# ─── Auth Schemas ──────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = "PATIENT"
    full_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    role: str
    email: str


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


# ─── Patient Schemas ───────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    full_name: str
    gender: Optional[str] = None
    age: Optional[int] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None


class PatientResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    gender: Optional[str]
    age: Optional[int]
    blood_group: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    allergies: Optional[str]
    chronic_conditions: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Doctor Schemas ────────────────────────────────────────────────────────────

class DoctorCreate(BaseModel):
    full_name: str
    specialization: str
    qualification: Optional[str] = None
    experience: int = 0
    consultation_fee: float = 0.0
    bio: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None


class DoctorUpdate(BaseModel):
    full_name: Optional[str] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[int] = None
    consultation_fee: Optional[float] = None
    availability_status: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None


class DoctorResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    specialization: str
    qualification: Optional[str]
    experience: int
    consultation_fee: float
    availability_status: str
    bio: Optional[str]
    phone: Optional[str]
    rating: float
    total_reviews: int
    total_patients: int
    is_verified: bool
    department_id: Optional[int]
    avatar_url: Optional[str]

    class Config:
        from_attributes = True


# ─── Department Schemas ────────────────────────────────────────────────────────

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "🏥"
    head_doctor_id: Optional[int] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    head_doctor_id: Optional[int] = None
    is_active: Optional[bool] = None


class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    icon: str
    head_doctor_id: Optional[int]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Appointment Schemas ───────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: date
    appointment_time: time
    appointment_type: str = "IN_PERSON"
    reason: Optional[str] = None
    symptoms: Optional[str] = None
    duration_minutes: int = 30


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: date
    appointment_time: time
    appointment_type: str
    status: str
    reason: Optional[str]
    notes: Optional[str]
    symptoms: Optional[str]
    duration_minutes: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Consultation Schemas ──────────────────────────────────────────────────────

class ConsultationCreate(BaseModel):
    appointment_id: int
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    doctor_notes: Optional[str] = None
    follow_up_date: Optional[date] = None


class ConsultationResponse(BaseModel):
    id: int
    appointment_id: int
    doctor_id: int
    diagnosis: Optional[str]
    treatment_plan: Optional[str]
    doctor_notes: Optional[str]
    follow_up_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Medical Record Schemas ────────────────────────────────────────────────────

class MedicalRecordCreate(BaseModel):
    record_type: str
    title: str
    description: Optional[str] = None
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    record_date: date


class MedicalRecordResponse(BaseModel):
    id: int
    patient_id: int
    record_type: str
    title: str
    description: Optional[str]
    file_url: Optional[str]
    doctor_name: Optional[str]
    hospital_name: Optional[str]
    record_date: date
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Prescription Schemas ──────────────────────────────────────────────────────

class MedicationItem(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None


class PrescriptionCreate(BaseModel):
    patient_id: int
    consultation_id: Optional[int] = None
    medications: List[MedicationItem]
    instructions: Optional[str] = None
    valid_until: Optional[date] = None


class PrescriptionResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    consultation_id: Optional[int]
    medications: str
    instructions: Optional[str]
    valid_until: Optional[date]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Lab Test Schemas ──────────────────────────────────────────────────────────

class LabTestCreate(BaseModel):
    patient_id: int
    test_name: str
    test_type: Optional[str] = None
    notes: Optional[str] = None


class LabTestUpdate(BaseModel):
    status: Optional[str] = None
    result: Optional[str] = None
    normal_range: Optional[str] = None
    notes: Optional[str] = None


class LabTestResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: Optional[int]
    test_name: str
    test_type: Optional[str]
    status: str
    result: Optional[str]
    normal_range: Optional[str]
    notes: Optional[str]
    requested_date: datetime
    completed_date: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Billing Schemas ───────────────────────────────────────────────────────────

class BillingCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    consultation_fee: float = 0.0
    lab_fee: float = 0.0
    medication_fee: float = 0.0
    other_charges: float = 0.0
    discount: float = 0.0
    tax: float = 0.0
    notes: Optional[str] = None


class BillingUpdate(BaseModel):
    paid_amount: Optional[float] = None
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None


class BillingResponse(BaseModel):
    id: int
    patient_id: int
    appointment_id: Optional[int]
    invoice_number: str
    consultation_fee: float
    lab_fee: float
    medication_fee: float
    other_charges: float
    discount: float
    tax: float
    total_amount: float
    paid_amount: float
    payment_status: str
    payment_method: Optional[str]
    payment_date: Optional[datetime]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Insurance Schemas ─────────────────────────────────────────────────────────

class InsuranceCreate(BaseModel):
    provider_name: str
    policy_number: str
    coverage_type: Optional[str] = None
    coverage_amount: Optional[float] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class InsuranceResponse(BaseModel):
    id: int
    patient_id: int
    provider_name: str
    policy_number: str
    coverage_type: Optional[str]
    coverage_amount: Optional[float]
    valid_from: Optional[date]
    valid_to: Optional[date]
    is_verified: bool
    claim_status: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Notification Schemas ──────────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    notification_type: str
    is_read: bool
    reference_id: Optional[int]
    reference_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Review Schemas ────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    doctor_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    is_anonymous: bool = False


class ReviewResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    rating: int
    comment: Optional[str]
    is_anonymous: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Emergency Contact Schemas ─────────────────────────────────────────────────

class EmergencyContactCreate(BaseModel):
    name: str
    relationship: str
    phone: str
    email: Optional[str] = None
    is_primary: bool = False


class EmergencyContactResponse(BaseModel):
    id: int
    patient_id: int
    name: str
    relationship: str
    phone: str
    email: Optional[str]
    is_primary: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Doctor Schedule Schemas ───────────────────────────────────────────────────

class DoctorScheduleCreate(BaseModel):
    day_of_week: str
    start_time: time
    end_time: time
    slot_duration: int = 30
    max_appointments: int = 10


class DoctorScheduleResponse(BaseModel):
    id: int
    doctor_id: int
    day_of_week: str
    start_time: time
    end_time: time
    slot_duration: int
    max_appointments: int
    is_active: bool

    class Config:
        from_attributes = True


# ─── AI Chat Schemas ────────────────────────────────────────────────────────────

class AIChatMessage(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = []


class AIChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = []


# ─── Admin Dashboard Schemas ───────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_patients: int
    total_doctors: int
    total_appointments: int
    total_revenue: float
    appointments_today: int
    pending_appointments: int
    completed_appointments: int
    departments_count: int


# ─── Common ────────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    success: bool = True


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int
