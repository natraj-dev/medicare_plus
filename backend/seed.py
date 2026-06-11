"""
Seed script – Phase 1 + Phase 2 demo data.
Run: python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date, time, timedelta, datetime
from app.db.database import SessionLocal, create_tables
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.all_models import Department, DoctorSchedule, DayOfWeek
from app.models.phase2_models import Ward, WardType, HospitalBed, BedStatus
from app.core.security import get_password_hash


def seed():
    create_tables()
    db = SessionLocal()
    try:
        # ── Admin ──────────────────────────────────────────────────────────────
        if not db.query(User).filter(User.email == "admin@medicare.com").first():
            admin = User(
                email="admin@medicare.com",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN, is_active=True, is_verified=True,
            )
            db.add(admin)
            db.flush()
            print("✅ Admin: admin@medicare.com / admin123")

        # ── Departments ────────────────────────────────────────────────────────
        dept_data = [
            ("Cardiology",      "Heart and cardiovascular care",        "❤️"),
            ("Neurology",       "Brain and nervous system disorders",   "🧠"),
            ("Orthopedics",     "Bones, joints and muscles",           "🦴"),
            ("Pediatrics",      "Child healthcare",                    "👶"),
            ("Dermatology",     "Skin care and conditions",            "🌿"),
            ("Ophthalmology",   "Eye care and vision",                 "👁️"),
            ("General Medicine","General health and checkups",         "🏥"),
            ("Gynecology",      "Women's health",                      "🌸"),
        ]
        dept_map = {}
        for name, desc, icon in dept_data:
            existing = db.query(Department).filter(Department.name == name).first()
            if not existing:
                d = Department(name=name, description=desc, icon=icon)
                db.add(d)
                db.flush()
                dept_map[name] = d
                print(f"✅ Department: {name}")
            else:
                dept_map[name] = existing
        db.commit()

        # ── Doctors ────────────────────────────────────────────────────────────
        doctors_data = [
            ("Dr. Arjun Sharma",  "arjun@medicare.com",   "Cardiology",       "MD, DM Cardiology",    12, 1500.0),
            ("Dr. Priya Nair",    "priya@medicare.com",   "Neurology",        "MD, DM Neurology",      8, 1200.0),
            ("Dr. Ravi Kumar",    "ravi@medicare.com",    "Orthopedics",      "MS Orthopedics",        15, 1000.0),
            ("Dr. Sunita Patel",  "sunita@medicare.com",  "Pediatrics",       "MD Pediatrics",         10,  800.0),
            ("Dr. Anand Reddy",   "anand@medicare.com",   "General Medicine", "MBBS, MD",               6,  600.0),
            ("Dr. Meena Iyer",    "meena@medicare.com",   "Gynecology",       "MS Gynecology",          9,  900.0),
            ("Dr. Suresh Babu",   "suresh@medicare.com",  "Dermatology",      "MD Dermatology",         7,  700.0),
            ("Dr. Kavitha Rao",   "kavitha@medicare.com", "Ophthalmology",    "MS Ophthalmology",      11,  850.0),
        ]
        for full_name, email, dept_name, qual, exp, fee in doctors_data:
            if not db.query(User).filter(User.email == email).first():
                u = User(email=email, hashed_password=get_password_hash("doctor123"),
                         role=UserRole.DOCTOR, is_active=True, is_verified=True)
                db.add(u)
                db.flush()
                dept = dept_map.get(dept_name)
                doc = Doctor(
                    user_id=u.id, full_name=full_name,
                    specialization=dept_name, qualification=qual,
                    experience=exp, consultation_fee=fee,
                    is_verified=True,
                    department_id=dept.id if dept else None,
                )
                db.add(doc)
                db.flush()
                for day in [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                            DayOfWeek.THURSDAY, DayOfWeek.FRIDAY]:
                    db.add(DoctorSchedule(
                        doctor_id=doc.id, day_of_week=day,
                        start_time=time(9, 0), end_time=time(17, 0),
                        slot_duration=30, max_appointments=16,
                    ))
                print(f"✅ Doctor: {full_name} ({email} / doctor123)")
        db.commit()

        # ── Patients ───────────────────────────────────────────────────────────
        patients_data = [
            ("patient@medicare.com", "John Patient",   "MALE",   35, "O+",  "+91 9876543210", "Chennai"),
            ("jane@medicare.com",    "Jane Patient",   "FEMALE", 28, "A+",  "+91 9876543211", "Mumbai"),
            ("ram@medicare.com",     "Ram Kumar",      "MALE",   45, "B+",  "+91 9876543212", "Delhi"),
        ]
        for email, name, gender, age, blood, phone, addr in patients_data:
            if not db.query(User).filter(User.email == email).first():
                pu = User(email=email, hashed_password=get_password_hash("patient123"),
                          role=UserRole.PATIENT, is_active=True, is_verified=True)
                db.add(pu)
                db.flush()
                db.add(Patient(
                    user_id=pu.id, full_name=name, gender=gender,
                    age=age, blood_group=blood, phone=phone, address=addr,
                ))
                print(f"✅ Patient: {email} / patient123")
        db.commit()

        # ── Phase 2: Wards & Beds ──────────────────────────────────────────────
        wards_data = [
            ("General Ward A",  WardType.GENERAL,   1, 20),
            ("General Ward B",  WardType.GENERAL,   1, 20),
            ("ICU",             WardType.ICU,        2, 10),
            ("Emergency Ward",  WardType.EMERGENCY,  1, 15),
            ("Maternity Ward",  WardType.MATERNITY,  3,  8),
            ("Pediatric Ward",  WardType.PEDIATRIC,  2, 10),
        ]
        for ward_name, wtype, floor, total in wards_data:
            existing = db.query(Ward).filter(Ward.name == ward_name).first()
            if not existing:
                ward = Ward(name=ward_name, ward_type=wtype, floor=floor, total_beds=total)
                db.add(ward)
                db.flush()
                for i in range(1, total + 1):
                    bed_num = f"{ward_name[:1]}{floor}-{i:02d}"
                    status  = BedStatus.OCCUPIED if i <= total // 3 else BedStatus.AVAILABLE
                    db.add(HospitalBed(
                        ward_id=ward.id, bed_number=bed_num,
                        bed_type="ICU" if wtype == WardType.ICU else "STANDARD",
                        status=status,
                    ))
                print(f"✅ Ward: {ward_name} ({total} beds)")
        db.commit()

        print("\n🎉 Seeding complete!\n")
        print("Demo Accounts:")
        print("  Admin    → admin@medicare.com   / admin123")
        print("  Doctor   → arjun@medicare.com   / doctor123  (8 doctors total)")
        print("  Patient  → patient@medicare.com / patient123 (3 patients total)")
        print("\nPhase 2 Data:")
        print("  6 Wards + Beds seeded")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback; traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
