import { useState, useEffect } from 'react'
import { Clock, Plus, X } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ day_of_week: 'MONDAY', start_time: '09:00', end_time: '17:00', slot_duration: 30, max_appointments: 16 })
  const [submitting, setSubmitting] = useState(false)

  const fetchSchedules = async () => {
    setLoading(true)
    try { const { data } = await api.get('/schedules/me'); setSchedules(data) } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchSchedules() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/schedules', form)
      toast.success('Schedule added')
      setShowForm(false)
      fetchSchedules()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const scheduledDays = new Set(schedules.map(s => s.day_of_week))

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">My Schedule</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your weekly availability</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Slot</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-display font-bold">Add Schedule</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Day of Week *</label>
                <select className="input" value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })}>
                  {DAYS.filter(d => !scheduledDays.has(d)).map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Time</label>
                  <input type="time" className="input" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input type="time" className="input" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Slot Duration (min)</label>
                  <select className="input" value={form.slot_duration} onChange={e => setForm({ ...form, slot_duration: Number(e.target.value) })}>
                    <option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option>
                  </select>
                </div>
                <div>
                  <label className="label">Max Appointments</label>
                  <input type="number" className="input" value={form.max_appointments} onChange={e => setForm({ ...form, max_appointments: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Adding...' : 'Add'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Week view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {DAYS.map(day => {
          const s = schedules.find(sc => sc.day_of_week === day)
          return (
            <div key={day} className={`card p-4 ${s ? 'border-l-4 border-l-green-500' : 'opacity-50'}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-800">{day}</div>
                {s ? <span className="badge-green">Active</span> : <span className="badge-gray">Off</span>}
              </div>
              {s ? (
                <div className="mt-2 text-sm text-gray-600 space-y-0.5">
                  <div className="flex items-center gap-1"><Clock size={13} />{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</div>
                  <div className="text-xs text-gray-400">{s.slot_duration} min slots • Max {s.max_appointments} appointments</div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-400">Not scheduled</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
