"""
Admin patient management + enhanced doctor management endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.all_models import Appointment, Billing, Prescription, LabTest, MedicalRecord
from app.schemas.schemas import PatientResponse, DoctorResponse, MessageResponse
from app.core.deps import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Management"])


@router.get("/patients")
def admin_list_patients(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    blood_group: Optional[str] = None,
    gender: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Patient)
    if search:
        q = q.filter(Patient.full_name.ilike(f"%{search}%"))
    if blood_group:
        q = q.filter(Patient.blood_group == blood_group)
    if gender:
        q = q.filter(Patient.gender == gender)

    total = q.count()
    patients = q.order_by(Patient.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for p in patients:
        appt_count = db.query(Appointment).filter(Appointment.patient_id == p.id).count()
        result.append({
            "id": p.id, "user_id": p.user_id,
            "full_name": p.full_name,
            "gender": str(p.gender) if p.gender else None,
            "age": p.age,
            "blood_group": str(p.blood_group) if p.blood_group else None,
            "phone": p.phone,
            "address": p.address,
            "allergies": p.allergies,
            "chronic_conditions": p.chronic_conditions,
            "created_at": str(p.created_at),
            "total_appointments": appt_count,
        })
    return {"total": total, "patients": result}


@router.get("/patients/{patient_id}/detail")
def admin_patient_detail(
    patient_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    appointments  = db.query(Appointment).filter(Appointment.patient_id == patient_id).order_by(Appointment.appointment_date.desc()).limit(10).all()
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient_id).all()
    lab_tests     = db.query(LabTest).filter(LabTest.patient_id == patient_id).all()
    records       = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient_id).all()
    bills         = db.query(Billing).filter(Billing.patient_id == patient_id).all()

    total_billed    = sum(b.total_amount for b in bills)
    total_collected = sum(b.paid_amount  for b in bills)

    return {
        "patient": {
            "id": patient.id, "full_name": patient.full_name,
            "gender": str(patient.gender) if patient.gender else None,
            "age": patient.age,
            "blood_group": str(patient.blood_group) if patient.blood_group else None,
            "phone": patient.phone, "address": patient.address,
            "allergies": patient.allergies, "chronic_conditions": patient.chronic_conditions,
            "created_at": str(patient.created_at),
        },
        "stats": {
            "total_appointments": len(appointments),
            "prescriptions": len(prescriptions),
            "lab_tests": len(lab_tests),
            "medical_records": len(records),
            "total_billed": round(total_billed, 2),
            "total_collected": round(total_collected, 2),
        },
        "recent_appointments": [
            {"id": a.id, "date": str(a.appointment_date), "time": str(a.appointment_time)[:5],
             "status": str(a.status), "doctor_id": a.doctor_id}
            for a in appointments[:5]
        ],
    }


@router.get("/doctors/list")
def admin_list_doctors(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    specialization: Optional[str] = None,
    verified_only: bool = False,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Doctor)
    if search:
        q = q.filter(Doctor.full_name.ilike(f"%{search}%"))
    if specialization:
        q = q.filter(Doctor.specialization.ilike(f"%{specialization}%"))
    if verified_only:
        q = q.filter(Doctor.is_verified == True)

    total = q.count()
    doctors = q.order_by(Doctor.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for d in doctors:
        appt_count = db.query(Appointment).filter(Appointment.doctor_id == d.id).count()
        revenue    = db.query(func.sum(Billing.paid_amount)).join(
            Appointment, Billing.appointment_id == Appointment.id
        ).filter(Appointment.doctor_id == d.id).scalar() or 0
        result.append({
            "id": d.id, "user_id": d.user_id, "full_name": d.full_name,
            "specialization": d.specialization, "qualification": d.qualification,
            "experience": d.experience, "consultation_fee": d.consultation_fee,
            "availability_status": str(d.availability_status),
            "rating": d.rating, "total_reviews": d.total_reviews,
            "is_verified": d.is_verified,
            "total_appointments": appt_count,
            "revenue_generated": round(float(revenue), 2),
            "created_at": str(d.created_at),
        })
    return {"total": total, "doctors": result}


@router.put("/doctors/{doctor_id}/verify", response_model=MessageResponse)
def verify_doctor(
    doctor_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doctor.is_verified = True
    db.commit()
    return MessageResponse(message="Doctor verified successfully")


@router.put("/doctors/{doctor_id}/unverify", response_model=MessageResponse)
def unverify_doctor(
    doctor_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doctor.is_verified = False
    db.commit()
    return MessageResponse(message="Doctor unverified")


@router.get("/stats/departments")
def department_stats(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    from app.models.all_models import Department
    depts = db.query(Department).filter(Department.is_active == True).all()
    result = []
    for dept in depts:
        doc_count  = db.query(Doctor).filter(Doctor.department_id == dept.id).count()
        appt_count = db.query(Appointment).join(Doctor, Appointment.doctor_id == Doctor.id).filter(
            Doctor.department_id == dept.id
        ).count()
        result.append({
            "id": dept.id, "name": dept.name, "icon": dept.icon,
            "doctor_count": doc_count, "appointment_count": appt_count,
        })
    return result


@router.post("/billing/create")
def admin_create_bill(
    patient_id: int,
    appointment_id: Optional[int] = None,
    consultation_fee: float = 0,
    lab_fee: float = 0,
    medication_fee: float = 0,
    other_charges: float = 0,
    discount: float = 0,
    tax: float = 0,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    import uuid
    from datetime import datetime as dt
    invoice_no = f"INV-{dt.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    total = (consultation_fee + lab_fee + medication_fee + other_charges - discount) * (1 + tax / 100)

    from app.models.all_models import Billing
    b = Billing(
        patient_id=patient_id, appointment_id=appointment_id,
        invoice_number=invoice_no,
        consultation_fee=consultation_fee, lab_fee=lab_fee,
        medication_fee=medication_fee, other_charges=other_charges,
        discount=discount, tax=tax, total_amount=round(total, 2),
        notes=notes,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return {"id": b.id, "invoice_number": b.invoice_number, "total_amount": b.total_amount}
