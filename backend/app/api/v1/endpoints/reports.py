
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, datetime
import io

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.all_models import (
    Appointment, Prescription, Billing, MedicalRecord,
    LabTest, Consultation, Review,
)
from app.core.deps import get_current_user, get_current_admin
from app.utils.pdf_generator import (
    generate_prescription_pdf,
    generate_invoice_pdf,
    generate_appointment_report_pdf,
    generate_medical_summary_pdf,
)

router = APIRouter(prefix="/reports", tags=["Reports & Downloads"])


# ── helpers ────────────────────────────────────────────────────────────────────

def _pdf_response(data: bytes, filename: str) -> StreamingResponse:
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _get_patient_for_user(db: Session, user: User) -> Patient:
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(
            status_code=404, detail="Patient profile not found")
    return patient


# ── PDF Downloads ──────────────────────────────────────────────────────────────

@router.get("/prescription/{prescription_id}/pdf")
def download_prescription_pdf(
    prescription_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rx = db.query(Prescription).filter(
        Prescription.id == prescription_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Access control: patient can only download their own
    if current_user.role == UserRole.PATIENT:
        patient = _get_patient_for_user(db, current_user)
        if rx.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Access denied")

    patient = db.query(Patient).filter(Patient.id == rx.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == rx.doctor_id).first()

    pdf_bytes = generate_prescription_pdf(rx, patient, doctor)
    return _pdf_response(pdf_bytes, f"prescription_RX{prescription_id:05d}.pdf")


@router.get("/invoice/{billing_id}/pdf")
def download_invoice_pdf(
    billing_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bill = db.query(Billing).filter(Billing.id == billing_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if current_user.role == UserRole.PATIENT:
        patient = _get_patient_for_user(db, current_user)
        if bill.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Access denied")

    patient = db.query(Patient).filter(Patient.id == bill.patient_id).first()
    pdf_bytes = generate_invoice_pdf(bill, patient)
    return _pdf_response(pdf_bytes, f"invoice_{bill.invoice_number}.pdf")


@router.get("/appointments/pdf")
def download_appointments_pdf(
    from_date: Optional[date] = None,
    to_date:   Optional[date] = None,
    status:    Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Appointment)
    if current_user.role == UserRole.PATIENT:
        patient = _get_patient_for_user(db, current_user)
        q = q.filter(Appointment.patient_id == patient.id)
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(
            Doctor.user_id == current_user.id).first()
        if doctor:
            q = q.filter(Appointment.doctor_id == doctor.id)
    if from_date:
        q = q.filter(Appointment.appointment_date >= from_date)
    if to_date:
        q = q.filter(Appointment.appointment_date <= to_date)
    if status:
        q = q.filter(Appointment.status == status)

    appointments = q.order_by(Appointment.appointment_date.desc()).all()
    pdf_bytes = generate_appointment_report_pdf(
        appointments,
        title=f"Appointment Report{' — ' + status if status else ''}",
    )
    return _pdf_response(pdf_bytes, f"appointments_{datetime.now().strftime('%Y%m%d')}.pdf")


@router.get("/medical-summary/pdf")
def download_medical_summary_pdf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _get_patient_for_user(db, current_user)
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient.id).all()
    records = db.query(MedicalRecord).filter(
        MedicalRecord.patient_id == patient.id).all()
    prescriptions = db.query(Prescription).filter(
        Prescription.patient_id == patient.id).all()

    pdf_bytes = generate_medical_summary_pdf(
        patient, appointments, records, prescriptions)
    return _pdf_response(pdf_bytes, f"medical_summary_{patient.full_name.replace(' ', '_')}.pdf")


# ── JSON Report Summaries ──────────────────────────────────────────────────────

@router.get("/appointments")
def appointment_report_json(
    from_date: Optional[date] = None,
    to_date:   Optional[date] = None,
    status:    Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Appointment)
    if current_user.role == UserRole.PATIENT:
        patient = _get_patient_for_user(db, current_user)
        q = q.filter(Appointment.patient_id == patient.id)
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(
            Doctor.user_id == current_user.id).first()
        if doctor:
            q = q.filter(Appointment.doctor_id == doctor.id)
    if from_date:
        q = q.filter(Appointment.appointment_date >= from_date)
    if to_date:
        q = q.filter(Appointment.appointment_date <= to_date)
    if status:
        q = q.filter(Appointment.status == status)

    appts = q.order_by(Appointment.appointment_date.desc()).all()

    # aggregate stats
    by_status: dict = {}
    by_type:   dict = {}
    for a in appts:
        s = str(a.status)
        t = str(a.appointment_type)
        by_status[s] = by_status.get(s, 0) + 1
        by_type[t] = by_type.get(t, 0) + 1

    return {
        "total": len(appts),
        "by_status": by_status,
        "by_type": by_type,
        "records": [
            {
                "id": a.id, "patient_id": a.patient_id, "doctor_id": a.doctor_id,
                "appointment_date": str(a.appointment_date),
                "appointment_time": str(a.appointment_time)[:5],
                "status": str(a.status), "type": str(a.appointment_type),
                "reason": a.reason,
            }
            for a in appts
        ],
    }


@router.get("/billing")
def billing_report_json(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Billing)
    if current_user.role == UserRole.PATIENT:
        patient = _get_patient_for_user(db, current_user)
        q = q.filter(Billing.patient_id == patient.id)

    bills = q.order_by(Billing.created_at.desc()).all()
    total_billed = sum(b.total_amount for b in bills)
    total_collected = sum(b.paid_amount for b in bills)
    by_status: dict = {}
    for b in bills:
        s = str(b.payment_status)
        by_status[s] = by_status.get(s, 0) + 1

    return {
        "total_bills":      len(bills),
        "total_billed":     round(total_billed, 2),
        "total_collected":  round(total_collected, 2),
        "outstanding":      round(total_billed - total_collected, 2),
        "by_status":        by_status,
        "records": [
            {
                "id": b.id, "invoice_number": b.invoice_number,
                "patient_id": b.patient_id,
                "total_amount": b.total_amount, "paid_amount": b.paid_amount,
                "payment_status": str(b.payment_status),
                "created_at": str(b.created_at)[:10],
            }
            for b in bills
        ],
    }


@router.get("/doctors")
def doctors_report_json(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    doctors = db.query(Doctor).all()
    data = []
    for d in doctors:
        appt_count = db.query(Appointment).filter(
            Appointment.doctor_id == d.id).count()
        completed = db.query(Appointment).filter(
            Appointment.doctor_id == d.id,
            Appointment.status == "COMPLETED",
        ).count()
        revenue = db.query(func.sum(Billing.paid_amount)).join(
            Appointment, Billing.appointment_id == Appointment.id
        ).filter(Appointment.doctor_id == d.id).scalar() or 0

        data.append({
            "id": d.id, "full_name": d.full_name,
            "specialization": d.specialization,
            "total_appointments": appt_count,
            "completed_appointments": completed,
            "rating": d.rating,
            "total_reviews": d.total_reviews,
            "revenue_generated": round(float(revenue), 2),
            "is_verified": d.is_verified,
            "availability_status": str(d.availability_status),
        })
    return {"total_doctors": len(data), "records": data}


@router.get("/lab-tests")
def lab_tests_report_json(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(LabTest)
    if current_user.role == UserRole.PATIENT:
        patient = _get_patient_for_user(db, current_user)
        q = q.filter(LabTest.patient_id == patient.id)

    tests = q.order_by(LabTest.requested_date.desc()).all()
    by_status: dict = {}
    for t in tests:
        s = str(t.status)
        by_status[s] = by_status.get(s, 0) + 1

    return {
        "total": len(tests),
        "by_status": by_status,
        "records": [
            {
                "id": t.id, "patient_id": t.patient_id,
                "test_name": t.test_name, "test_type": t.test_type,
                "status": str(t.status), "result": t.result,
                "requested_date": str(t.requested_date)[:10],
                "completed_date": str(t.completed_date)[:10] if t.completed_date else None,
            }
            for t in tests
        ],
    }
