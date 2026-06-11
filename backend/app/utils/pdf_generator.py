"""
PDF generation utilities for MediCare Plus.
Generates: Prescription PDFs, Billing Invoice PDFs, Medical Report PDFs.
"""
import io
from datetime import datetime
from typing import Any, Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


# ── Brand colours ──────────────────────────────────────────────────────────────
PRIMARY   = colors.HexColor("#2563eb")
PRIMARY_L = colors.HexColor("#eff6ff")
SUCCESS   = colors.HexColor("#059669")
DANGER    = colors.HexColor("#dc2626")
MUTED     = colors.HexColor("#6b7280")
LIGHT     = colors.HexColor("#f9fafb")
BORDER    = colors.HexColor("#e5e7eb")
WHITE     = colors.white
BLACK     = colors.HexColor("#111827")


def _base_doc(buffer: io.BytesIO) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=20*mm, bottomMargin=20*mm,
    )


def _styles():
    s = getSampleStyleSheet()
    custom = {
        "title":   ParagraphStyle("title",   parent=s["Normal"], fontSize=18, textColor=PRIMARY,  fontName="Helvetica-Bold", spaceAfter=2),
        "sub":     ParagraphStyle("sub",     parent=s["Normal"], fontSize=9,  textColor=MUTED,    spaceAfter=10),
        "h2":      ParagraphStyle("h2",      parent=s["Normal"], fontSize=11, textColor=BLACK,    fontName="Helvetica-Bold", spaceBefore=8, spaceAfter=4),
        "label":   ParagraphStyle("label",   parent=s["Normal"], fontSize=8,  textColor=MUTED,    fontName="Helvetica-Bold"),
        "value":   ParagraphStyle("value",   parent=s["Normal"], fontSize=9,  textColor=BLACK),
        "small":   ParagraphStyle("small",   parent=s["Normal"], fontSize=7,  textColor=MUTED),
        "center":  ParagraphStyle("center",  parent=s["Normal"], fontSize=9,  textColor=BLACK,    alignment=TA_CENTER),
        "right":   ParagraphStyle("right",   parent=s["Normal"], fontSize=9,  textColor=BLACK,    alignment=TA_RIGHT),
        "bold":    ParagraphStyle("bold",    parent=s["Normal"], fontSize=9,  textColor=BLACK,    fontName="Helvetica-Bold"),
    }
    return custom


def _header(story, styles, subtitle: str):
    """Common letterhead for all PDFs."""
    header_data = [[
        Paragraph("🏥 MediCare Plus", styles["title"]),
        Paragraph(f"<b>{subtitle}</b>", ParagraphStyle("rh", parent=styles["value"], alignment=TA_RIGHT, fontSize=10)),
    ]]
    t = Table(header_data, colWidths=["60%", "40%"])
    t.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("GRID", (0,0), (-1,-1), 0, WHITE)]))
    story.append(t)
    story.append(Paragraph("Hospital & Appointment Management Platform", styles["sub"]))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=8))


def _info_table(pairs: list[tuple[str, str]], styles, cols=2) -> Table:
    """Render key-value pairs in a neat grid."""
    rows, row = [], []
    for i, (k, v) in enumerate(pairs):
        cell = [Paragraph(k, styles["label"]), Paragraph(str(v) if v else "—", styles["value"])]
        row.append(cell)
        if len(row) == cols or i == len(pairs) - 1:
            while len(row) < cols:
                row.append(["", ""])
            rows.append(row)
            row = []

    col_w = 170 / cols * mm / 10  # approximate
    t = Table([[item for item in r] for r in rows])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), LIGHT),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [LIGHT, WHITE]),
        ("GRID", (0,0), (-1,-1), 0.5, BORDER),
        ("PADDING", (0,0), (-1,-1), 6),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
    ]))
    return t


# ── Prescription PDF ───────────────────────────────────────────────────────────

