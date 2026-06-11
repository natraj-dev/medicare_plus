"""
Remaining API endpoints:
- departments, consultations, medical_records, prescriptions,
  lab_tests, billing, insurance, notifications, reviews,
  emergency_contacts, schedules, ai_assistant, admin, audit_logs
"""
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.all_models import (
    Department, Consultation, MedicalRecord, Prescription,
    LabTest, Billing, Insurance, Notification, Review,
    EmergencyContact, DoctorSchedule, AuditLog,
    Appointment, AppointmentStatus,
)
from app.schemas.schemas import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    ConsultationCreate, ConsultationResponse,
    MedicalRecordCreate, MedicalRecordResponse,
    PrescriptionCreate, PrescriptionResponse,
    LabTestCreate, LabTestUpdate, LabTestResponse,
    BillingCreate, BillingUpdate, BillingResponse,
    InsuranceCreate, InsuranceResponse,
    NotificationResponse,
    ReviewCreate, ReviewResponse,
    EmergencyContactCreate, EmergencyContactResponse,
    DoctorScheduleCreate, DoctorScheduleResponse,
    AIChatMessage, AIChatResponse,
    DashboardStats, MessageResponse,
)
from app.core.deps import get_current_user, get_current_admin, get_current_doctor
from app.core.config import settings


# ─── Departments ───────────────────────────────────────────────────────────────

departments_router = APIRouter(prefix="/departments", tags=["Departments"])


@departments_router.get("", response_model=List[DepartmentResponse])
def list_departments(db: Session = Depends(get_db)):
    return db.query(Department).filter(Department.is_active == True).all()


