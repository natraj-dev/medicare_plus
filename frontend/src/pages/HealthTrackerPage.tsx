import { useState, useEffect } from 'react'
import { Activity, Plus, Trash2, TrendingUp, TrendingDown, Minus, X } from 'lucide-react'
import { format } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Modal, PageSpinner, EmptyState } from '../components/ui/index'

const METRICS = [
  { key: 'WEIGHT',         label: 'Weight',        unit: 'kg',    color: '#3b82f6', icon: '⚖️'  },
  { key: 'HEIGHT',         label: 'Height',        unit: 'cm',    color: '#10b981', icon: '📏'  },
  { key: 'BLOOD_PRESSURE', label: 'Blood Pressure', unit: 'mmHg', color: '#ef4444', icon: '🩺'  },
  { key: 'SUGAR_LEVEL',    label: 'Blood Sugar',   unit: 'mg/dL', color: '#f59e0b', icon: '🍬'  },
  { key: 'HEART_RATE',     label: 'Heart Rate',    unit: 'bpm',   color: '#ec4899', icon: '❤️'  },
  { key: 'TEMPERATURE',    label: 'Temperature',   unit: '°C',    color: '#8b5cf6', icon: '🌡️' },
  { key: 'OXYGEN_LEVEL',   label: 'Oxygen Level',  unit: '%',     color: '#06b6d4', icon: '💨'  },
  { key: 'BMI',            label: 'BMI',            unit: 'kg/m²', color: '#84cc16', icon: '📊'  },
]

const NORMAL_RANGES: Record<string, string> = {
  WEIGHT:         '50–90 kg',
  BLOOD_PRESSURE: 'Sys: 90–120 / Dia: 60–80 mmHg',
  SUGAR_LEVEL:    'Fasting: 70–100 mg/dL',
  HEART_RATE:     '60–100 bpm',
  TEMPERATURE:    '36.1–37.2 °C',
  OXYGEN_LEVEL:   '95–100 %',
  BMI:            '18.5–24.9 kg/m²',
}

