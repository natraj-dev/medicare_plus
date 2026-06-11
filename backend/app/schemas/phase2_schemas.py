
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date, time


# ── Module 21: Telemedicine ────────────────────────────────────────────────────

class TelemedicineSessionCreate(BaseModel):
    patient_id:     int
    doctor_id:      int
    scheduled_at:   datetime
    appointment_id: Optional[int] = None
    notes:          Optional[str] = None


class TelemedicineSessionResponse(BaseModel):
    id:               int
    appointment_id:   Optional[int]
    patient_id:       int
    doctor_id:        int
    session_token:    str
    room_name:        str
    status:           str
    scheduled_at:     datetime
    started_at:       Optional[datetime]
    ended_at:         Optional[datetime]
    duration_minutes: Optional[int]
    notes:            Optional[str]
    recording_url:    Optional[str]
    created_at:       datetime

    class Config:
        from_attributes = True


class JoinSessionResponse(BaseModel):
    session_token: str
    room_name:     str
    join_url:      str
    role:          str


# ── Module 22: Doctor Slots ────────────────────────────────────────────────────

class DoctorSlotCreate(BaseModel):
    slot_date:  date
    start_time: time
    end_time:   time
    slot_type:  str = "IN_PERSON"
    notes:      Optional[str] = None


class DoctorSlotBulkCreate(BaseModel):
    slot_date:      date
    start_time:     time
    end_time:       time
    slot_duration:  int = 30
    slot_type:      str = "IN_PERSON"


class DoctorSlotResponse(BaseModel):
    id:             int
    doctor_id:      int
    slot_date:      date
    start_time:     time
    end_time:       time
    status:         str
    slot_type:      str
    appointment_id: Optional[int]
    notes:          Optional[str]
    created_at:     datetime

    class Config:
        from_attributes = True


# ── Module 23: Health Tracker ──────────────────────────────────────────────────

class HealthRecordCreate(BaseModel):
    metric_type: str
    value:       float
    value2:      Optional[float] = None
    unit:        Optional[str] = None
    notes:       Optional[str] = None
    recorded_at: Optional[datetime] = None


class HealthRecordResponse(BaseModel):
    id:          int
    patient_id:  int
    metric_type: str
    value:       float
    value2:      Optional[float]
    unit:        Optional[str]
    notes:       Optional[str]
    recorded_at: datetime

    class Config:
        from_attributes = True


class HealthAnalytics(BaseModel):
    metric_type: str
    latest:      Optional[float]
    average:     Optional[float]
    min_val:     Optional[float]
    max_val:     Optional[float]
    count:       int
    trend:       str  # UP | DOWN | STABLE


# ── Module 24: Medicine Reminders ─────────────────────────────────────────────

class MedicineReminderCreate(BaseModel):
    medicine_name:   str
    dosage:          Optional[str] = None
    reminder_times:  List[str]          # ["08:00", "20:00"]
    start_date:      date
    end_date:        Optional[date] = None
    prescription_id: Optional[int] = None
    notes:           Optional[str] = None


class MedicineReminderResponse(BaseModel):
    id:              int
    patient_id:      int
    prescription_id: Optional[int]
    medicine_name:   str
    dosage:          Optional[str]
    reminder_times:  str
    start_date:      date
    end_date:        Optional[date]
    status:          str
    notes:           Optional[str]
    created_at:      datetime

    class Config:
        from_attributes = True


class ReminderLogResponse(BaseModel):
    id:             int
    reminder_id:    int
    scheduled_time: datetime
    taken_at:       Optional[datetime]
    is_taken:       bool
    notes:          Optional[str]

    class Config:
        from_attributes = True


class MarkTakenRequest(BaseModel):
    log_id: int
    notes:  Optional[str] = None


# ── Module 25: Hospital Beds ───────────────────────────────────────────────────

class WardCreate(BaseModel):
    name:        str
    ward_type:   str = "GENERAL"
    floor:       int = 1
    total_beds:  int = 10
    description: Optional[str] = None


