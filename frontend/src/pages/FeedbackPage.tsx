import { useState, useEffect } from 'react'
import { MessageSquare, Star, CheckCircle, BarChart2 } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Modal, PageSpinner, EmptyState } from '../components/ui/index'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const CATEGORIES = ['GENERAL','DOCTOR_SERVICE','HOSPITAL_FACILITY','NURSING_STAFF','BILLING','APPOINTMENT','CLEANLINESS']
const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4']

export default function FeedbackPage() {
  const { user } = useAuthStore()
  const [feedbacks, setFeedbacks]   = useState<any[]>([])
  const [analytics, setAnalytics]   = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<'submit' | 'history' | 'analytics'>('submit')
  const [showResponse, setShowResponse] = useState<number | null>(null)
  const [responseText, setResponseText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    category: 'GENERAL', rating: 5, title: '', message: '', is_anonymous: false,
  })

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/feedback')
      setFeedbacks(data)
      if (user?.role === 'ADMIN') {
        const { data: ana } = await api.get('/feedback/analytics')
        setAnalytics(ana)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/feedback', form)
      toast.success('Feedback submitted. Thank you!')
      setForm({ category: 'GENERAL', rating: 5, title: '', message: '', is_anonymous: false })
      setActiveTab('history')
      fetchAll()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const respondToFeedback = async (id: number) => {
    try {
      await api.put(`/feedback/${id}/respond`, { response: responseText })
      toast.success('Response sent')
      setShowResponse(null)
      setResponseText('')
      fetchAll()
    } catch { toast.error('Failed') }
  }

  const isAdmin = user?.role === 'ADMIN'

  const chartData = analytics
    ? Object.entries(analytics.by_category).map(([k, v]) => ({ name: k.replace('_', ' '), value: v as number }))
    : []

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Feedback & Satisfaction</h1>
        <p className="text-gray-500 text-sm mt-1">Share your experience and help us improve</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          ['submit',    'Submit Feedback'],
          ['history',   'My Feedback'],
          ...(isAdmin ? [['analytics', 'Analytics']] : []),
        ] as [string, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
            }`}>{label}</button>
        ))}
      </div>

      {/* Submit tab */}
      {activeTab === 'submit' && (
        <div className="card p-6 max-w-2xl">
          <h2 className="font-display font-semibold text-gray-900 mb-5">Share Your Experience</h2>
          <form onSubmit={submitFeedback} className="space-y-4">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Rating *</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })}>
                    <Star size={28} className={n <= form.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-500 self-center">
                  {['','Poor','Fair','Good','Very Good','Excellent'][form.rating]}
                </span>
              </div>
            </div>
            <div>
              <label className="label">Title</label>
              <input className="input" placeholder="Brief summary..."
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Your Feedback *</label>
              <textarea className="input" rows={4}
                placeholder="Tell us about your experience in detail..."
                value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.is_anonymous}
                onChange={e => setForm({ ...form, is_anonymous: e.target.checked })} />
              Submit anonymously
            </label>
            <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        loading ? <PageSpinner /> : feedbacks.length === 0 ? (
          <EmptyState icon={<MessageSquare size={40} />} title="No feedback yet"
            action={<button onClick={() => setActiveTab('submit')} className="btn-primary">Submit Feedback</button>} />
        ) : (
          <div className="space-y-3 max-w-3xl">
            {feedbacks.map(f => (
              <div key={f.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="badge-blue text-xs">{f.category.replace('_', ' ')}</span>
                      <div className="flex">{[1,2,3,4,5].map(n => (
                        <Star key={n} size={13} className={n <= f.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                      ))}</div>
                      {f.is_resolved && <span className="badge-green text-xs flex items-center gap-0.5"><CheckCircle size={10} /> Resolved</span>}
                    </div>
                    {f.title && <div className="font-medium text-gray-900">{f.title}</div>}
                    <p className="text-sm text-gray-600 mt-1">{f.message}</p>
                    {f.admin_response && (
                      <div className="mt-2 bg-blue-50 rounded-lg p-2 text-sm text-blue-800">
                        <strong>Admin Response:</strong> {f.admin_response}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      {format(new Date(f.created_at), 'MMM d, yyyy')}
                      {f.is_anonymous && ' • Anonymous'}
                    </div>
                  </div>
                  {isAdmin && !f.is_resolved && (
                    <button onClick={() => setShowResponse(f.id)}
                      className="text-sm text-primary-600 border border-primary-200 hover:bg-primary-50 px-3 py-1.5 rounded-xl transition-colors shrink-0">
                      Respond
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Analytics tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-5 max-w-4xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Total Feedback',  analytics.total_feedback,   'bg-blue-500'],
              ['Avg Rating',      analytics.average_rating + ' ★', 'bg-yellow-500'],
              ['Resolved',        analytics.resolved_count,   'bg-green-500'],
              ['Pending',         analytics.unresolved_count, 'bg-red-500'],
            ].map(([label, val, color]) => (
              <div key={label as string} className="card p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                  <BarChart2 size={16} className="text-white" />
                </div>
                <div className="text-xl font-bold text-gray-900">{val}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {chartData.length > 0 && (
            <div className="card p-5">
              <h2 className="font-display font-semibold text-gray-900 mb-4">Feedback by Category</h2>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                      {chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {chartData.map((d: any, i: number) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        {d.name}
                      </span>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Response Modal */}
      <Modal open={showResponse !== null} onClose={() => setShowResponse(null)} title="Respond to Feedback">
        <div className="space-y-4">
          <textarea className="input w-full" rows={4}
            placeholder="Write your response..."
            value={responseText} onChange={e => setResponseText(e.target.value)} />
          <div className="flex gap-3">
            <button onClick={() => showResponse && respondToFeedback(showResponse)}
              disabled={!responseText.trim()} className="btn-primary flex-1">
              Send Response
            </button>
            <button onClick={() => { setShowResponse(null); setResponseText('') }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
