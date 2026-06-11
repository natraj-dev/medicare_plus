// DepartmentsPage.tsx
import { useState, useEffect } from 'react'
import { Building2, Plus, X } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function DepartmentsPage() {
  const { user } = useAuthStore()
  const [depts, setDepts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', icon: '🏥' })
  const [submitting, setSubmitting] = useState(false)

  const fetchDepts = async () => {
    setLoading(true)
    try { const { data } = await api.get('/departments'); setDepts(data) } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchDepts() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/departments', form)
      toast.success('Department created')
      setShowForm(false)
      setForm({ name: '', description: '', icon: '🏥' })
      fetchDepts()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500 text-sm mt-1">Hospital departments and specializations</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Department</button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-display font-bold">New Department</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="label">Icon</label>
                  <input className="input text-center text-xl" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} maxLength={2} />
                </div>
                <div className="col-span-3">
                  <label className="label">Department Name *</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Creating...' : 'Create'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="text-center text-gray-400 py-10">Loading...</div>
        : depts.length === 0 ? (
          <div className="card p-12 text-center"><Building2 size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">No departments</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {depts.map(d => (
              <div key={d.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{d.icon}</div>
                <h3 className="font-semibold text-gray-900">{d.name}</h3>
                {d.description && <p className="text-sm text-gray-500 mt-1">{d.description}</p>}
                <span className={`mt-3 inline-block ${d.is_active ? 'badge-green' : 'badge-gray'}`}>{d.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
