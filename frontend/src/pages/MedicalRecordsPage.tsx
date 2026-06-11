import { useState, useEffect } from 'react'
import { FileText, Plus, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import toast from 'react-hot-toast'

const RECORD_TYPES = ['Lab Report', 'Prescription', 'X-Ray', 'MRI Scan', 'CT Scan', 'Discharge Summary', 'Vaccination', 'Surgery Report', 'Other']

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ record_type: 'Lab Report', title: '', description: '', doctor_name: '', hospital_name: '', record_date: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchRecords = async () => {
    setLoading(true)
    try { const { data } = await api.get('/medical-records'); setRecords(data) } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchRecords() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/medical-records', form)
      toast.success('Record added')
      setShowForm(false)
      setForm({ record_type: 'Lab Report', title: '', description: '', doctor_name: '', hospital_name: '', record_date: '' })
      fetchRecords()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const deleteRecord = async (id: number) => {
    if (!confirm('Delete this record?')) return
    try { await api.delete(`/medical-records/${id}`); toast.success('Deleted'); fetchRecords() }
    catch { toast.error('Failed to delete') }
  }

  const typeColor: Record<string, string> = {
    'Lab Report': 'badge-blue', 'Prescription': 'badge-green', 'X-Ray': 'badge-yellow',
    'MRI Scan': 'badge-yellow', 'CT Scan': 'badge-yellow', 'Discharge Summary': 'badge-gray',
    'Vaccination': 'badge-green', 'Surgery Report': 'badge-red', 'Other': 'badge-gray',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Medical Records</h1>
          <p className="text-gray-500 text-sm mt-1">Store and manage your health records</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Record
        </button>
      </div>

      {/* Add Record Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-display font-bold text-gray-900">Add Medical Record</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Record Type</label>
                  <select className="input" value={form.record_type} onChange={e => setForm({ ...form, record_type: e.target.value })}>
                    {RECORD_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" value={form.record_date} onChange={e => setForm({ ...form, record_date: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="label">Title *</label>
                <input className="input" placeholder="e.g. Blood Test Report" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} placeholder="Brief description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Doctor Name</label>
                  <input className="input" placeholder="Dr. Name" value={form.doctor_name} onChange={e => setForm({ ...form, doctor_name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Hospital</label>
                  <input className="input" placeholder="Hospital name" value={form.hospital_name} onChange={e => setForm({ ...form, hospital_name: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving...' : 'Save Record'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary px-5">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-10">Loading...</div>
      ) : records.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No medical records yet</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 inline-flex items-center gap-2"><Plus size={16} /> Add Record</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map(r => (
            <div key={r.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <span className={typeColor[r.record_type] || 'badge-gray'}>{r.record_type}</span>
                <button onClick={() => deleteRecord(r.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
              <h3 className="font-medium text-gray-900 mt-2">{r.title}</h3>
              {r.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{r.description}</p>}
              <div className="mt-3 text-xs text-gray-400 space-y-0.5">
                <div>📅 {format(new Date(r.record_date), 'MMM d, yyyy')}</div>
                {r.doctor_name && <div>👨‍⚕️ {r.doctor_name}</div>}
                {r.hospital_name && <div>🏥 {r.hospital_name}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