def generate_prescription_pdf(prescription: Any, patient: Any, doctor: Any) -> bytes:
    import json
    buffer = io.BytesIO()
    doc    = _base_doc(buffer)
    s      = _styles()
    story  = []

    _header(story, s, "PRESCRIPTION")
    story.append(Spacer(1, 4))

    # Patient + Doctor info
    story.append(Paragraph("Patient Information", s["h2"]))
    story.append(_info_table([
        ("Patient Name",  getattr(patient, "full_name", "—")),
        ("Age / Gender",  f"{getattr(patient,'age','—')} / {getattr(patient,'gender','—')}"),
        ("Blood Group",   getattr(patient, "blood_group", "—")),
        ("Phone",         getattr(patient, "phone", "—")),
        ("Prescription #",f"RX-{prescription.id:05d}"),
        ("Date",          prescription.created_at.strftime("%d %b %Y") if prescription.created_at else "—"),
        ("Valid Until",   str(prescription.valid_until) if prescription.valid_until else "Open"),
        ("Status",        "Active" if prescription.is_active else "Expired"),
    ], s))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Prescribed By", s["h2"]))
    story.append(_info_table([
        ("Doctor Name",     getattr(doctor, "full_name", "—")),
        ("Specialization",  getattr(doctor, "specialization", "—")),
        ("Qualification",   getattr(doctor, "qualification", "—")),
        ("Contact",         getattr(doctor, "phone", "—")),
    ], s))
    story.append(Spacer(1, 8))

    # Medications table
    story.append(Paragraph("Medications", s["h2"]))
    try:
        meds = json.loads(prescription.medications) if isinstance(prescription.medications, str) else []
    except Exception:
        meds = []

    if meds:
        rows = [[
            Paragraph("<b>#</b>",           s["center"]),
            Paragraph("<b>Medicine</b>",    s["bold"]),
            Paragraph("<b>Dosage</b>",      s["bold"]),
            Paragraph("<b>Frequency</b>",   s["bold"]),
            Paragraph("<b>Duration</b>",    s["bold"]),
            Paragraph("<b>Instructions</b>",s["bold"]),
        ]]
        for i, m in enumerate(meds, 1):
            rows.append([
                Paragraph(str(i), s["center"]),
                Paragraph(m.get("name",""), s["value"]),
                Paragraph(m.get("dosage",""), s["value"]),
                Paragraph(m.get("frequency",""), s["value"]),
                Paragraph(m.get("duration",""), s["value"]),
                Paragraph(m.get("instructions",""), s["small"]),
            ])
        med_table = Table(rows, colWidths=[10*mm, 45*mm, 25*mm, 30*mm, 25*mm, 35*mm])
        med_table.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), PRIMARY),
            ("TEXTCOLOR",  (0,0), (-1,0), WHITE),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, PRIMARY_L]),
            ("GRID",  (0,0), (-1,-1), 0.5, BORDER),
            ("PADDING",(0,0),(-1,-1), 6),
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ]))
        story.append(med_table)
    else:
        story.append(Paragraph("No medications listed.", s["value"]))

    if prescription.instructions:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Special Instructions", s["h2"]))
        story.append(Paragraph(prescription.instructions, s["value"]))

    # Footer
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f"Generated by MediCare Plus on {datetime.now().strftime('%d %b %Y %H:%M')} • "
        "This prescription is computer-generated. Verify with your doctor.",
        s["small"]
    ))

    doc.build(story)
    return buffer.getvalue()


# ── Billing / Invoice PDF ──────────────────────────────────────────────────────

