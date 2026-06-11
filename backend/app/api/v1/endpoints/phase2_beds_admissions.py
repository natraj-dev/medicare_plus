
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.all_models import (
    Appointment, Consultation, Billing, Notification, NotificationType,
)
from app.models.phase2_models import (
    Ward, HospitalBed, BedStatus,
    Admission, AdmissionStatus,
    EmergencyRequest, EmergencyRequestStatus,
    PatientFeedback,
)
from app.schemas.phase2_schemas import (
    WardCreate, WardResponse,
    HospitalBedCreate, HospitalBedResponse, BedAllocationRequest,
    AdmissionCreate, AdmissionDischarge, AdmissionResponse,
    EmergencyRequestCreate, EmergencyRequestUpdate, EmergencyRequestResponse,
    PatientFeedbackCreate, PatientFeedbackResponse, FeedbackAdminResponse,
    FeedbackAnalytics, AdvancedDashboardStats,
)
from app.schemas.schemas import MessageResponse
from app.core.deps import get_current_user, get_current_admin, get_current_doctor


# ── Module 25: Beds ────────────────────────────────────────────────────────────
beds_router = APIRouter(prefix="/beds", tags=["Hospital Beds"])


@beds_router.post("/wards", response_model=WardResponse)
def create_ward(
    data: WardCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    ward = Ward(**data.dict())
    db.add(ward)
    db.commit()
    db.refresh(ward)
    return ward


@beds_router.get("/wards", response_model=List[WardResponse])
def list_wards(db: Session = Depends(get_db)):
    return db.query(Ward).filter(Ward.is_active == True).all()


@beds_router.post("", response_model=HospitalBedResponse)
def create_bed(
    data: HospitalBedCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    bed = HospitalBed(**data.dict())
    db.add(bed)
    db.commit()
    db.refresh(bed)
    return bed


@beds_router.get("", response_model=List[HospitalBedResponse])
def list_beds(
    ward_id:        Optional[int] = None,
    status:         Optional[str] = None,
    available_only: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(HospitalBed)
    if ward_id:
        q = q.filter(HospitalBed.ward_id == ward_id)
    if status:
        q = q.filter(HospitalBed.status == status)
    if available_only:
        q = q.filter(HospitalBed.status == BedStatus.AVAILABLE)
    return q.all()


@beds_router.get("/availability")
def bed_availability(db: Session = Depends(get_db)):
    wards = db.query(Ward).filter(Ward.is_active == True).all()
    result = []
    for w in wards:
        total = db.query(HospitalBed).filter(
            HospitalBed.ward_id == w.id).count()
        available = db.query(HospitalBed).filter(
            HospitalBed.ward_id == w.id,
            HospitalBed.status == BedStatus.AVAILABLE,
        ).count()
        occupied = db.query(HospitalBed).filter(
            HospitalBed.ward_id == w.id,
            HospitalBed.status == BedStatus.OCCUPIED,
        ).count()
        result.append({
            "ward_id": w.id, "ward_name": w.name,
            "ward_type": str(w.ward_type), "floor": w.floor,
            "total": total, "available": available,
            "occupied": occupied, "maintenance": total - available - occupied,
        })
    return result


@beds_router.put("/{bed_id}/status", response_model=HospitalBedResponse)
def update_bed_status(
    bed_id: int,
    status: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    bed = db.query(HospitalBed).filter(HospitalBed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    bed.status = status
    db.commit()
    db.refresh(bed)
    return bed


# ── Module 26: Admissions ──────────────────────────────────────────────────────
admissions_router = APIRouter(prefix="/admissions", tags=["Admissions"])


@admissions_router.post("", response_model=AdmissionResponse)
def admit_patient(
    data: AdmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.DOCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=403, detail="Only doctors/admins can admit patients")

    # Mark bed as occupied
    if data.bed_id:
        bed = db.query(HospitalBed).filter(
            HospitalBed.id == data.bed_id).first()
        if bed:
            if bed.status == BedStatus.OCCUPIED:
                raise HTTPException(
                    status_code=409, detail="Bed is already occupied")
            bed.status = BedStatus.OCCUPIED

    admission = Admission(**data.dict())
    db.add(admission)
    db.flush()

    # Notify patient
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if patient:
        n = Notification(
            user_id=patient.user_id,
            title="Hospital Admission",
            message=f"You have been admitted to the hospital. Reason: {data.reason}",
            notification_type=NotificationType.GENERAL,
            reference_id=admission.id,
            reference_type="admission",
        )
        db.add(n)

    db.commit()
    db.refresh(admission)
    return admission


@admissions_router.get("", response_model=List[AdmissionResponse])
def list_admissions(
    status:     Optional[str] = None,
    patient_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Admission)
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        if patient:
            q = q.filter(Admission.patient_id == patient.id)
    elif patient_id:
        q = q.filter(Admission.patient_id == patient_id)
    if status:
        q = q.filter(Admission.status == status)
    return q.order_by(Admission.admission_date.desc()).all()


@admissions_router.get("/{admission_id}", response_model=AdmissionResponse)
def get_admission(
    admission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.query(Admission).filter(Admission.id == admission_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Admission not found")
    return a


@admissions_router.put("/{admission_id}/discharge", response_model=AdmissionResponse)
def discharge_patient(
    admission_id: int,
    data: AdmissionDischarge,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.DOCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=403, detail="Only doctors/admins can discharge patients")

    a = db.query(Admission).filter(Admission.id == admission_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Admission not found")
    if a.status == AdmissionStatus.DISCHARGED:
        raise HTTPException(status_code=400, detail="Already discharged")

    a.status = AdmissionStatus.DISCHARGED
    a.discharge_date = datetime.utcnow()
    a.discharge_notes = data.discharge_notes
    a.treatment_summary = data.treatment_summary
    a.total_cost = data.total_cost

    # Free the bed
    if a.bed_id:
        bed = db.query(HospitalBed).filter(HospitalBed.id == a.bed_id).first()
        if bed:
            bed.status = BedStatus.AVAILABLE

    # Notify patient
    patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
    if patient:
        n = Notification(
            user_id=patient.user_id,
            title="Discharged from Hospital",
            message="You have been discharged. Please follow the discharge instructions.",
            notification_type=NotificationType.GENERAL,
            reference_id=a.id, reference_type="admission",
        )
        db.add(n)

    db.commit()
    db.refresh(a)
    return a


# ── Module 27: Emergency Requests ─────────────────────────────────────────────
emergency_req_router = APIRouter(
    prefix="/emergency-requests", tags=["Emergency Requests"])


@emergency_req_router.post("", response_model=EmergencyRequestResponse)
def create_emergency_request(
    data: EmergencyRequestCreate,
    db: Session = Depends(get_db),
):
    req = EmergencyRequest(**data.dict())
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@emergency_req_router.get("", response_model=List[EmergencyRequestResponse])
def list_emergency_requests(
    status:   Optional[str] = None,
    priority: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(EmergencyRequest)
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        if patient:
            q = q.filter(EmergencyRequest.patient_id == patient.id)
    if status:
        q = q.filter(EmergencyRequest.status == status)
    if priority:
        q = q.filter(EmergencyRequest.priority == priority)
    return q.order_by(EmergencyRequest.created_at.desc()).all()


@emergency_req_router.get("/{request_id}", response_model=EmergencyRequestResponse)
def get_emergency_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.query(EmergencyRequest).filter(
        EmergencyRequest.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    return r


@emergency_req_router.put("/{request_id}", response_model=EmergencyRequestResponse)
def update_emergency_request(
    request_id: int,
    data: EmergencyRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.query(EmergencyRequest).filter(
        EmergencyRequest.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(r, field, value)
    if data.status == "RESOLVED":
        r.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(r)
    return r


# ── Module 29: Feedback ────────────────────────────────────────────────────────
feedback_router = APIRouter(prefix="/feedback", tags=["Patient Feedback"])


@feedback_router.post("", response_model=PatientFeedbackResponse)
def submit_feedback(
    data: PatientFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient_id = None
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        if patient:
            patient_id = patient.id

    fb = PatientFeedback(patient_id=patient_id, **data.dict())
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


@feedback_router.get("", response_model=List[PatientFeedbackResponse])
def list_feedback(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(PatientFeedback)
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        if patient:
            q = q.filter(PatientFeedback.patient_id == patient.id)
    if category:
        q = q.filter(PatientFeedback.category == category)
    return q.order_by(PatientFeedback.created_at.desc()).all()


@feedback_router.put("/{feedback_id}/respond", response_model=PatientFeedbackResponse)
def respond_feedback(
    feedback_id: int,
    data: FeedbackAdminResponse,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    fb = db.query(PatientFeedback).filter(
        PatientFeedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    fb.admin_response = data.response
    fb.is_resolved = True
    db.commit()
    db.refresh(fb)
    return fb


@feedback_router.get("/analytics", response_model=FeedbackAnalytics)
def feedback_analytics(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    all_fb = db.query(PatientFeedback).all()
    total = len(all_fb)
    avg = sum(f.rating for f in all_fb) / total if total else 0
    resolved = sum(1 for f in all_fb if f.is_resolved)

    by_category: dict = {}
    by_rating:   dict = {}
    for f in all_fb:
        cat = str(f.category)
        by_category[cat] = by_category.get(cat, 0) + 1
        r = str(f.rating)
        by_rating[r] = by_rating.get(r, 0) + 1

    return FeedbackAnalytics(
        total_feedback=total,
        average_rating=round(avg, 2),
        by_category=by_category,
        by_rating=by_rating,
        resolved_count=resolved,
        unresolved_count=total - resolved,
    )


# ── Module 30: Advanced Analytics ─────────────────────────────────────────────
advanced_analytics_router = APIRouter(
    prefix="/analytics", tags=["Advanced Analytics"])


@advanced_analytics_router.get("/dashboard", response_model=AdvancedDashboardStats)
def advanced_dashboard(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    from datetime import date as date_type
    today = date_type.today()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    # Appointments
    total_appts = db.query(Appointment).count()
    today_appts = db.query(Appointment).filter(
        Appointment.appointment_date == today).count()
    week_appts = db.query(Appointment).filter(
        Appointment.appointment_date >= week_start).count()
    pending_appts = db.query(Appointment).filter(
        Appointment.status == "PENDING").count()
    done_appts = db.query(Appointment).filter(
        Appointment.status == "COMPLETED").count()

    # Consultations
    total_consults = db.query(Consultation).count()

    # Admissions
    total_adm = db.query(Admission).count()
    current_adm = db.query(Admission).filter(
        Admission.status == "ADMITTED").count()

    # Revenue
    total_rev = db.query(func.sum(Billing.paid_amount)).scalar() or 0
    month_rev = db.query(func.sum(Billing.paid_amount)).filter(
        Billing.payment_date >= datetime.combine(
            month_start, __import__('datetime').time.min)
    ).scalar() or 0
    pending_pay = db.query(Billing).filter(
        Billing.payment_status == "PENDING").count()

    # Beds
    total_beds = db.query(HospitalBed).count()
    occ_beds = db.query(HospitalBed).filter(
        HospitalBed.status == BedStatus.OCCUPIED).count()
    avail_beds = db.query(HospitalBed).filter(
        HospitalBed.status == BedStatus.AVAILABLE).count()

    # People
    total_patients = db.query(Patient).count()
    total_docs = db.query(Doctor).count()
    verified_docs = db.query(Doctor).filter(Doctor.is_verified == True).count()

    # Feedback
    all_fb = db.query(PatientFeedback).all()
    avg_fb = sum(f.rating for f in all_fb) / len(all_fb) if all_fb else 0

    # Emergency
    active_em = db.query(EmergencyRequest).filter(
        EmergencyRequest.status.in_(["PENDING", "ACKNOWLEDGED", "IN_PROGRESS"])
    ).count()
    total_em = db.query(EmergencyRequest).count()

    return AdvancedDashboardStats(
        total_appointments=total_appts,
        appointments_today=today_appts,
        appointments_this_week=week_appts,
        pending_appointments=pending_appts,
        completed_appointments=done_appts,
        total_consultations=total_consults,
        total_admissions=total_adm,
        current_admissions=current_adm,
        total_revenue=round(float(total_rev), 2),
        revenue_this_month=round(float(month_rev), 2),
        pending_payments=pending_pay,
        total_beds=total_beds,
        occupied_beds=occ_beds,
        available_beds=avail_beds,
        total_patients=total_patients,
        total_doctors=total_docs,
        verified_doctors=verified_docs,
        average_feedback_score=round(avg_fb, 2),
        total_feedback=len(all_fb),
        active_emergencies=active_em,
        total_emergencies=total_em,
    )


@advanced_analytics_router.get("/department-performance")
def department_performance(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    from app.models.all_models import Department
    depts = db.query(Department).filter(Department.is_active == True).all()
    result = []
    for d in depts:
        docs = db.query(Doctor).filter(Doctor.department_id == d.id).all()
        doc_ids = [doc.id for doc in docs]
        appts = db.query(Appointment).filter(
            Appointment.doctor_id.in_(doc_ids)).count() if doc_ids else 0
        completed = db.query(Appointment).filter(
            Appointment.doctor_id.in_(doc_ids),
            Appointment.status == "COMPLETED"
        ).count() if doc_ids else 0
        revenue = db.query(func.sum(Billing.paid_amount)).join(
            Appointment, Billing.appointment_id == Appointment.id
        ).filter(Appointment.doctor_id.in_(doc_ids)).scalar() or 0 if doc_ids else 0
        avg_rating = sum(doc.rating for doc in docs) / len(docs) if docs else 0

        result.append({
            "department": d.name, "icon": d.icon,
            "doctor_count": len(docs),
            "total_appointments": appts,
            "completed_appointments": completed,
            "revenue": round(float(revenue), 2),
            "avg_doctor_rating": round(avg_rating, 2),
        })
    return sorted(result, key=lambda x: x["total_appointments"], reverse=True)


@advanced_analytics_router.get("/doctor-performance")
def doctor_performance(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    doctors = db.query(Doctor).all()
    result = []
    for d in doctors:
        appts = db.query(Appointment).filter(
            Appointment.doctor_id == d.id).count()
        completed = db.query(Appointment).filter(
            Appointment.doctor_id == d.id, Appointment.status == "COMPLETED"
        ).count()
        consults = db.query(Consultation).filter(
            Consultation.doctor_id == d.id).count()
        revenue = db.query(func.sum(Billing.paid_amount)).join(
            Appointment, Billing.appointment_id == Appointment.id
        ).filter(Appointment.doctor_id == d.id).scalar() or 0

        result.append({
            "id": d.id, "name": d.full_name,
            "specialization": d.specialization,
            "total_appointments": appts,
            "completed_appointments": completed,
            "total_consultations": consults,
            "rating": d.rating,
            "total_reviews": d.total_reviews,
            "revenue": round(float(revenue), 2),
            "is_verified": d.is_verified,
        })
    return sorted(result, key=lambda x: x["total_appointments"], reverse=True)


@advanced_analytics_router.get("/revenue-trend")
def revenue_trend(
    days: int = 30,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    from datetime import date as date_type
    today = date_type.today()
    result = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        day_start = datetime.combine(d, __import__('datetime').time.min)
        day_end = datetime.combine(d, __import__('datetime').time.max)
        rev = db.query(func.sum(Billing.paid_amount)).filter(
            Billing.payment_date >= day_start,
            Billing.payment_date <= day_end,
        ).scalar() or 0
        appts = db.query(Appointment).filter(
            Appointment.appointment_date == d).count()
        result.append({"date": str(d), "revenue": round(
            float(rev), 2), "appointments": appts})
    return result