class WardResponse(BaseModel):
    id:          int
    name:        str
    ward_type:   str
    floor:       int
    total_beds:  int
    description: Optional[str]
    is_active:   bool
    created_at:  datetime

    class Config:
        from_attributes = True


class HospitalBedCreate(BaseModel):
    ward_id:    int
    bed_number: str
    bed_type:   str = "STANDARD"
    features:   Optional[str] = None


class HospitalBedResponse(BaseModel):
    id:         int
    ward_id:    int
    bed_number: str
    bed_type:   str
    status:     str
    features:   Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BedAllocationRequest(BaseModel):
    bed_id:     int
    patient_id: int


# ── Module 26: Admissions ──────────────────────────────────────────────────────

class AdmissionCreate(BaseModel):
    patient_id: int
    doctor_id:  Optional[int] = None
    bed_id:     Optional[int] = None
    reason:     str
    diagnosis:  Optional[str] = None


class AdmissionDischarge(BaseModel):
    discharge_notes:    Optional[str] = None
    treatment_summary:  Optional[str] = None
    total_cost:         float = 0.0


class AdmissionResponse(BaseModel):
    id:                int
    patient_id:        int
    doctor_id:         Optional[int]
    bed_id:            Optional[int]
    admission_date:    datetime
    discharge_date:    Optional[datetime]
    status:            str
    reason:            str
    diagnosis:         Optional[str]
    treatment_summary: Optional[str]
    discharge_notes:   Optional[str]
    total_cost:        float
    created_at:        datetime

    class Config:
        from_attributes = True


# ── Module 27: Emergency Requests ─────────────────────────────────────────────

class EmergencyRequestCreate(BaseModel):
    requester_name:  str
    requester_phone: str
    location:        Optional[str] = None
    description:     str
    priority:        str = "HIGH"
    patient_id:      Optional[int] = None


class EmergencyRequestUpdate(BaseModel):
    status:         Optional[str] = None
    assigned_to:    Optional[str] = None
    response_notes: Optional[str] = None
    priority:       Optional[str] = None


class EmergencyRequestResponse(BaseModel):
    id:              int
    patient_id:      Optional[int]
    requester_name:  str
    requester_phone: str
    location:        Optional[str]
    description:     str
    priority:        str
    status:          str
    assigned_to:     Optional[str]
    response_notes:  Optional[str]
    resolved_at:     Optional[datetime]
    created_at:      datetime

    class Config:
        from_attributes = True


# ── Module 29: Feedback ────────────────────────────────────────────────────────

class PatientFeedbackCreate(BaseModel):
    category:     str = "GENERAL"
    rating:       int = Field(..., ge=1, le=5)
    title:        Optional[str] = None
    message:      str
    is_anonymous: bool = False


class PatientFeedbackResponse(BaseModel):
    id:             int
    patient_id:     Optional[int]
    category:       str
    rating:         int
    title:          Optional[str]
    message:        str
    is_anonymous:   bool
    is_resolved:    bool
    admin_response: Optional[str]
    created_at:     datetime

    class Config:
        from_attributes = True


class FeedbackAdminResponse(BaseModel):
    response: str


class FeedbackAnalytics(BaseModel):
    total_feedback:   int
    average_rating:   float
    by_category:      dict
    by_rating:        dict
    resolved_count:   int
    unresolved_count: int


# ── Module 30: Advanced Analytics ─────────────────────────────────────────────

class AdvancedDashboardStats(BaseModel):
    # Appointments
    total_appointments:     int
    appointments_today:     int
    appointments_this_week: int
    pending_appointments:   int
    completed_appointments: int

    # Consultations
    total_consultations:    int

    # Admissions
    total_admissions:       int
    current_admissions:     int

    # Revenue
    total_revenue:          float
    revenue_this_month:     float
    pending_payments:       int

    # Beds
    total_beds:             int
    occupied_beds:          int
    available_beds:         int

    # Patients / Doctors
    total_patients:         int
    total_doctors:          int
    verified_doctors:       int

    # Satisfaction
    average_feedback_score: float
    total_feedback:         int

    # Emergency
    active_emergencies:     int
    total_emergencies:      int