def generate_invoice_pdf(billing: Any, patient: Any) -> bytes:
    buffer = io.BytesIO()
    doc    = _base_doc(buffer)
    s      = _styles()
    story  = []

    _header(story, s, "TAX INVOICE")
    story.append(Spacer(1, 4))

    story.append(_info_table([
        ("Invoice No.",   billing.invoice_number),
        ("Date",         billing.created_at.strftime("%d %b %Y") if billing.created_at else "—"),
        ("Patient Name", getattr(patient, "full_name", "—")),
        ("Phone",        getattr(patient, "phone", "—")),
        ("Payment Status", billing.payment_status),
        ("Payment Method", billing.payment_method or "—"),
    ], s))
    story.append(Spacer(1, 10))

    # Line items
    story.append(Paragraph("Bill Details", s["h2"]))
    rows = [[
        Paragraph("<b>Description</b>", s["bold"]),
        Paragraph("<b>Amount (₹)</b>",  ParagraphStyle("ra", parent=s["bold"], alignment=TA_RIGHT)),
    ]]
    items = [
        ("Consultation Fee",  billing.consultation_fee),
        ("Laboratory Charges",billing.lab_fee),
        ("Medication Charges",billing.medication_fee),
        ("Other Charges",     billing.other_charges),
    ]
    for label, amt in items:
        if amt and amt > 0:
            rows.append([
                Paragraph(label, s["value"]),
                Paragraph(f"₹ {amt:,.2f}", ParagraphStyle("ra2", parent=s["value"], alignment=TA_RIGHT)),
            ])

    if billing.discount:
        rows.append([
            Paragraph("Discount", s["value"]),
            Paragraph(f"- ₹ {billing.discount:,.2f}", ParagraphStyle("disc", parent=s["value"], textColor=SUCCESS, alignment=TA_RIGHT)),
        ])
    if billing.tax:
        rows.append([
            Paragraph(f"Tax ({billing.tax}%)", s["value"]),
            Paragraph(f"₹ {(billing.total_amount - (billing.consultation_fee + billing.lab_fee + billing.medication_fee + billing.other_charges - billing.discount)):,.2f}",
                      ParagraphStyle("tax", parent=s["value"], alignment=TA_RIGHT)),
        ])

    # Total
    rows.append([
        Paragraph("<b>TOTAL AMOUNT</b>", ParagraphStyle("tot", parent=s["bold"], fontSize=11)),
        Paragraph(f"<b>₹ {billing.total_amount:,.2f}</b>",
                  ParagraphStyle("totr", parent=s["bold"], fontSize=11, alignment=TA_RIGHT)),
    ])
    rows.append([
        Paragraph("Amount Paid", s["value"]),
        Paragraph(f"₹ {billing.paid_amount:,.2f}", ParagraphStyle("paid", parent=s["value"], textColor=SUCCESS, alignment=TA_RIGHT)),
    ])
    due = billing.total_amount - billing.paid_amount
    if due > 0:
        rows.append([
            Paragraph("<b>Balance Due</b>", s["bold"]),
            Paragraph(f"<b>₹ {due:,.2f}</b>",
                      ParagraphStyle("due", parent=s["bold"], textColor=DANGER, alignment=TA_RIGHT)),
        ])

    bill_tbl = Table(rows, colWidths=[120*mm, 50*mm])
    bill_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), PRIMARY),
        ("TEXTCOLOR",  (0,0), (-1,0), WHITE),
        ("ROWBACKGROUNDS",(0,1),(-1,-4),[WHITE, PRIMARY_L]),
        ("BACKGROUND", (0,-3), (-1,-3), colors.HexColor("#1e3a8a")),
        ("TEXTCOLOR",  (0,-3), (-1,-3), WHITE),
        ("LINEBELOW", (0,-1), (-1,-1), 1, BORDER),
        ("GRID", (0,0), (-1,-1), 0.5, BORDER),
        ("PADDING",(0,0),(-1,-1), 8),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ]))
    story.append(bill_tbl)

    if billing.notes:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Notes", s["h2"]))
        story.append(Paragraph(billing.notes, s["value"]))

    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f"Generated by MediCare Plus on {datetime.now().strftime('%d %b %Y %H:%M')} • "
        "Thank you for choosing MediCare Plus.",
        s["small"]
    ))
    doc.build(story)
    return buffer.getvalue()


# ── Appointment Report PDF ─────────────────────────────────────────────────────

def generate_appointment_report_pdf(appointments: list, title: str = "Appointment Report") -> bytes:
    buffer = io.BytesIO()
    doc    = _base_doc(buffer)
    s      = _styles()
    story  = []

    _header(story, s, title.upper())
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%d %b %Y %H:%M')}  •  Total: {len(appointments)} records", s["sub"]))
    story.append(Spacer(1, 6))

    if not appointments:
        story.append(Paragraph("No records found.", s["value"]))
        doc.build(story)
        return buffer.getvalue()

    rows = [[
        Paragraph("<b>#</b>",        s["center"]),
        Paragraph("<b>Date</b>",     s["bold"]),
        Paragraph("<b>Time</b>",     s["bold"]),
        Paragraph("<b>Patient ID</b>",s["bold"]),
        Paragraph("<b>Doctor ID</b>",s["bold"]),
        Paragraph("<b>Type</b>",     s["bold"]),
        Paragraph("<b>Status</b>",   s["bold"]),
        Paragraph("<b>Reason</b>",   s["bold"]),
    ]]

    STATUS_COLORS_MAP = {
        "COMPLETED": SUCCESS, "CANCELLED": DANGER,
        "CONFIRMED": PRIMARY, "PENDING": colors.HexColor("#d97706"),
    }
    for i, a in enumerate(appointments, 1):
        sc = STATUS_COLORS_MAP.get(str(a.status).upper(), BLACK)
        rows.append([
            Paragraph(str(i), s["center"]),
            Paragraph(str(a.appointment_date), s["value"]),
            Paragraph(str(a.appointment_time)[:5], s["value"]),
            Paragraph(str(a.patient_id), s["value"]),
            Paragraph(str(a.doctor_id), s["value"]),
            Paragraph(str(a.appointment_type).replace("_"," "), s["small"]),
            Paragraph(str(a.status), ParagraphStyle("sc", parent=s["small"], textColor=sc, fontName="Helvetica-Bold")),
            Paragraph((a.reason or "")[:40], s["small"]),
        ])

    tbl = Table(rows, colWidths=[8*mm, 22*mm, 14*mm, 20*mm, 20*mm, 20*mm, 22*mm, 44*mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), PRIMARY),
        ("TEXTCOLOR",  (0,0), (-1,0), WHITE),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE, PRIMARY_L]),
        ("GRID",(0,0),(-1,-1),0.5,BORDER),
        ("PADDING",(0,0),(-1,-1),5),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ]))
    story.append(tbl)

    doc.build(story)
    return buffer.getvalue()


