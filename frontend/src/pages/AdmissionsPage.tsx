import { useState, useEffect } from 'react'
import { ClipboardList, Plus, LogOut, X } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Modal, PageSpinner, EmptyState, StatusBadge } from '../components/ui/index'

export default function AdmissionsPage() {
  const { user } = useAuthStore()
  const [admissions, setAdmissions] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [showAdmit, setShowAdmit]   = useState(false)
  const [showDischarge, setShowDischarge] = useState<number | null>(null)
  const [patients, setPatients]     = useState<any[]>([])
  const [doctors, setDoctors]       = useState<any[]>([])
  const [beds, setBeds]             = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [admitForm, setAdmitForm] = useState({
    patient_id: 0, doctor_id: '', bed_id: '', reason: '', diagnosis: '',
  })
  const [dischargeForm, setDischargeForm] = useState({
    discharge_notes: '', treatment_summary: '', total_cost: 0,
  })

  const fetchAdmissions = async () => {
    setLoading(true)
    try { const { data } = await api.get('/admissions'); setAdmissions(data) } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchAdmissions()
    api.get('/patients?limit=200').then(r => setPatients(r.data)).catch(() => {})
    api.get('/doctors?limit=100').then(r => setDoctors(r.data)).catch(() => {})
    api.get('/beds?available_only=true').then(r => setBeds(r.data)).catch(() => {})
  }, [])

  const admit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/admissions', {
        ...admitForm,
        patient_id: Number(admitForm.patient_id),
        doctor_id: admitForm.doctor_id ? Number(admitForm.doctor_id) : undefined,
        bed_id: admitForm.bed_id ? Number(admitForm.bed_id) : undefined,
      })
      toast.success('Patient admitted successfully')
      setShowAdmit(false)
      setAdmitForm({ patient_id: 0, doctor_id: '', bed_id: '', reason: '', diagnosis: '' })
      fetchAdmissions()
      api.get('/beds?available_only=true').then(r => setBeds(r.data)).catch(() => {})
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const discharge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showDischarge) return
    setSubmitting(true)
    try {
      await api.put(`/admissions/${showDischarge}/discharge`, dischargeForm)
      toast.success('Patient discharged successfully')
      setShowDischarge(null)
      setDischargeForm({ discharge_notes: '', treatment_summary: '', total_cost: 0 })
      fetchAdmissions()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const isStaff = user?.role === 'DOCTOR' || user?.role === 'ADMIN'

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Admissions</h1>
          <p className="text-gray-500 text-sm mt-1">Patient admission and discharge management</p>
        </div>
        {isStaff && (
          <button onClick={() => setShowAdmit(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Admit Patient
          </button>
        )}
      </div>

      {/* Admit Modal */}
      <Modal open={showAdmit} onClose={() => setShowAdmit(false)} title="Admit Patient" size="md">
        <form onSubmit={admit} className="space-y-4">
          <div>
            <label className="label">Patient *</label>
            <select className="input" value={admitForm.patient_id}
              onChange={e => setAdmitForm({ ...admitForm, patient_id: Number(e.target.value) })} required>
              <option value={0}>— Select patient —</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Attending Doctor</label>
              <select className="input" value={admitForm.doctor_id}
                onChange={e => setAdmitForm({ ...admitForm, doctor_id: e.target.value })}>
                <option value="">— None —</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assign Bed</label>
              <select className="input" value={admitForm.bed_id}
                onChange={e => setAdmitForm({ ...admitForm, bed_id: e.target.value })}>
                <option value="">— None —</option>
                {beds.map(b => <option key={b.id} value={b.id}>Bed {b.bed_number}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Reason for Admission *</label>
            <textarea className="input" rows={2}
              value={admitForm.reason} onChange={e => setAdmitForm({ ...admitForm, reason: e.target.value })} required />
          </div>
          <div>
            <label className="label">Initial Diagnosis</label>
            <input className="input" value={admitForm.diagnosis}
              onChange={e => setAdmitForm({ ...admitForm, diagnosis: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Admitting...' : 'Admit Patient'}
            </button>
            <button type="button" onClick={() => setShowAdmit(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Discharge Modal */}
      <Modal open={showDischarge !== null} onClose={() => setShowDischarge(null)} title="Discharge Patient">
        <form onSubmit={discharge} className="space-y-4">
          <div>
            <label className="label">Treatment Summary</label>
            <textarea className="input" rows={3}
              value={dischargeForm.treatment_summary}
              onChange={e => setDischargeForm({ ...dischargeForm, treatment_summary: e.target.value })} />
          </div>
          <div>
            <label className="label">Discharge Notes / Follow-up Instructions</label>
            <textarea className="input" rows={2}
              value={dischargeForm.discharge_notes}
              onChange={e => setDischargeForm({ ...dischargeForm, discharge_notes: e.target.value })} />
          </div>
          <div>
            <label className="label">Total Cost (₹)</label>
            <input type="number" className="input" min={0}
              value={dischargeForm.total_cost}
              onChange={e => setDischargeForm({ ...dischargeForm, total_cost: Number(e.target.value) })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Discharging...' : 'Confirm Discharge'}
            </button>
            <button type="button" onClick={() => setShowDischarge(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {loading ? <PageSpinner /> : admissions.length === 0 ? (
        <EmptyState icon={<ClipboardList size={40} />} title="No admissions found"
          action={isStaff ? <button onClick={() => setShowAdmit(true)} className="btn-primary">Admit Patient</button> : undefined} />
      ) : (
        <div className="space-y-3">
          {admissions.map(a => (
            <div key={a.id} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900">Admission #{a.id}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <div>📅 Admitted: {format(new Date(a.admission_date), 'MMM d, yyyy HH:mm')}</div>
                    {a.discharge_date && <div>🏠 Discharged: {format(new Date(a.discharge_date), 'MMM d, yyyy HH:mm')}</div>}
                    <div>📋 Reason: {a.reason}</div>
                    {a.diagnosis && <div>🩺 Diagnosis: {a.diagnosis}</div>}
                    {a.total_cost > 0 && <div className="text-green-700 font-medium">💰 Cost: ₹{a.total_cost.toLocaleString()}</div>}
                  </div>
                </div>
                {isStaff && a.status === 'ADMITTED' && (
                  <button onClick={() => setShowDischarge(a.id)}
                    className="flex items-center gap-2 text-sm border border-green-300 text-green-700 hover:bg-green-50 px-4 py-2 rounded-xl transition-colors shrink-0">
                    <LogOut size={15} /> Discharge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
