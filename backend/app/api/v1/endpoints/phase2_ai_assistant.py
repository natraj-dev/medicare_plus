"""
Module 28: Enhanced AI Health Assistant
- Symptom-based guidance
- Health FAQs
- Doctor recommendations
- Medication assistance
- Appointment suggestions
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.core.deps import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/ai-assistant", tags=["AI Health Assistant"])


class EnhancedChatMessage(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = []
    context: Optional[str] = None   # "symptom" | "medication" | "appointment" | "general"


class EnhancedChatResponse(BaseModel):
    response: str
    suggestions: List[str] = []
    recommended_doctors: List[dict] = []
    context_detected: str = "general"


SYMPTOM_DOCTOR_MAP = {
    "chest pain":       ["Cardiology"],
    "heart":            ["Cardiology"],
    "headache":         ["Neurology", "General Medicine"],
    "brain":            ["Neurology"],
    "bone":             ["Orthopedics"],
    "joint":            ["Orthopedics"],
    "fracture":         ["Orthopedics"],
    "skin":             ["Dermatology"],
    "rash":             ["Dermatology"],
    "acne":             ["Dermatology"],
    "eye":              ["Ophthalmology"],
    "vision":           ["Ophthalmology"],
    "child":            ["Pediatrics"],
    "baby":             ["Pediatrics"],
    "fever child":      ["Pediatrics"],
    "pregnancy":        ["Gynecology"],
    "women":            ["Gynecology"],
    "sugar":            ["General Medicine"],
    "diabetes":         ["General Medicine"],
    "blood pressure":   ["Cardiology", "General Medicine"],
    "cough":            ["General Medicine"],
    "cold":             ["General Medicine"],
    "stomach":          ["General Medicine"],
}

FALLBACK_RESPONSES = {
    "appointment": (
        "I can help you book an appointment! Go to the **Appointments** section and click "
        "'Book Appointment'. Select your preferred doctor, date, and time slot. "
        "Need help finding the right specialist?"
    ),
    "symptom": (
        "I understand you have some symptoms. While I can offer general guidance, "
        "please consult a doctor for proper diagnosis. Could you describe your symptoms "
        "in more detail so I can suggest the right specialist?"
    ),
    "medication": (
        "For medication queries, always follow your doctor's prescription. "
        "You can view all your active prescriptions in the **Prescriptions** section. "
        "Set up medicine reminders in the **Reminders** section to never miss a dose."
    ),
    "emergency": (
        "🚨 **This sounds like an emergency!** Please call emergency services immediately "
        "or go to the nearest hospital. You can also use our **Emergency Request** feature "
        "in the app for immediate hospital assistance."
    ),
    "general": (
        "Hello! I'm your MediCare Plus AI Health Assistant. I can help you with:\n"
        "• Finding the right doctor for your symptoms\n"
        "• Booking appointments\n"
        "• Understanding your medications\n"
        "• Health tips and guidance\n"
        "• Hospital services information\n\n"
        "How can I assist you today?"
    ),
}


def _detect_context(message: str) -> str:
    msg = message.lower()
    if any(w in msg for w in ["emergency", "accident", "unconscious", "bleeding", "heart attack", "stroke"]):
        return "emergency"
    if any(w in msg for w in ["symptom", "pain", "ache", "fever", "cough", "nausea", "dizzy", "tired", "fatigue"]):
        return "symptom"
    if any(w in msg for w in ["medicine", "medication", "drug", "tablet", "dose", "prescription", "pill"]):
        return "medication"
    if any(w in msg for w in ["appointment", "book", "schedule", "doctor", "visit", "consult"]):
        return "appointment"
    return "general"


def _get_recommended_doctors(message: str, db: Session) -> List[dict]:
    msg = message.lower()
    specializations = []
    for keyword, specs in SYMPTOM_DOCTOR_MAP.items():
        if keyword in msg:
            specializations.extend(specs)

    if not specializations:
        return []

    specializations = list(set(specializations))[:2]
    doctors = []
    for spec in specializations:
        docs = db.query(Doctor).filter(
            Doctor.specialization.ilike(f"%{spec}%"),
            Doctor.availability_status == "AVAILABLE",
        ).order_by(Doctor.rating.desc()).limit(2).all()
        for d in docs:
            doctors.append({
                "id": d.id,
                "name": d.full_name,
                "specialization": d.specialization,
                "rating": d.rating,
                "fee": d.consultation_fee,
                "experience": d.experience,
            })

    return doctors[:3]


@router.post("/chat", response_model=EnhancedChatResponse)
async def enhanced_ai_chat(
    data: EnhancedChatMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    context = data.context or _detect_context(data.message)
    recommended_doctors = _get_recommended_doctors(data.message, db)

    # Build patient context if available
    patient_context = ""
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if patient:
            patient_context = f"""
