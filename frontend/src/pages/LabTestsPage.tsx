import { useState, useEffect } from 'react'
import { TestTube, Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'badge-yellow', SAMPLE_COLLECTED: 'badge-blue',
  IN_PROGRESS: 'badge-blue', COMPLETED: 'badge-green', CANCELLED: 'badge-red',
}

export default function LabTestsPage() {
  const { user } = useAuthStore()
  const [tests, setTests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ patient_id: 0, test_name: '', test_type: '', notes: '' })
  const [patients, setPatients] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  const fetchTests = async () => {
    setLoading(true)
    try { const { data } = await api.get('/lab-tests'); setTests(data) } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchTests()
    if (user?.role === 'DOCTOR' || user?.role === 'ADMIN') {
      api.get('/patients?limit=100').then(r => setPatients(r.data)).catch(() => {})
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/lab-tests', form)
      toast.success('Lab test requested')
      setShowForm(false)
      fetchTests()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Lab Tests</h1>
          <p className="text-gray-500 text-sm mt-1">Track your laboratory tests and results</p>
        </div>
        {(user?.role === 'DOCTOR' || user?.role === 'ADMIN') && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Request Test
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-display font-bold">Request Lab Test</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Patient *</label>
                <select className="input" value={form.patient_id} onChange={e => setForm({ ...form, patient_id: Number(e.target.value) })} required>
                  <option value={0}>— Select patient —</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Test Name *</label>
                <input className="input" placeholder="e.g. Complete Blood Count" value={form.test_name} onChange={e => setForm({ ...form, test_name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Test Type</label>
                <input className="input" placeholder="e.g. Blood, Urine, Imaging" value={form.test_type} onChange={e => setForm({ ...form, test_type: e.target.value })} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Requesting...' : 'Request Test'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="text-center text-gray-400 py-10">Loading...</div>
        : tests.length === 0 ? (
          <div className="card p-12 text-center">
            <TestTube size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No lab tests found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map(t => (
              <div key={t.id} className="card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{t.test_name}</span>
                      <span className={STATUS_COLORS[t.status] || 'badge-gray'}>{t.status.replace('_', ' ')}</span>
                      {t.test_type && <span className="badge-gray">{t.test_type}</span>}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Requested: {format(new Date(t.requested_date), 'MMM d, yyyy')}
                      {t.completed_date && ` • Completed: ${format(new Date(t.completed_date), 'MMM d, yyyy')}`}
                    </div>
                    {t.notes && <div className="text-sm text-gray-600 mt-1">📝 {t.notes}</div>}
                  </div>
                </div>
                {t.result && (
                  <div className="mt-3 bg-green-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-green-700 mb-1">RESULT</div>
                    <div className="text-sm text-green-900">{t.result}</div>
                    {t.normal_range && <div className="text-xs text-green-600 mt-1">Normal range: {t.normal_range}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
