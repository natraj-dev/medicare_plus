import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Calendar, Clock, User, Stethoscope, FileText,
  CheckCircle, XCircle, Edit3, Pill, AlertTriangle
} from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { StatusBadge, InfoRow, Modal, ConfirmDialog, PageSpinner } from '../components/ui/index'

export default function AppointmentDetailPage() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCancel, setShowCancel] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleForm, setRescheduleForm] = useState({ new_date: '', new_time: '' })
  const [slots, setSlots] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const fetchDetail = () => {
    api.get(`/appointments/${id}/detail`)
      .then(r => setDetail(r.data))
      .catch(() => toast.error('Failed to load appointment'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDetail() }, [id])

  useEffect(() => {
    if (rescheduleForm.new_date && detail?.appointment?.doctor_id) {
      api.get('/appointments/slots', {
        params: { doctor_id: detail.appointment.doctor_id, appointment_date: rescheduleForm.new_date }
      }).then(r => setSlots(r.data.available_slots || [])).catch(() => setSlots([]))
    }
  }, [rescheduleForm.new_date, detail])

  const cancel = async () => {
    setSubmitting(true)
    try {
      await api.delete(`/appointments/${id}`)
      toast.success('Appointment cancelled')
      navigate('/appointments')
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const confirm = async () => {
    try {
      await api.put(`/appointments/${id}/confirm`)
      toast.success('Appointment confirmed')
      fetchDetail()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const complete = async () => {
    try {
      await api.put(`/appointments/${id}/complete`)
      toast.success('Marked as completed')
      fetchDetail()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const reschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.put(`/appointments/${id}/reschedule`, null, {
        params: { new_date: rescheduleForm.new_date, new_time: rescheduleForm.new_time }
      })
      toast.success('Appointment rescheduled')
      setShowReschedule(false)
      fetchDetail()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  if (loading) return <PageSpinner />
  if (!detail) return <div className="text-center text-gray-400 py-20">Appointment not found</div>

  const { appointment: appt, patient, doctor, consultation } = detail
  const isDoctor = user?.role === 'DOCTOR'
  const isPatient = user?.role === 'PATIENT'
  const canCancel = ['PENDING', 'CONFIRMED'].includes(appt.status)
  const canConfirm = isDoctor && appt.status === 'PENDING'
  const canComplete = isDoctor && appt.status === 'CONFIRMED'
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <Link to="/appointments" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft size={16} /> Back to Appointments
      </Link>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-xl font-display font-bold text-gray-900">Appointment #{appt.id}</h1>
              <StatusBadge status={appt.status} />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-primary-500" />
                {format(new Date(appt.appointment_date), 'EEEE, MMMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-primary-500" />
                {appt.appointment_time} ({appt.duration_minutes} min)
              </span>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {canConfirm && (
              <button onClick={confirm} className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3">
                <CheckCircle size={14} /> Confirm
              </button>
            )}
            {canComplete && (
              <button onClick={complete} className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3 bg-green-600 hover:bg-green-700">
                <CheckCircle size={14} /> Mark Complete
              </button>
            )}
            {isDoctor && appt.status === 'COMPLETED' && !consultation && (
              <Link to={`/consultation/new?appointment_id=${appt.id}&patient_id=${patient?.id}`}
                className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3">
                <Stethoscope size={14} /> Add Consultation
              </Link>
            )}
            {isDoctor && (
              <Link to={`/prescriptions/write?patient_id=${patient?.id}&appointment_id=${appt.id}`}
                className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3">
                <Pill size={14} /> Write Rx
              </Link>
            )}
            {canCancel && (
              <button onClick={() => setShowCancel(true)}
                className="flex items-center gap-1.5 text-sm text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors">
                <XCircle size={14} /> Cancel
              </button>
            )}
            {isPatient && canCancel && (
              <button onClick={() => setShowReschedule(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors">
                <Edit3 size={14} /> Reschedule
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Appointment info */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-primary-600" /> Appointment Details
          </h2>
          <InfoRow label="Type" value={appt.appointment_type?.replace('_', ' ')} />
          <InfoRow label="Reason" value={appt.reason} />
          <InfoRow label="Symptoms" value={appt.symptoms} />
          <InfoRow label="Notes" value={appt.notes} />
          <InfoRow label="Created" value={format(new Date(appt.created_at), 'MMM d, yyyy HH:mm')} />
        </div>

        {/* Patient info */}
        {patient && (
          <div className="card p-5">
            <h2 className="font-display font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User size={16} className="text-blue-600" /> Patient Information
            </h2>
            <InfoRow label="Name" value={patient.full_name} />
            <InfoRow label="Age / Gender" value={`${patient.age || '—'} / ${patient.gender || '—'}`} />
            <InfoRow label="Blood Group" value={patient.blood_group} />
            <InfoRow label="Phone" value={patient.phone} />
            <InfoRow label="Allergies" value={patient.allergies} />
            <InfoRow label="Conditions" value={patient.chronic_conditions} />
          </div>
        )}

        {/* Doctor info */}
        {doctor && (
          <div className="card p-5">
            <h2 className="font-display font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Stethoscope size={16} className="text-green-600" /> Doctor Information
            </h2>
            <InfoRow label="Name" value={doctor.full_name} />
            <InfoRow label="Specialization" value={doctor.specialization} />
            <InfoRow label="Qualification" value={doctor.qualification} />
            <InfoRow label="Phone" value={doctor.phone} />
          </div>
        )}

        {/* Consultation */}
        {consultation ? (
          <div className="card p-5">
            <h2 className="font-display font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-purple-600" /> Consultation Notes
            </h2>
            <InfoRow label="Diagnosis" value={consultation.diagnosis} />
            <InfoRow label="Treatment Plan" value={consultation.treatment_plan} />
            <InfoRow label="Doctor Notes" value={consultation.doctor_notes} />
            <InfoRow label="Follow-up" value={consultation.follow_up_date} />
          </div>
        ) : appt.status === 'COMPLETED' && (
          <div className="card p-5 flex items-center gap-3 text-gray-400">
            <AlertTriangle size={20} />
            <span className="text-sm">No consultation notes added yet</span>
          </div>
        )}
      </div>

      {/* Cancel dialog */}
      <ConfirmDialog
        open={showCancel} onClose={() => setShowCancel(false)} onConfirm={cancel}
        title="Cancel Appointment" danger
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        confirmLabel="Yes, Cancel"
      />

      {/* Reschedule modal */}
      <Modal open={showReschedule} onClose={() => setShowReschedule(false)} title="Reschedule Appointment">
        <form onSubmit={reschedule} className="space-y-4">
          <div>
            <label className="label">New Date *</label>
            <input type="date" className="input" min={today}
              value={rescheduleForm.new_date}
              onChange={e => setRescheduleForm({ ...rescheduleForm, new_date: e.target.value })} required />
          </div>
          {rescheduleForm.new_date && (
            <div>
              <label className="label">New Time *</label>
              {slots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map(s => (
                    <button key={s} type="button"
                      onClick={() => setRescheduleForm({ ...rescheduleForm, new_time: s })}
                      className={`py-1.5 rounded-lg text-sm border transition-colors ${
                        rescheduleForm.new_time === s
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-200 hover:border-primary-300 text-gray-700'
                      }`}>{s}</button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No available slots for this date</p>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting || !rescheduleForm.new_time} className="btn-primary flex-1">
              {submitting ? 'Rescheduling...' : 'Confirm Reschedule'}
            </button>
            <button type="button" onClick={() => setShowReschedule(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