Patient Profile:
- Name: {patient.full_name}
- Age: {patient.age or 'Unknown'}
- Blood Group: {patient.blood_group or 'Unknown'}
- Allergies: {patient.allergies or 'None known'}
- Chronic Conditions: {patient.chronic_conditions or 'None known'}
"""

    if not settings.ANTHROPIC_API_KEY:
        # Intelligent fallback without API key
        response_text = FALLBACK_RESPONSES.get(context, FALLBACK_RESPONSES["general"])

        if recommended_doctors:
            response_text += f"\n\nBased on your concern, I recommend consulting a **{recommended_doctors[0]['specialization']}** specialist."

        suggestions_map = {
            "emergency": ["Call 108 (Ambulance)", "Go to Emergency Room", "Contact Emergency Services"],
            "symptom":   ["Book appointment", "View doctors", "Check medical records"],
            "medication": ["View prescriptions", "Set reminder", "Contact doctor"],
            "appointment": ["Book appointment", "Find doctors", "View schedule"],
            "general":   ["Book appointment", "Find a doctor", "Check lab results", "View prescriptions"],
        }
        return EnhancedChatResponse(
            response=response_text,
            suggestions=suggestions_map.get(context, suggestions_map["general"]),
            recommended_doctors=recommended_doctors,
            context_detected=context,
        )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        system_prompt = f"""You are an advanced AI Medical Health Assistant for MediCare Plus hospital platform.
You provide compassionate, accurate, and helpful medical guidance.

Your capabilities:
1. Symptom assessment and specialist recommendations
2. Medication information and reminders
3. Appointment booking assistance
4. General health education and tips
5. Hospital service navigation
6. Emergency guidance

{patient_context}

Guidelines:
- Always recommend consulting a qualified doctor for diagnosis
- For emergencies, immediately direct to emergency services
- Be empathetic and clear
- Keep responses concise but thorough
- Suggest relevant platform features (appointments, prescriptions, reminders, etc.)
- If symptoms are severe, urgently recommend emergency care

Platform features available: Appointments, Doctors, Prescriptions, Lab Tests, Medical Records,
Health Tracker, Medicine Reminders, Telemedicine, Emergency Requests, AI Chat.
"""

        messages = []
        for h in (data.conversation_history or [])[-8:]:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages.append({"role": "user", "content": data.message})

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=600,
            system=system_prompt,
            messages=messages,
        )
        ai_text = response.content[0].text

        suggestions_map = {
            "emergency":   ["Call Emergency Services", "Emergency Request", "Find nearest hospital"],
            "symptom":     ["Book appointment", "Find specialist", "View health tracker"],
            "medication":  ["View prescriptions", "Set medicine reminder", "Contact doctor"],
            "appointment": ["Book appointment", "Find doctors", "View schedule"],
            "general":     ["Book appointment", "Health tracker", "AI chat", "View records"],
        }

        return EnhancedChatResponse(
            response=ai_text,
            suggestions=suggestions_map.get(context, suggestions_map["general"]),
            recommended_doctors=recommended_doctors,
            context_detected=context,
        )

    except Exception as e:
        response_text = FALLBACK_RESPONSES.get(context, FALLBACK_RESPONSES["general"])
        return EnhancedChatResponse(
            response=response_text,
            suggestions=["Book appointment", "Find a doctor", "View prescriptions"],
            recommended_doctors=recommended_doctors,
            context_detected=context,
        )


@router.get("/health-tips")
def get_health_tips(
    category: Optional[str] = "general",
    current_user: User = Depends(get_current_user),
):
    tips = {
        "general": [
            "Drink at least 8 glasses of water daily.",
            "Get 7-8 hours of sleep every night.",
            "Exercise for at least 30 minutes, 5 days a week.",
            "Eat a balanced diet rich in fruits and vegetables.",
            "Take regular health checkups every 6 months.",
        ],
        "heart": [
            "Monitor your blood pressure regularly.",
            "Reduce salt and saturated fat intake.",
            "Exercise regularly to strengthen your heart.",
            "Avoid smoking and limit alcohol.",
            "Manage stress through meditation or yoga.",
        ],
        "diabetes": [
            "Monitor blood sugar levels daily.",
            "Follow a low-glycemic diet.",
            "Exercise regularly to improve insulin sensitivity.",
            "Take medications as prescribed.",
            "Get regular HbA1c tests every 3 months.",
        ],
        "mental": [
            "Practice mindfulness and meditation.",
            "Maintain social connections.",
            "Seek professional help when needed.",
            "Limit screen time, especially before bed.",
            "Engage in hobbies and activities you enjoy.",
        ],
    }
    return {
        "category": category,
        "tips": tips.get(category, tips["general"]),
    }


@router.get("/symptom-checker")
def symptom_checker(
    symptoms: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    symptom_list = [s.strip().lower() for s in symptoms.split(",")]
    matched_specs = []
    severity = "LOW"

    urgent_symptoms = ["chest pain", "difficulty breathing", "severe headache",
                       "sudden weakness", "unconscious", "heavy bleeding"]

    for s in symptom_list:
        if any(u in s for u in urgent_symptoms):
            severity = "CRITICAL"
        for keyword, specs in SYMPTOM_DOCTOR_MAP.items():
            if keyword in s:
                matched_specs.extend(specs)

    matched_specs = list(set(matched_specs))
    doctors = []
    for spec in matched_specs[:2]:
        docs = db.query(Doctor).filter(
            Doctor.specialization.ilike(f"%{spec}%"),
        ).order_by(Doctor.rating.desc()).limit(2).all()
        for d in docs:
            doctors.append({
                "id": d.id, "name": d.full_name,
                "specialization": d.specialization,
                "rating": d.rating, "fee": d.consultation_fee,
            })

    return {
        "symptoms_analyzed": symptom_list,
        "severity_level": severity,
        "recommended_specializations": matched_specs,
        "recommended_doctors": doctors[:4],
        "advice": (
            "🚨 Please seek emergency care immediately!"
            if severity == "CRITICAL"
            else "Please consult one of the recommended specialists."
        ),
    }