@departments_router.post("", response_model=DepartmentResponse)
def create_department(data: DepartmentCreate, current_user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    dept = Department(**data.dict())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@departments_router.put("/{dept_id}", response_model=DepartmentResponse)
def update_department(dept_id: int, data: DepartmentUpdate, current_user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    for f, v in data.dict(exclude_unset=True).items():
        setattr(dept, f, v)
    db.commit()
    db.refresh(dept)
    return dept


@departments_router.delete("/{dept_id}", response_model=MessageResponse)
def delete_department(dept_id: int, current_user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    dept.is_active = False
    db.commit()
    return MessageResponse(message="Department deactivated")


# ─── Consultations ─────────────────────────────────────────────────────────────

consultations_router = APIRouter(
    prefix="/consultations", tags=["Consultations"])


@consultations_router.post("", response_model=ConsultationResponse)
def create_consultation(data: ConsultationCreate, current_user: User = Depends(get_current_doctor), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    appt = db.query(Appointment).filter(
        Appointment.id == data.appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    c = Consultation(doctor_id=doctor.id, **data.dict())
    db.add(c)
    appt.status = AppointmentStatus.COMPLETED
    db.commit()
    db.refresh(c)
    return c


@consultations_router.get("/{consultation_id}", response_model=ConsultationResponse)
def get_consultation(consultation_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Consultation).filter(
        Consultation.id == consultation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return c


@consultations_router.get("", response_model=List[ConsultationResponse])
def list_consultations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(
            Doctor.user_id == current_user.id).first()
        return db.query(Consultation).filter(Consultation.doctor_id == doctor.id).all()
    elif current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        appt_ids = [a.id for a in db.query(Appointment).filter(
            Appointment.patient_id == patient.id).all()]
        return db.query(Consultation).filter(Consultation.appointment_id.in_(appt_ids)).all()
    return db.query(Consultation).all()


# ─── Medical Records ───────────────────────────────────────────────────────────

records_router = APIRouter(prefix="/medical-records", tags=["Medical Records"])


@records_router.post("", response_model=MedicalRecordResponse)
def create_record(data: MedicalRecordCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(
        Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    r = MedicalRecord(patient_id=patient.id, **data.dict())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@records_router.get("", response_model=List[MedicalRecordResponse])
def list_records(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        return db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient.id).all()
    return db.query(MedicalRecord).all()


@records_router.delete("/{record_id}", response_model=MessageResponse)
def delete_record(record_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(r)
    db.commit()
    return MessageResponse(message="Record deleted")


# ─── Prescriptions ─────────────────────────────────────────────────────────────

prescriptions_router = APIRouter(
    prefix="/prescriptions", tags=["Prescriptions"])


@prescriptions_router.post("", response_model=PrescriptionResponse)
def create_prescription(data: PrescriptionCreate, current_user: User = Depends(get_current_doctor), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    p = Prescription(
        patient_id=data.patient_id,
        doctor_id=doctor.id,
        consultation_id=data.consultation_id,
        medications=json.dumps([m.dict() for m in data.medications]),
        instructions=data.instructions,
        valid_until=data.valid_until,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@prescriptions_router.get("", response_model=List[PrescriptionResponse])
def list_prescriptions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        return db.query(Prescription).filter(Prescription.patient_id == patient.id).all()
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(
            Doctor.user_id == current_user.id).first()
        return db.query(Prescription).filter(Prescription.doctor_id == doctor.id).all()
    return db.query(Prescription).all()


@prescriptions_router.get("/{prescription_id}", response_model=PrescriptionResponse)
def get_prescription(prescription_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Prescription).filter(
        Prescription.id == prescription_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return p


# ─── Lab Tests ─────────────────────────────────────────────────────────────────

lab_router = APIRouter(prefix="/lab-tests", tags=["Lab Tests"])


@lab_router.post("", response_model=LabTestResponse)
def create_lab_test(data: LabTestCreate, current_user: User = Depends(get_current_doctor), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    t = LabTest(doctor_id=doctor.id if doctor else None, **data.dict())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@lab_router.get("", response_model=List[LabTestResponse])
def list_lab_tests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        return db.query(LabTest).filter(LabTest.patient_id == patient.id).all()
    return db.query(LabTest).all()


@lab_router.put("/{test_id}", response_model=LabTestResponse)
def update_lab_test(test_id: int, data: LabTestUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(LabTest).filter(LabTest.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Test not found")
    for f, v in data.dict(exclude_unset=True).items():
        setattr(t, f, v)
    if data.status == "COMPLETED":
        t.completed_date = datetime.utcnow()
    db.commit()
    db.refresh(t)
    return t


# ─── Billing ───────────────────────────────────────────────────────────────────

billing_router = APIRouter(prefix="/billing", tags=["Billing"])


def gen_invoice():
    return f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"


@billing_router.post("", response_model=BillingResponse)
def create_bill(data: BillingCreate, current_user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    total = (data.consultation_fee + data.lab_fee + data.medication_fee +
             data.other_charges - data.discount) * (1 + data.tax / 100)
    b = Billing(invoice_number=gen_invoice(),
                total_amount=round(total, 2), **data.dict())
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@billing_router.get("", response_model=List[BillingResponse])
def list_bills(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        return db.query(Billing).filter(Billing.patient_id == patient.id).all()
    return db.query(Billing).all()


@billing_router.put("/{bill_id}", response_model=BillingResponse)
def update_bill(bill_id: int, data: BillingUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    b = db.query(Billing).filter(Billing.id == bill_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Bill not found")
    for f, v in data.dict(exclude_unset=True).items():
        setattr(b, f, v)
    if data.payment_status == "PAID":
        b.payment_date = datetime.utcnow()
    db.commit()
    db.refresh(b)
    return b


# ─── Insurance ─────────────────────────────────────────────────────────────────

insurance_router = APIRouter(prefix="/insurance", tags=["Insurance"])


@insurance_router.post("", response_model=InsuranceResponse)
def add_insurance(data: InsuranceCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(
        Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    ins = Insurance(patient_id=patient.id, **data.dict())
    db.add(ins)
    db.commit()
    db.refresh(ins)
    return ins


@insurance_router.get("", response_model=List[InsuranceResponse])
def list_insurance(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        return db.query(Insurance).filter(Insurance.patient_id == patient.id).all()
    return db.query(Insurance).all()


@insurance_router.put("/{ins_id}/verify", response_model=InsuranceResponse)
def verify_insurance(ins_id: int, current_user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    ins = db.query(Insurance).filter(Insurance.id == ins_id).first()
    if not ins:
        raise HTTPException(status_code=404, detail="Insurance not found")
    ins.is_verified = True
    db.commit()
    db.refresh(ins)
    return ins


# ─── Notifications ─────────────────────────────────────────────────────────────

notifications_router = APIRouter(
    prefix="/notifications", tags=["Notifications"])


@notifications_router.get("", response_model=List[NotificationResponse])
def list_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(50).all()


@notifications_router.put("/{notif_id}/read", response_model=MessageResponse)
def mark_read(notif_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notif_id,
                                      Notification.user_id == current_user.id).first()
    if n:
        n.is_read = True
        db.commit()
    return MessageResponse(message="Marked as read")


@notifications_router.put("/read-all", response_model=MessageResponse)
def mark_all_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current_user.id,
                                  Notification.is_read == False).update({"is_read": True})
    db.commit()
    return MessageResponse(message="All notifications marked as read")


@notifications_router.get("/unread-count")
def unread_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.query(Notification).filter(Notification.user_id ==
                                          current_user.id, Notification.is_read == False).count()
    return {"unread_count": count}


# ─── Reviews ───────────────────────────────────────────────────────────────────

reviews_router = APIRouter(prefix="/reviews", tags=["Reviews"])


@reviews_router.post("", response_model=ReviewResponse)
def submit_review(data: ReviewCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(
        Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    existing = db.query(Review).filter(Review.patient_id ==
                                       patient.id, Review.doctor_id == data.doctor_id).first()
    if existing:
        raise HTTPException(
            status_code=409, detail="Review already submitted for this doctor")
    r = Review(patient_id=patient.id, **data.dict())
    db.add(r)
    db.flush()
    # Update doctor rating
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    if doctor:
        all_reviews = db.query(Review).filter(
            Review.doctor_id == data.doctor_id).all()
        doctor.rating = round(
            sum(rv.rating for rv in all_reviews) / len(all_reviews), 1)
        doctor.total_reviews = len(all_reviews)
    db.commit()
    db.refresh(r)
    return r


@reviews_router.get("/doctor/{doctor_id}", response_model=List[ReviewResponse])
def get_doctor_reviews(doctor_id: int, db: Session = Depends(get_db)):
    return db.query(Review).filter(Review.doctor_id == doctor_id).all()


# ─── Emergency Contacts ────────────────────────────────────────────────────────

emergency_router = APIRouter(
    prefix="/emergency-contacts", tags=["Emergency Contacts"])


@emergency_router.post("", response_model=EmergencyContactResponse)
def add_contact(data: EmergencyContactCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(
        Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if data.is_primary:
        db.query(EmergencyContact).filter(
            EmergencyContact.patient_id == patient.id).update({"is_primary": False})
    payload = data.dict()

    ec = EmergencyContact(
        patient_id=patient.id,
        name=payload.get("name"),
        contact_relationship=payload.get("relationship"),
        phone=payload.get("phone"),
        email=payload.get("email"),
        is_primary=payload.get("is_primary", False)
    )
    db.add(ec)
    db.commit()
    db.refresh(ec)

    return {
        "id": ec.id,
        "patient_id": ec.patient_id,
        "name": ec.name,
        "relationship": ec.contact_relationship,
        "phone": ec.phone,
        "email": ec.email,
        "is_primary": ec.is_primary,
        "created_at": ec.created_at,
    }


@emergency_router.get("", response_model=List[EmergencyContactResponse])
def list_contacts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(
        Patient.user_id == current_user.id).first()
    if not patient:
        return []
    contacts = db.query(EmergencyContact).filter(
        EmergencyContact.patient_id == patient.id
    ).all()

    return [
        {
            "id": c.id,
            "patient_id": c.patient_id,
            "name": c.name,
            "relationship": c.contact_relationship,
            "phone": c.phone,
            "email": c.email,
            "is_primary": c.is_primary,
            "created_at": c.created_at,
        }
        for c in contacts
    ]


@emergency_router.delete("/{contact_id}", response_model=MessageResponse)
def delete_contact(contact_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ec = db.query(EmergencyContact).filter(
        EmergencyContact.id == contact_id).first()
    if not ec:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(ec)
    db.commit()
    return MessageResponse(message="Contact deleted")


# ─── Doctor Schedule ───────────────────────────────────────────────────────────

schedule_router = APIRouter(prefix="/schedules", tags=["Doctor Schedules"])


@schedule_router.post("", response_model=DoctorScheduleResponse)
def create_schedule(data: DoctorScheduleCreate, current_user: User = Depends(get_current_doctor), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    s = DoctorSchedule(doctor_id=doctor.id, **data.dict())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@schedule_router.get("/doctor/{doctor_id}", response_model=List[DoctorScheduleResponse])
def get_doctor_schedule(doctor_id: int, db: Session = Depends(get_db)):
    return db.query(DoctorSchedule).filter(DoctorSchedule.doctor_id == doctor_id, DoctorSchedule.is_active == True).all()


@schedule_router.get("/me", response_model=List[DoctorScheduleResponse])
def my_schedule(current_user: User = Depends(get_current_doctor), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        return []
    return db.query(DoctorSchedule).filter(DoctorSchedule.doctor_id == doctor.id).all()


# ─── AI Assistant ──────────────────────────────────────────────────────────────

ai_router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@ai_router.post("/chat", response_model=AIChatResponse)
async def ai_chat(data: AIChatMessage, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not settings.ANTHROPIC_API_KEY:
        # Fallback responses without API key
        fallback_responses = {
            "appointment": "I can help you book an appointment! Please go to the Appointments section and select your preferred doctor and time slot.",
            "doctor": "You can find our qualified doctors in the Doctors section. Filter by specialization or department to find the right one for you.",
            "emergency": "For emergencies, please call 911 or go to the nearest emergency room immediately!",
            "prescription": "Your prescriptions are available in the Prescriptions section of your dashboard.",
            "default": "Hello! I'm your MediCare Plus AI assistant. I can help with appointments, doctor recommendations, prescriptions, and general health questions. How can I assist you today?",
        }
        msg_lower = data.message.lower()
        response = fallback_responses["default"]
        for key in ["appointment", "doctor", "emergency", "prescription"]:
            if key in msg_lower:
                response = fallback_responses[key]
                break
        return AIChatResponse(
            response=response,
            suggestions=["Book an appointment", "Find a doctor",
                         "View prescriptions", "Check test results"]
        )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        system_prompt = """You are a helpful AI medical assistant for MediCare Plus hospital management platform.
You help patients with:
- Booking appointments
- Finding the right doctor
- Understanding prescriptions and medications
- General health questions
- Hospital services information
- FAQ support

Always recommend consulting a doctor for serious medical concerns.
Be compassionate, clear, and professional. Keep responses concise."""

        messages = []
        for h in (data.conversation_history or []):
            messages.append({"role": h.get("role", "user"),
                            "content": h.get("content", "")})
        messages.append({"role": "user", "content": data.message})

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            system=system_prompt,
            messages=messages,
        )
        ai_text = response.content[0].text
        return AIChatResponse(
            response=ai_text,
            suggestions=["Book appointment",
                         "Find specialist", "View my records"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"AI service error: {str(e)}")


# ─── Admin Dashboard ───────────────────────────────────────────────────────────

admin_router = APIRouter(prefix="/admin", tags=["Admin"])


@admin_router.get("/dashboard", response_model=DashboardStats)
def dashboard(current_user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    from datetime import date as date_type
    today = date_type.today()
    total_revenue = db.query(func.sum(Billing.paid_amount)).scalar() or 0
    return DashboardStats(
        total_patients=db.query(Patient).count(),
        total_doctors=db.query(Doctor).count(),
        total_appointments=db.query(Appointment).count(),
        total_revenue=float(total_revenue),
        appointments_today=db.query(Appointment).filter(
            Appointment.appointment_date == today).count(),
        pending_appointments=db.query(Appointment).filter(
            Appointment.status == "PENDING").count(),
        completed_appointments=db.query(Appointment).filter(
            Appointment.status == "COMPLETED").count(),
        departments_count=db.query(Department).filter(
            Department.is_active == True).count(),
    )


@admin_router.get("/analytics/appointments")
def appointment_analytics(current_user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    from datetime import date as dt, timedelta
    today = dt.today()
    last_7 = []
    for i in range(7):
        d = today - timedelta(days=6-i)
        count = db.query(Appointment).filter(
            Appointment.appointment_date == d).count()
        last_7.append({"date": str(d), "count": count})
    by_status = {}
    for s in ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]:
        by_status[s] = db.query(Appointment).filter(
            Appointment.status == s).count()
    return {"last_7_days": last_7, "by_status": by_status}


@admin_router.get("/analytics/revenue")
def revenue_analytics(current_user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    total = db.query(func.sum(Billing.total_amount)).scalar() or 0
    paid = db.query(func.sum(Billing.paid_amount)).scalar() or 0
    pending = db.query(Billing).filter(
        Billing.payment_status == "PENDING").count()
    return {"total_billed": float(total), "total_collected": float(paid), "pending_bills": pending}


@admin_router.get("/users")
def list_users(skip: int = 0, limit: int = 20, current_user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    from app.models.user import User as UserModel
    users = db.query(UserModel).offset(skip).limit(limit).all()
    return [{"id": u.id, "email": u.email, "role": u.role, "is_active": u.is_active, "created_at": u.created_at} for u in users]


@admin_router.put("/users/{user_id}/toggle-active")
def toggle_user(user_id: int, current_user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    from app.models.user import User as UserModel
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}"}


# ─── Audit Logs ────────────────────────────────────────────────────────────────

audit_router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@audit_router.get("")
def list_audit_logs(skip: int = 0, limit: int = 50, current_user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(
        AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return [{"id": l.id, "user_id": l.user_id, "action": l.action, "resource_type": l.resource_type,
             "resource_id": l.resource_id, "details": l.details, "ip_address": l.ip_address,
             "created_at": l.created_at} for l in logs]
