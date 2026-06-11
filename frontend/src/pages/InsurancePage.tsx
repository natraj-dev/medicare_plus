import { useState, useEffect } from 'react'
import { Shield, Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function InsurancePage() {
  const [insurances, setInsurances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ provider_name: '', policy_number: '', coverage_type: '', coverage_amount: '', valid_from: '', valid_to: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchInsurances = async () => {
    setLoading(true)
    try { const { data } = await api.get('/insurance'); setInsurances(data) } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchInsurances() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/insurance', { ...form, coverage_amount: form.coverage_amount ? Number(form.coverage_amount) : undefined })
      toast.success('Insurance added')
      setShowForm(false)
      setForm({ provider_name: '', policy_number: '', coverage_type: '', coverage_amount: '', valid_from: '', valid_to: '' })
      fetchInsurances()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Insurance</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your health insurance policies</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Policy</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-display font-bold">Add Insurance Policy</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Provider Name *</label>
                  <input className="input" placeholder="e.g. Star Health" value={form.provider_name} onChange={e => setForm({ ...form, provider_name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Policy Number *</label>
                  <input className="input" placeholder="POL-XXXXXX" value={form.policy_number} onChange={e => setForm({ ...form, policy_number: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Coverage Type</label>
                  <input className="input" placeholder="e.g. Family Floater" value={form.coverage_type} onChange={e => setForm({ ...form, coverage_type: e.target.value })} />
                </div>
                <div>
                  <label className="label">Coverage Amount (₹)</label>
                  <input type="number" className="input" placeholder="500000" value={form.coverage_amount} onChange={e => setForm({ ...form, coverage_amount: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Valid From</label>
                  <input type="date" className="input" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} />
                </div>
                <div>
                  <label className="label">Valid To</label>
                  <input type="date" className="input" value={form.valid_to} onChange={e => setForm({ ...form, valid_to: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving...' : 'Add Policy'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="text-center text-gray-400 py-10">Loading...</div>
        : insurances.length === 0 ? (
          <div className="card p-12 text-center">
            <Shield size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No insurance policies added</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {insurances.map(ins => (
              <div key={ins.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{ins.provider_name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{ins.policy_number}</p>
                  </div>
                  <span className={ins.is_verified ? 'badge-green' : 'badge-yellow'}>{ins.is_verified ? '✓ Verified' : 'Pending'}</span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  {ins.coverage_type && <div>📋 {ins.coverage_type}</div>}
                  {ins.coverage_amount && <div>💰 Coverage: ₹{ins.coverage_amount?.toLocaleString()}</div>}
                  {ins.valid_from && <div>📅 {format(new Date(ins.valid_from), 'MMM d, yyyy')} – {ins.valid_to ? format(new Date(ins.valid_to), 'MMM d, yyyy') : 'N/A'}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
