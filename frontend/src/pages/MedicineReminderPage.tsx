import { useState, useEffect } from 'react'
import { Pill, Plus, Clock, CheckCircle, PauseCircle, Trash2, X, Bell } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Modal, PageSpinner, EmptyState, StatusBadge } from '../components/ui/index'

export default function MedicineReminderPage() {
  const [reminders, setReminders] = useState<any[]>([])
  const [todayReminders, setTodayReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    medicine_name: '',
    dosage: '',
    reminder_times: ['08:00'],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
  })

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [all, today] = await Promise.all([
        api.get('/reminders'),
        api.get('/reminders/today'),
      ])
      setReminders(all.data)
      setTodayReminders(today.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const addTime = () => setForm(f => ({ ...f, reminder_times: [...f.reminder_times, '12:00'] }))
  const removeTime = (i: number) => setForm(f => ({ ...f, reminder_times: f.reminder_times.filter((_, idx) => idx !== i) }))
  const updateTime = (i: number, val: string) => setForm(f => ({
    ...f, reminder_times: f.reminder_times.map((t, idx) => idx === i ? val : t),
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/reminders', {
        ...form,
        end_date: form.end_date || undefined,
        notes: form.notes || undefined,
      })
      toast.success('Reminder created!')
      setShowForm(false)
      setForm({ medicine_name: '', dosage: '', reminder_times: ['08:00'], start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '' })
      fetchAll()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const markTaken = async (logId: number) => {
    try {
      await api.post('/reminders/mark-taken', { log_id: logId })
      toast.success('Marked as taken ✓')
      fetchAll()
    } catch { toast.error('Failed') }
  }

  const pauseReminder = async (id: number) => {
    try {
      await api.put(`/reminders/${id}/pause`)
      toast.success('Reminder paused')
      fetchAll()
    } catch { toast.error('Failed') }
  }

  const cancelReminder = async (id: number) => {
    if (!confirm('Cancel this reminder?')) return
    try {
      await api.delete(`/reminders/${id}`)
      toast.success('Reminder cancelled')
      fetchAll()
    } catch { toast.error('Failed') }
  }

  const takenToday = todayReminders.reduce((sum, r) => sum + r.logs.filter((l: any) => l.is_taken).length, 0)
  const totalToday = todayReminders.reduce((sum, r) => sum + r.logs.length, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Medicine Reminders</h1>
          <p className="text-gray-500 text-sm mt-1">Never miss a dose</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Reminder
        </button>
      </div>

      {/* Today's progress */}
      {totalToday > 0 && (
        <div className="card p-4 bg-gradient-to-r from-primary-50 to-blue-50 border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-primary-800">Today's Progress</div>
              <div className="text-2xl font-bold text-primary-700 mt-0.5">
                {takenToday} / {totalToday} doses taken
              </div>
            </div>
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#dbeafe" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#2563eb" strokeWidth="3"
                  strokeDasharray={`${(takenToday / totalToday) * 87.96} 87.96`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary-700">
                {Math.round((takenToday / totalToday) * 100)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['today', 'all'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
              activeTab === tab ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
            }`}>
            {tab === 'today' ? "Today's Doses" : 'All Reminders'}
          </button>
        ))}
      </div>

      {/* Add Reminder Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Medicine Reminder">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Medicine Name *</label>
              <input className="input" placeholder="e.g. Metformin"
                value={form.medicine_name} onChange={e => setForm({ ...form, medicine_name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Dosage</label>
              <input className="input" placeholder="e.g. 500mg, 1 tablet"
                value={form.dosage} onChange={e => setForm({ ...form, dosage: e.target.value })} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Reminder Times *</label>
              <button type="button" onClick={addTime}
                className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                <Plus size={12} /> Add time
              </button>
            </div>
            <div className="space-y-2">
              {form.reminder_times.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="time" className="input flex-1" value={t}
                    onChange={e => updateTime(i, e.target.value)} />
                  {form.reminder_times.length > 1 && (
                    <button type="button" onClick={() => removeTime(i)}
                      className="text-gray-300 hover:text-red-500 transition-colors">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" className="input" value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.end_date}
                min={form.start_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <input className="input" placeholder="e.g. Take after meals"
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Creating...' : 'Create Reminder'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {loading ? <PageSpinner /> : (
        <>
          {/* Today's doses */}
          {activeTab === 'today' && (
            todayReminders.length === 0 ? (
              <EmptyState icon={<Bell size={36} />} title="No reminders for today"
                description="Add medicine reminders to track your doses"
                action={<button onClick={() => setShowForm(true)} className="btn-primary">Add Reminder</button>} />
            ) : (
              <div className="space-y-4">
                {todayReminders.map((r: any) => (
                  <div key={r.reminder_id} className="card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Pill size={18} className="text-primary-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{r.medicine_name}</div>
                        {r.dosage && <div className="text-xs text-gray-500">{r.dosage}</div>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {r.logs.map((log: any) => (
                        <div key={log.log_id}
                          className={`rounded-xl p-3 text-center border ${log.is_taken ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <Clock size={14} className={`mx-auto mb-1 ${log.is_taken ? 'text-green-500' : 'text-gray-400'}`} />
                          <div className="text-sm font-medium text-gray-800">{log.scheduled_time}</div>
                          {log.is_taken ? (
                            <div className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                              <CheckCircle size={11} /> Taken {log.taken_at}
                            </div>
                          ) : (
                            <button onClick={() => markTaken(log.log_id)}
                              className="mt-1.5 text-xs bg-primary-600 text-white px-2 py-1 rounded-lg hover:bg-primary-700 transition-colors">
                              Mark Taken
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* All reminders */}
          {activeTab === 'all' && (
            reminders.length === 0 ? (
              <EmptyState icon={<Pill size={36} />} title="No reminders yet"
                description="Add reminders for your medications"
                action={<button onClick={() => setShowForm(true)} className="btn-primary">Add Reminder</button>} />
            ) : (
              <div className="space-y-3">
                {reminders.map((r: any) => {
                  let times: string[] = []
                  try { times = JSON.parse(r.reminder_times) } catch {}
                  return (
                    <div key={r.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                            <Pill size={16} className="text-primary-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900">{r.medicine_name}</span>
                              <StatusBadge status={r.status} />
                            </div>
                            {r.dosage && <div className="text-xs text-gray-500 mt-0.5">{r.dosage}</div>}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {times.map((t: string) => (
                                <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Clock size={10} /> {t}
                                </span>
                              ))}
                            </div>
                            <div className="text-xs text-gray-400 mt-1.5">
                              {r.start_date} {r.end_date ? `→ ${r.end_date}` : '(ongoing)'}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {r.status === 'ACTIVE' && (
                            <button onClick={() => pauseReminder(r.id)}
                              className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors" title="Pause">
                              <PauseCircle size={16} />
                            </button>
                          )}
                          <button onClick={() => cancelReminder(r.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
