import { useState, useEffect } from 'react'
import { Video, Plus, X, ExternalLink, Clock, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Modal, PageSpinner, EmptyState, StatusBadge } from '../components/ui/index'

export default function TelemedicinePage() {
  const { user } = useAuthStore()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [joining, setJoining]   = useState<number | null>(null)
  const [doctors, setDoctors]   = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [form, setForm] = useState({
    patient_id: 0, doctor_id: 0,
    scheduled_at: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchSessions = () => {
    api.get('/telemedicine').then(r => setSessions(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSessions()
    api.get('/doctors?limit=100').then(r => setDoctors(r.data)).catch(() => {})
    if (user?.role !== 'PATIENT') {
      api.get('/patients?limit=200').then(r => setPatients(r.data)).catch(() => {})
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload: any = { ...form, doctor_id: Number(form.doctor_id) }
      if (user?.role === 'PATIENT') {
        const me = await api.get('/patients/me')
        payload.patient_id = me.data.id
      } else {
        payload.patient_id = Number(form.patient_id)
      }
      await api.post('/telemedicine', payload)
      toast.success('Video consultation scheduled!')
      setShowForm(false)
      setForm({ patient_id: 0, doctor_id: 0, scheduled_at: '', notes: '' })
      fetchSessions()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const joinSession = async (sessionId: number) => {
    setJoining(sessionId)
    try {
      const { data } = await api.post(`/telemedicine/${sessionId}/join`)
      window.open(data.join_url, '_blank', 'noopener,noreferrer')
      toast.success('Opening video room...')
      setTimeout(fetchSessions, 2000)
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed to join') }
    setJoining(null)
  }

  const endSession = async (sessionId: number) => {
    try {
      await api.put(`/telemedicine/${sessionId}/end`)
      toast.success('Session ended')
      fetchSessions()
    } catch { toast.error('Failed') }
  }

  const cancelSession = async (sessionId: number) => {
    try {
      await api.delete(`/telemedicine/${sessionId}`)
      toast.success('Session cancelled')
      fetchSessions()
    } catch { toast.error('Failed') }
  }

  const statusColor: Record<string, string> = {
    SCHEDULED: 'badge-yellow', ACTIVE: 'badge-green',
    COMPLETED: 'badge-gray', CANCELLED: 'badge-red', MISSED: 'badge-red',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Telemedicine</h1>
          <p className="text-gray-500 text-sm mt-1">Video consultations with your doctor</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Schedule Session
        </button>
      </div>

      {/* Schedule Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Schedule Video Consultation">
        <form onSubmit={handleSubmit} className="space-y-4">
          {user?.role !== 'PATIENT' && (
            <div>
              <label className="label">Patient *</label>
              <select className="input" value={form.patient_id}
                onChange={e => setForm({ ...form, patient_id: Number(e.target.value) })} required>
                <option value={0}>— Select patient —</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Doctor *</label>
            <select className="input" value={form.doctor_id}
              onChange={e => setForm({ ...form, doctor_id: Number(e.target.value) })} required>
              <option value={0}>— Select doctor —</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name} — {d.specialization}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Schedule Date & Time *</label>
            <input type="datetime-local" className="input"
              min={new Date().toISOString().slice(0, 16)}
              value={form.scheduled_at}
              onChange={e => setForm({ ...form, scheduled_at: e.target.value })} required />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Scheduling...' : 'Schedule Session'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {loading ? <PageSpinner /> : sessions.length === 0 ? (
        <EmptyState icon={<Video size={40} />} title="No video sessions yet"
          description="Schedule your first telemedicine consultation"
          action={<button onClick={() => setShowForm(true)} className="btn-primary">Schedule Now</button>} />
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <div key={s.id} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <Video size={22} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-gray-900">Session #{s.id}</span>
                      <span className={statusColor[s.status] || 'badge-gray'}>{s.status}</span>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock size={13} />
                      {format(new Date(s.scheduled_at), 'MMMM d, yyyy — HH:mm')}
                    </div>
                    {s.duration_minutes && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        Duration: {s.duration_minutes} minutes
                      </div>
                    )}
                    {s.notes && <div className="text-sm text-gray-600 mt-1">📝 {s.notes}</div>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {['SCHEDULED', 'ACTIVE'].includes(s.status) && (
                    <button onClick={() => joinSession(s.id)} disabled={joining === s.id}
                      className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-4">
                      <ExternalLink size={14} />
                      {joining === s.id ? 'Opening...' : s.status === 'ACTIVE' ? 'Rejoin' : 'Join'}
                    </button>
                  )}
                  {s.status === 'ACTIVE' && user?.role === 'DOCTOR' && (
                    <button onClick={() => endSession(s.id)}
                      className="flex items-center gap-1.5 text-sm text-green-600 border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-xl transition-colors">
                      <CheckCircle size={14} /> End
                    </button>
                  )}
                  {s.status === 'SCHEDULED' && (
                    <button onClick={() => cancelSession(s.id)}
                      className="flex items-center gap-1.5 text-sm text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-colors">
                      <X size={14} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="card p-4 bg-blue-50 border-blue-100">
        <div className="flex items-start gap-3">
          <Video size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>How it works:</strong> Click "Join" to open a secure video room powered by Jitsi Meet.
            No downloads required — works directly in your browser. Both patient and doctor must join for the session to begin.
          </div>
        </div>
      </div>
    </div>
  )
}