# ── Medical Summary PDF ────────────────────────────────────────────────────────

def generate_medical_summary_pdf(patient: Any, appointments: list, records: list, prescriptions: list) -> bytes:
    import json
    buffer = io.BytesIO()
    doc    = _base_doc(buffer)
    s      = _styles()
    story  = []

    _header(story, s, "MEDICAL SUMMARY")
    story.append(Spacer(1, 4))

    story.append(Paragraph("Patient Details", s["h2"]))
    story.append(_info_table([
        ("Full Name",   getattr(patient, "full_name", "—")),
        ("Age",         str(getattr(patient, "age", "—"))),
        ("Gender",      getattr(patient, "gender", "—") or "—"),
        ("Blood Group", getattr(patient, "blood_group", "—") or "—"),
        ("Phone",       getattr(patient, "phone", "—") or "—"),
        ("Address",     getattr(patient, "address", "—") or "—"),
        ("Allergies",   getattr(patient, "allergies", "None") or "None"),
        ("Conditions",  getattr(patient, "chronic_conditions", "None") or "None"),
    ], s))

    if appointments:
        story.append(Spacer(1, 8))
        story.append(Paragraph(f"Appointment History ({len(appointments)} records)", s["h2"]))
        rows = [[Paragraph(h, s["bold"]) for h in ["Date", "Time", "Type", "Status", "Reason"]]]
        for a in appointments[:20]:
            rows.append([
                Paragraph(str(a.appointment_date), s["value"]),
                Paragraph(str(a.appointment_time)[:5], s["value"]),
                Paragraph(str(a.appointment_type).replace("_"," "), s["small"]),
                Paragraph(str(a.status), s["small"]),
                Paragraph((a.reason or "")[:50], s["small"]),
            ])
        at = Table(rows, colWidths=[28*mm, 18*mm, 28*mm, 25*mm, 71*mm])
        at.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),PRIMARY),("TEXTCOLOR",(0,0),(-1,0),WHITE),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,PRIMARY_L]),
            ("GRID",(0,0),(-1,-1),0.5,BORDER),("PADDING",(0,0),(-1,-1),5),
        ]))
        story.append(at)

    if records:
        story.append(Spacer(1, 8))
        story.append(Paragraph(f"Medical Records ({len(records)} files)", s["h2"]))
        rows = [[Paragraph(h, s["bold"]) for h in ["Type","Title","Date","Doctor","Hospital"]]]
        for r in records[:15]:
            rows.append([
                Paragraph(r.record_type, s["small"]),
                Paragraph(r.title[:40], s["value"]),
                Paragraph(str(r.record_date), s["small"]),
                Paragraph((r.doctor_name or "")[:25], s["small"]),
                Paragraph((r.hospital_name or "")[:25], s["small"]),
            ])
        rt = Table(rows, colWidths=[28*mm, 50*mm, 22*mm, 34*mm, 36*mm])
        rt.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),PRIMARY),("TEXTCOLOR",(0,0),(-1,0),WHITE),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,PRIMARY_L]),
            ("GRID",(0,0),(-1,-1),0.5,BORDER),("PADDING",(0,0),(-1,-1),5),
        ]))
        story.append(rt)

    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f"Confidential Medical Summary • MediCare Plus • {datetime.now().strftime('%d %b %Y %H:%M')}",
        s["small"]
    ))
    doc.build(story)
    return buffer.getvalue()
