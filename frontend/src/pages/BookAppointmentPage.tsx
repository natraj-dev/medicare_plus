import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ChevronLeft, Calendar, Clock, Star } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { PageSpinner } from '../components/ui/index'

export default function BookAppointmentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedDoctorId = searchParams.get('doctor_id')

  const [doctors, setDoctors]             = useState<any[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading]   = useState(false)
  const [submitting, setSubmitting]       = useState(false)

  const [form, setForm] = useState({
    doctor_id:        preselectedDoctorId || '',
    appointment_date: '',
    appointment_time: '',
    appointment_type: 'IN_PERSON',
    reason:           '',
    symptoms:         '',
    duration_minutes: 30,
  })

  // Load doctors
  useEffect(() => {
    api.get('/doctors?limit=100').then(r => setDoctors(r.data)).catch(() => {})
  }, [])

  // Update selected doctor
  useEffect(() => {
    if (form.doctor_id) {
      const doc = doctors.find(d => d.id === Number(form.doctor_id))
      setSelectedDoctor(doc || null)
    } else {
      setSelectedDoctor(null)
    }
    setForm(f => ({ ...f, appointment_time: '' }))
    setAvailableSlots([])
  }, [form.doctor_id, doctors])

  // Fetch available slots when doctor + date chosen
  useEffect(() => {
    if (!form.doctor_id || !form.appointment_date) {
      setAvailableSlots([])
      return
    }
    setSlotsLoading(true)
    api.get('/appointments/slots', {
      params: { doctor_id: Number(form.doctor_id), appointment_date: form.appointment_date },
    })
      .then(r => setAvailableSlots(r.data.available_slots || []))
      .catch(() => setAvailableSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [form.doctor_id, form.appointment_date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.doctor_id)        { toast.error('Please select a doctor');      return }
    if (!form.appointment_date) { toast.error('Please select a date');        return }
    if (!form.appointment_time) { toast.error('Please select a time slot');   return }

    setSubmitting(true)
    try {
      await api.post('/appointments', {
        ...form,
        doctor_id:        Number(form.doctor_id),
        duration_minutes: Number(form.duration_minutes),
      })
      toast.success('Appointment booked successfully!')
      navigate('/appointments')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to book appointment')
    }
    setSubmitting(false)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <Link to="/appointments" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft size={16} /> Back to Appointments
      </Link>

      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Book Appointment</h1>
        <p className="text-gray-500 text-sm mt-1">Schedule a visit with one of our specialists</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Doctor selection */}
        <div className="card p-5 space-y-4">
          <h2 className="font-display font-semibold text-gray-900">Select Doctor</h2>
          <div>
            <label className="label">Doctor *</label>
            <select
              className="input"
              value={form.doctor_id}
              onChange={e => setForm({ ...form, doctor_id: e.target.value, appointment_time: '' })}
              required>
              <option value="">— Choose a doctor —</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.full_name} — {d.specialization} (₹{d.consultation_fee})
                </option>
              ))}
            </select>
          </div>

          {/* Doctor preview */}
          {selectedDoctor && (
            <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-lg shrink-0">
                {selectedDoctor.full_name?.[0]}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{selectedDoctor.full_name}</div>
                <div className="text-sm text-gray-600">{selectedDoctor.specialization}</div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  <span className="flex items-center gap-0.5">
                    <Star size={11} className="text-yellow-400 fill-yellow-400" />
                    {selectedDoctor.rating?.toFixed(1)}
                  </span>
                  <span>{selectedDoctor.experience} yrs exp</span>
                  <span className="text-green-600 font-medium">₹{selectedDoctor.consultation_fee}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div className="card p-5 space-y-4">
          <h2 className="font-display font-semibold text-gray-900">Date & Time</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label"><Calendar size={13} className="inline mr-1" />Date *</label>
              <input
                type="date"
                className="input"
                min={today}
                value={form.appointment_date}
                onChange={e => setForm({ ...form, appointment_date: e.target.value, appointment_time: '' })}
                required />
            </div>
            <div>
              <label className="label"><Clock size={13} className="inline mr-1" />Appointment Type</label>
              <select className="input" value={form.appointment_type}
                onChange={e => setForm({ ...form, appointment_type: e.target.value })}>
                <option value="IN_PERSON">In Person</option>
                <option value="ONLINE">Online / Video</option>
              </select>
            </div>
          </div>

          {/* Time slots */}
          {form.doctor_id && form.appointment_date && (
            <div>
              <label className="label"><Clock size={13} className="inline mr-1" />Available Time Slots *</label>
              {slotsLoading ? (
                <div className="text-sm text-gray-400 py-2">Loading available slots...</div>
              ) : availableSlots.length === 0 ? (
                <div className="bg-red-50 rounded-xl p-3 text-sm text-red-600">
                  No available slots for this date. Please choose a different date.
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {availableSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setForm({ ...form, appointment_time: slot })}
                      className={`py-2 rounded-xl text-sm border transition-all font-medium ${
                        form.appointment_time === slot
                          ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-600'
                      }`}>
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="card p-5 space-y-4">
          <h2 className="font-display font-semibold text-gray-900">Visit Details</h2>

          <div>
            <label className="label">Reason for Visit</label>
            <input
              className="input"
              placeholder="e.g. Routine checkup, follow-up, specific concern..."
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })} />
          </div>

          <div>
            <label className="label">Symptoms (optional)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Describe your symptoms in detail..."
              value={form.symptoms}
              onChange={e => setForm({ ...form, symptoms: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !form.appointment_time}
            className="btn-primary flex-1 py-3 text-base disabled:opacity-50">
            {submitting ? 'Booking...' : 'Confirm Booking'}
          </button>
          <Link to="/appointments" className="btn-secondary px-8 py-3">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
