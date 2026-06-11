import { useState, useEffect } from 'react'
import { AlertTriangle, Plus, Phone } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Modal, PageSpinner, EmptyState } from '../components/ui/index'

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH:     'bg-orange-500 text-white',
  MEDIUM:   'bg-yellow-500 text-white',
  LOW:      'bg-blue-500 text-white',
}
const STATUS_STYLES: Record<string, string> = {
  PENDING:      'badge-red',
  ACKNOWLEDGED: 'badge-yellow',
  IN_PROGRESS:  'badge-blue',
  RESOLVED:     'badge-green',
  CANCELLED:    'badge-gray',
}

export default function EmergencyRequestsPage() {
  const { user } = useAuthStore()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [updating, setUpdating] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    requester_name: '', requester_phone: '',
    location: '', description: '', priority: 'HIGH',
  })

  const fetchRequests = async () => {
    setLoading(true)
    try { const { data } = await api.get('/emergency-requests'); setRequests(data) } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchRequests() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/emergency-requests', form)
      toast.success('Emergency request submitted! Help is on the way.')
      setShowForm(false)
      setForm({ requester_name:'', requester_phone:'', location:'', description:'', priority:'HIGH' })
      fetchRequests()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/emergency-requests/${id}`, { status })
      toast.success('Status updated')
      fetchRequests()
    } catch { toast.error('Failed') }
  }

  const isAdmin = user?.role === 'ADMIN'
  const activeCount = requests.filter(r => ['PENDING','ACKNOWLEDGED','IN_PROGRESS'].includes(r.status)).length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alert banner for active emergencies */}
      {activeCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={22} className="text-red-600 shrink-0" />
          <div>
            <div className="font-semibold text-red-800">{activeCount} Active Emergency Request{activeCount > 1 ? 's' : ''}</div>
            <div className="text-sm text-red-600">Requires immediate attention</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Emergency Requests</h1>
          <p className="text-gray-500 text-sm mt-1">Submit and track emergency service requests</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
          <AlertTriangle size={16} /> Emergency Request
        </button>
      </div>

      {/* Submit Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="🚨 Emergency Request">
        <div className="bg-red-50 rounded-xl p-3 mb-4 text-sm text-red-700">
          <strong>For life-threatening emergencies, call 108 immediately!</strong>
          This form is for hospital emergency assistance requests.
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Your Name *</label>
              <input className="input" value={form.requester_name}
                onChange={e => setForm({ ...form, requester_name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input className="input" type="tel" value={form.requester_phone}
                onChange={e => setForm({ ...form, requester_phone: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" placeholder="Building, floor, room number..."
              value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className="label">Priority Level</label>
            <div className="grid grid-cols-4 gap-2">
              {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => (
                <button key={p} type="button"
                  onClick={() => setForm({ ...form, priority: p })}
                  className={`py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    form.priority === p ? PRIORITY_STYLES[p] + ' border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Description of Emergency *</label>
            <textarea className="input" rows={3} placeholder="Describe the emergency situation..."
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2.5 rounded-xl flex-1 transition-colors">
              {submitting ? 'Submitting...' : '🚨 Submit Emergency Request'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {loading ? <PageSpinner /> : requests.length === 0 ? (
        <EmptyState icon={<AlertTriangle size={40} />} title="No emergency requests"
          description="Submit a request if you need emergency assistance" />
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className={`card p-5 ${['PENDING','ACKNOWLEDGED'].includes(r.status) ? 'border-l-4 border-l-red-500' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PRIORITY_STYLES[r.priority]}`}>
                      {r.priority}
                    </span>
                    <span className={STATUS_STYLES[r.status] || 'badge-gray'}>{r.status.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-400">#{r.id}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{r.description}</p>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div className="flex items-center gap-1"><Phone size={11} />{r.requester_name} — {r.requester_phone}</div>
                    {r.location && <div>📍 {r.location}</div>}
                    {r.assigned_to && <div>👤 Assigned: {r.assigned_to}</div>}
                    <div>🕐 {format(new Date(r.created_at), 'MMM d, yyyy HH:mm')}</div>
                  </div>
                  {r.response_notes && (
                    <div className="mt-2 bg-blue-50 rounded-lg p-2 text-xs text-blue-800">
                      <strong>Response:</strong> {r.response_notes}
                    </div>
                  )}
                </div>

                {isAdmin && r.status !== 'RESOLVED' && r.status !== 'CANCELLED' && (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {r.status === 'PENDING' && (
                      <button onClick={() => updateStatus(r.id, 'ACKNOWLEDGED')}
                        className="text-xs bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 transition-colors">
                        Acknowledge
                      </button>
                    )}
                    {r.status === 'ACKNOWLEDGED' && (
                      <button onClick={() => updateStatus(r.id, 'IN_PROGRESS')}
                        className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors">
                        In Progress
                      </button>
                    )}
                    {r.status === 'IN_PROGRESS' && (
                      <button onClick={() => updateStatus(r.id, 'RESOLVED')}
                        className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors">
                        Resolve
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