export default function HealthTrackerPage() {
  const [records, setRecords]       = useState<any[]>([])
  const [analytics, setAnalytics]   = useState<any[]>([])
  const [chartData, setChartData]   = useState<any[]>([])
  const [selectedMetric, setSelectedMetric] = useState('WEIGHT')
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    metric_type: 'WEIGHT', value: '', value2: '', notes: '',
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rec, ana] = await Promise.all([
        api.get('/health-tracker?days=60'),
        api.get('/health-tracker/analytics'),
      ])
      setRecords(rec.data)
      setAnalytics(ana.data)
    } catch {}
    setLoading(false)
  }

  const fetchChart = async (metric: string) => {
    try {
      const { data } = await api.get(`/health-tracker/chart/${metric}?days=30`)
      setChartData(data.data || [])
    } catch {}
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { fetchChart(selectedMetric) }, [selectedMetric])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/health-tracker', {
        metric_type: form.metric_type,
        value:       parseFloat(form.value),
        value2:      form.value2 ? parseFloat(form.value2) : undefined,
        notes:       form.notes || undefined,
      })
      toast.success('Health record saved!')
      setShowForm(false)
      setForm({ metric_type: 'WEIGHT', value: '', value2: '', notes: '' })
      fetchData()
      fetchChart(selectedMetric)
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const deleteRecord = async (id: number) => {
    try {
      await api.delete(`/health-tracker/${id}`)
      toast.success('Deleted')
      fetchData()
      fetchChart(selectedMetric)
    } catch { toast.error('Failed') }
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'UP')   return <TrendingUp size={14} className="text-red-500" />
    if (trend === 'DOWN') return <TrendingDown size={14} className="text-green-500" />
    return <Minus size={14} className="text-gray-400" />
  }

  const activeMetric = METRICS.find(m => m.key === selectedMetric)
  const recentRecords = records.filter(r => r.metric_type === selectedMetric).slice(0, 10)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Health Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor your health metrics over time</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Log Reading
        </button>
      </div>

      {/* Add reading modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Log Health Reading">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Metric Type</label>
            <select className="input" value={form.metric_type}
              onChange={e => setForm({ ...form, metric_type: e.target.value })}>
              {METRICS.map(m => <option key={m.key} value={m.key}>{m.icon} {m.label} ({m.unit})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                {form.metric_type === 'BLOOD_PRESSURE' ? 'Systolic (upper)' : 'Value'} *
              </label>
              <input type="number" step="0.1" className="input" placeholder="0.0"
                value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} required />
            </div>
            {form.metric_type === 'BLOOD_PRESSURE' && (
              <div>
                <label className="label">Diastolic (lower)</label>
                <input type="number" step="0.1" className="input" placeholder="0.0"
                  value={form.value2} onChange={e => setForm({ ...form, value2: e.target.value })} />
              </div>
            )}
          </div>
          {NORMAL_RANGES[form.metric_type] && (
            <div className="bg-blue-50 rounded-lg p-2 text-xs text-blue-700">
              Normal range: {NORMAL_RANGES[form.metric_type]}
            </div>
          )}
          <div>
            <label className="label">Notes (optional)</label>
            <input className="input" placeholder="e.g. After exercise, fasting..."
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Saving...' : 'Save Reading'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {loading ? <PageSpinner /> : (
        <>
          {/* Analytics summary cards */}
          {analytics.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {analytics.slice(0, 4).map((a: any) => {
                const metric = METRICS.find(m => m.key === a.metric_type)
                return (
                  <button key={a.metric_type}
                    onClick={() => setSelectedMetric(a.metric_type)}
                    className={`card p-4 text-left hover:shadow-md transition-all ${selectedMetric === a.metric_type ? 'ring-2 ring-primary-500' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">{metric?.icon}</span>
                      {getTrendIcon(a.trend)}
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {a.latest} <span className="text-xs font-normal text-gray-400">{metric?.unit}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{metric?.label}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Avg: {a.average} • {a.count} readings
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Metric selector tabs */}
          <div className="card p-4">
            <div className="flex flex-wrap gap-2">
              {METRICS.map(m => (
                <button key={m.key} onClick={() => setSelectedMetric(m.key)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    selectedMetric === m.key
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={selectedMetric === m.key ? { backgroundColor: m.color } : {}}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
            <div className="card p-5">
              <h2 className="font-display font-semibold text-gray-900 mb-4">
                {activeMetric?.icon} {activeMetric?.label} — Last 30 Days
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }}
                    tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v: any, name: string) => [`${v} ${activeMetric?.unit}`, name]}
                    labelFormatter={l => `Date: ${l}`} />
                  <Line type="monotone" dataKey="value" stroke={activeMetric?.color || '#3b82f6'}
                    strokeWidth={2} dot={{ r: 3 }} name={activeMetric?.label} />
                  {selectedMetric === 'BLOOD_PRESSURE' && (
                    <Line type="monotone" dataKey="value2" stroke="#f59e0b"
                      strokeWidth={2} dot={{ r: 3 }} name="Diastolic" />
                  )}
                </LineChart>
              </ResponsiveContainer>
              {NORMAL_RANGES[selectedMetric] && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Normal range: {NORMAL_RANGES[selectedMetric]}
                </p>
              )}
            </div>
          ) : (
            <EmptyState icon={<Activity size={36} />}
              title={`No ${activeMetric?.label} readings yet`}
              description="Start logging your readings to see charts"
              action={<button onClick={() => setShowForm(true)} className="btn-primary">Log Reading</button>} />
          )}

          {/* Recent readings table */}
          {recentRecords.length > 0 && (
            <div className="card p-5">
              <h2 className="font-display font-semibold text-gray-900 mb-4">
                Recent {activeMetric?.label} Readings
              </h2>
              <div className="space-y-2">
                {recentRecords.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: activeMetric?.color }}>
                        {activeMetric?.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {r.value} {r.value2 ? `/ ${r.value2}` : ''} {r.unit}
                        </div>
                        {r.notes && <div className="text-xs text-gray-400">{r.notes}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {format(new Date(r.recorded_at), 'MMM d, HH:mm')}
                      </span>
                      <button onClick={() => deleteRecord(r.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
