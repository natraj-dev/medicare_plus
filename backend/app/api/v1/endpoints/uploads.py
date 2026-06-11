
import os
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.all_models import MedicalRecord, LabTest
from app.core.deps import get_current_user

router = APIRouter(prefix="/uploads", tags=["File Uploads"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "medical_records").mkdir(exist_ok=True)
(UPLOAD_DIR / "lab_results").mkdir(exist_ok=True)
(UPLOAD_DIR / "avatars").mkdir(exist_ok=True)

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/webp",
    "application/pdf",
    "image/gif",
}
MAX_SIZE_MB = 10


def _save_file(file: UploadFile, subfolder: str) -> str:
    ext = Path(file.filename or "file").suffix.lower() or ".bin"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / subfolder / filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return f"/api/v1/uploads/files/{subfolder}/{filename}"


@router.post("/medical-record/{record_id}")
def upload_medical_record_file(
    record_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400, detail=f"File type not allowed: {file.content_type}")

    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    url = _save_file(file, "medical_records")
    record.file_url = url
    db.commit()
    return {"file_url": url, "message": "File uploaded successfully"}


@router.post("/lab-result/{test_id}")
def upload_lab_result_file(
    test_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400, detail=f"File type not allowed: {file.content_type}")

    test = db.query(LabTest).filter(LabTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Lab test not found")

    url = _save_file(file, "lab_results")
    test.result_file_url = url
    db.commit()
    return {"file_url": url, "message": "Lab result uploaded successfully"}


@router.post("/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(
            status_code=400, detail="Only JPEG/PNG/WebP images allowed")

    url = _save_file(file, "avatars")

    # Update patient or doctor avatar
    from app.models.user import UserRole
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(
            Patient.user_id == current_user.id).first()
        if patient:
            patient.avatar_url = url
    elif current_user.role == UserRole.DOCTOR:
        from app.models.doctor import Doctor
        doctor = db.query(Doctor).filter(
            Doctor.user_id == current_user.id).first()
        if doctor:
            doctor.avatar_url = url

    db.commit()
    return {"avatar_url": url, "message": "Avatar updated"}


@router.get("/files/{subfolder}/{filename}")
def serve_file(subfolder: str, filename: str):
    """Serve uploaded files."""
    if ".." in subfolder or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid path")
    path = UPLOAD_DIR / subfolder / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(path))
