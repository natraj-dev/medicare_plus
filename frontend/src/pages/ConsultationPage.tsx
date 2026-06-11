import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ChevronLeft, Stethoscope, User, Calendar } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { InfoRow, PageSpinner } from '../components/ui/index'

export default function ConsultationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const appointmentId = searchParams.get('appointment_id')
  const patientId = searchParams.get('patient_id')

  const [appointment, setAppointment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    appointment_id: Number(appointmentId),
    diagnosis: '',
    treatment_plan: '',
    doctor_notes: '',
    follow_up_date: '',
  })

  useEffect(() => {
    if (appointmentId) {
      api.get(`/appointments/${appointmentId}/detail`)
        .then(r => setAppointment(r.data))
        .catch(() => toast.error('Failed to load appointment'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [appointmentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.appointment_id) { toast.error('Appointment ID is required'); return }
    setSubmitting(true)
    try {
      const payload: any = { ...form }
      if (!payload.follow_up_date) delete payload.follow_up_date
      await api.post('/consultations', payload)
      toast.success('Consultation saved successfully')
      navigate(`/appointments/${appointmentId}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save consultation')
    }
    setSubmitting(false)
  }

  if (loading) return <PageSpinner />

  const patient = appointment?.patient
  const appt = appointment?.appointment

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <Link to={appointmentId ? `/appointments/${appointmentId}` : '/appointments'}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft size={16} /> Back to Appointment
      </Link>

      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Add Consultation Notes</h1>
        <p className="text-gray-500 text-sm mt-1">Document diagnosis, treatment and follow-up</p>
      </div>

      {/* Appointment summary */}
      {appt && (
        <div className="card p-4 bg-blue-50 border-blue-100">
          <div className="flex items-center gap-3 flex-wrap text-sm text-blue-700">
            <span className="flex items-center gap-1"><Calendar size={14} />{appt.appointment_date} at {appt.appointment_time}</span>
            {patient && <span className="flex items-center gap-1"><User size={14} />{patient.full_name}</span>}
          </div>
          {appt.reason && <p className="text-xs text-blue-600 mt-1">Reason: {appt.reason}</p>}
          {patient?.allergies && (
            <p className="text-xs text-red-600 mt-1 font-medium">⚠️ Allergies: {patient.allergies}</p>
          )}
        </div>
      )}

      {/* Patient quick info */}
      {patient && (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User size={15} className="text-blue-600" /> Patient Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              ['Age', patient.age],
              ['Gender', patient.gender],
              ['Blood Group', patient.blood_group],
              ['Phone', patient.phone],
            ].map(([label, val]) => (
              <div key={label as string}>
                <div className="text-xs text-gray-500">{label}</div>
                <div className="font-medium text-gray-800">{val || '—'}</div>
              </div>
            ))}
          </div>
          {patient.chronic_conditions && (
            <div className="mt-3 bg-yellow-50 rounded-lg p-2 text-xs text-yellow-800">
              <strong>Chronic Conditions:</strong> {patient.chronic_conditions}
            </div>
          )}
        </div>
      )}

      {/* Consultation form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <h2 className="font-display font-semibold text-gray-900 flex items-center gap-2">
          <Stethoscope size={16} className="text-green-600" /> Consultation Details
        </h2>

        {!appointmentId && (
          <div>
            <label className="label">Appointment ID *</label>
            <input type="number" className="input" placeholder="Enter appointment ID"
              value={form.appointment_id || ''} onChange={e => setForm({ ...form, appointment_id: Number(e.target.value) })} required />
          </div>
        )}

        <div>
          <label className="label">Diagnosis</label>
          <textarea className="input" rows={3} placeholder="Enter diagnosis and findings..."
            value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} />
        </div>

        <div>
          <label className="label">Treatment Plan</label>
          <textarea className="input" rows={3} placeholder="Describe the treatment plan, medications prescribed, procedures..."
            value={form.treatment_plan} onChange={e => setForm({ ...form, treatment_plan: e.target.value })} />
        </div>

        <div>
          <label className="label">Doctor's Private Notes</label>
          <textarea className="input" rows={2} placeholder="Additional clinical notes (visible only to doctor)..."
            value={form.doctor_notes} onChange={e => setForm({ ...form, doctor_notes: e.target.value })} />
        </div>

        <div>
          <label className="label">Follow-up Date (optional)</label>
          <input type="date" className="input"
            min={new Date().toISOString().split('T')[0]}
            value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary flex-1 py-2.5">
            {submitting ? 'Saving...' : 'Save Consultation'}
          </button>
          <Link to={appointmentId ? `/appointments/${appointmentId}` : '/appointments'}
            className="btn-secondary px-6 py-2.5">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
