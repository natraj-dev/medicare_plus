from fastapi import APIRouter
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.patients import router as patients_router
from app.api.v1.endpoints.doctors import router as doctors_router
from app.api.v1.endpoints.appointments import router as appointments_router
from app.api.v1.endpoints.appointments_extended import router as appt_ext_router
from app.api.v1.endpoints.reports import router as reports_router
from app.api.v1.endpoints.uploads import router as uploads_router
from app.api.v1.endpoints.admin_management import router as admin_mgmt_router
from app.api.v1.endpoints.all_routes import (
    departments_router, consultations_router, records_router,
    prescriptions_router, lab_router, billing_router, insurance_router,
    notifications_router, reviews_router, emergency_router,
    schedule_router, ai_router, admin_router, audit_router,
)
from app.api.v1.endpoints.phase2_tele_slots import tele_router, slots_router
from app.api.v1.endpoints.phase2_health_reminders import health_router, reminder_router
from app.api.v1.endpoints.phase2_beds_admissions import (
    beds_router, admissions_router, emergency_req_router,
    feedback_router, advanced_analytics_router,
)
from app.api.v1.endpoints.phase2_ai_assistant import router as ai_assistant_router

api_router = APIRouter()


api_router.include_router(auth_router)
api_router.include_router(patients_router)
api_router.include_router(doctors_router)
api_router.include_router(appointments_router)
api_router.include_router(appt_ext_router)
api_router.include_router(departments_router)
api_router.include_router(consultations_router)
api_router.include_router(records_router)
api_router.include_router(prescriptions_router)
api_router.include_router(lab_router)
api_router.include_router(billing_router)
api_router.include_router(insurance_router)
api_router.include_router(notifications_router)
api_router.include_router(reviews_router)
api_router.include_router(emergency_router)
api_router.include_router(schedule_router)
api_router.include_router(ai_router)
api_router.include_router(admin_router)
api_router.include_router(admin_mgmt_router)
api_router.include_router(audit_router)
api_router.include_router(reports_router)
api_router.include_router(uploads_router)
api_router.include_router(tele_router)
api_router.include_router(slots_router)
api_router.include_router(health_router)
api_router.include_router(reminder_router)
api_router.include_router(beds_router)
api_router.include_router(admissions_router)
api_router.include_router(emergency_req_router)
api_router.include_router(feedback_router)
api_router.include_router(advanced_analytics_router)
api_router.include_router(ai_assistant_router)
