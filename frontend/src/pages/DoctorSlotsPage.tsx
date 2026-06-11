import { useState, useEffect } from 'react'
import { Clock, Plus, Trash2, Lock, Calendar, RefreshCw } from 'lucide-react'
import { format, addDays } from 'date-fns'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Modal, PageSpinner, EmptyState } from '../components/ui/index'

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-green-50 border-green-200 text-green-700',
  BOOKED:    'bg-blue-50 border-blue-200 text-blue-700',
  BLOCKED:   'bg-gray-100 border-gray-300 text-gray-500',
}

export default function DoctorSlotsPage() {
  const { user } = useAuthStore()
  const [slots, setSlots]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showSingle, setShowSingle] = useState(false)
  const [showBulk, setShowBulk]     = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [singleForm, setSingleForm] = useState({
    slot_date: new Date().toISOString().split('T')[0],
    start_time: '09:00', end_time: '09:30',
    slot_type: 'IN_PERSON', notes: '',
  })
  const [bulkForm, setBulkForm] = useState({
    slot_date: new Date().toISOString().split('T')[0],
    start_time: '09:00', end_time: '17:00',
    slot_duration: 30, slot_type: 'IN_PERSON',
  })

  const fetchSlots = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/slots/my?slot_date=${selectedDate}`)
      setSlots(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchSlots() }, [selectedDate])

  const createSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/slots', singleForm)
      toast.success('Slot created')
      setShowSingle(false)
      fetchSlots()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const createBulk = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data } = await api.post('/slots/bulk', bulkForm)
      toast.success(`${data.length} slots created!`)
      setShowBulk(false)
      fetchSlots()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const blockSlot = async (slotId: number) => {
    try {
      await api.put(`/slots/${slotId}/block`)
      toast.success('Slot blocked')
      fetchSlots()
    } catch { toast.error('Failed') }
  }

  const deleteSlot = async (slotId: number) => {
    try {
      await api.delete(`/slots/${slotId}`)
      toast.success('Slot deleted')
      fetchSlots()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  // Next 7 days for quick nav
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i)
    return { date: d.toISOString().split('T')[0], label: i === 0 ? 'Today' : format(d, 'EEE d') }
  })

  const available = slots.filter(s => s.status === 'AVAILABLE').length
  const booked    = slots.filter(s => s.status === 'BOOKED').length
  const blocked   = slots.filter(s => s.status === 'BLOCKED').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Slot Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your availability slots</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(true)}
            className="btn-secondary flex items-center gap-1.5 text-sm">
            <RefreshCw size={14} /> Bulk Generate
          </button>
          <button onClick={() => setShowSingle(true)}
            className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus size={14} /> Add Slot
          </button>
        </div>
      </div>

      {/* Quick date nav */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {nextDays.map(d => (
          <button key={d.date} onClick={() => setSelectedDate(d.date)}
            className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
              selectedDate === d.date
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
            }`}>
            {d.label}
          </button>
        ))}
        <input type="date" className="input text-sm shrink-0 w-40"
          value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
      </div>

      {/* Day summary */}
      {slots.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Available', available, 'bg-green-50 text-green-700 border-green-200'],
            ['Booked',    booked,    'bg-blue-50 text-blue-700 border-blue-200'],
            ['Blocked',   blocked,   'bg-gray-50 text-gray-600 border-gray-200'],
          ].map(([label, val, cls]) => (
            <div key={label as string} className={`rounded-xl border p-3 text-center ${cls}`}>
              <div className="text-2xl font-bold">{val}</div>
              <div className="text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Slot grid */}
      {loading ? <PageSpinner /> : slots.length === 0 ? (
        <EmptyState
          icon={<Clock size={40} />}
          title={`No slots for ${selectedDate}`}
          description="Generate bulk slots or add individual ones"
          action={
            <div className="flex gap-2">
              <button onClick={() => { setBulkForm(f => ({ ...f, slot_date: selectedDate })); setShowBulk(true) }}
                className="btn-primary">Generate Slots</button>
            </div>
          }
        />
      ) : (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-gray-900 mb-4">
            {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')} — {slots.length} slots
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {slots.map((slot: any) => (
              <div key={slot.id}
                className={`border rounded-xl p-3 transition-all ${STATUS_STYLES[slot.status] || 'bg-gray-50 border-gray-200'}`}>
                <div className="font-semibold text-sm mb-0.5">
                  {String(slot.start_time).slice(0, 5)}
                </div>
                <div className="text-xs opacity-75 mb-2">
                  → {String(slot.end_time).slice(0, 5)}
                </div>
                <div className="text-xs font-medium mb-2">{slot.status}</div>
                <div className="text-[10px] opacity-60 mb-2">
                  {slot.slot_type.replace('_', ' ')}
                </div>
                {slot.status === 'AVAILABLE' && (
                  <div className="flex gap-1">
                    <button onClick={() => blockSlot(slot.id)}
                      className="flex-1 text-[10px] bg-white/60 hover:bg-white px-1.5 py-1 rounded-lg transition-colors flex items-center justify-center gap-0.5">
                      <Lock size={9} /> Block
                    </button>
                    <button onClick={() => deleteSlot(slot.id)}
                      className="text-[10px] bg-white/60 hover:bg-red-100 px-1.5 py-1 rounded-lg transition-colors">
                      <Trash2 size={9} />
                    </button>
                  </div>
                )}
                {slot.status === 'BLOCKED' && (
                  <button onClick={() => deleteSlot(slot.id)}
                    className="w-full text-[10px] bg-white/60 hover:bg-white px-1.5 py-1 rounded-lg transition-colors">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single Slot Modal */}
      <Modal open={showSingle} onClose={() => setShowSingle(false)} title="Add Single Slot">
        <form onSubmit={createSingle} className="space-y-4">
          <div>
            <label className="label">Date *</label>
            <input type="date" className="input"
              min={new Date().toISOString().split('T')[0]}
              value={singleForm.slot_date}
              onChange={e => setSingleForm({ ...singleForm, slot_date: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Time *</label>
              <input type="time" className="input" value={singleForm.start_time}
                onChange={e => setSingleForm({ ...singleForm, start_time: e.target.value })} required />
            </div>
            <div>
              <label className="label">End Time *</label>
              <input type="time" className="input" value={singleForm.end_time}
                onChange={e => setSingleForm({ ...singleForm, end_time: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={singleForm.slot_type}
              onChange={e => setSingleForm({ ...singleForm, slot_type: e.target.value })}>
              <option value="IN_PERSON">In Person</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={singleForm.notes}
              onChange={e => setSingleForm({ ...singleForm, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Creating...' : 'Create Slot'}
            </button>
            <button type="button" onClick={() => setShowSingle(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Bulk Generate Modal */}
      <Modal open={showBulk} onClose={() => setShowBulk(false)} title="Bulk Generate Slots">
        <form onSubmit={createBulk} className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
            Automatically creates slots from start to end time based on the duration interval.
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="date" className="input"
              min={new Date().toISOString().split('T')[0]}
              value={bulkForm.slot_date}
              onChange={e => setBulkForm({ ...bulkForm, slot_date: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">From *</label>
              <input type="time" className="input" value={bulkForm.start_time}
                onChange={e => setBulkForm({ ...bulkForm, start_time: e.target.value })} required />
            </div>
            <div>
              <label className="label">Until *</label>
              <input type="time" className="input" value={bulkForm.end_time}
                onChange={e => setBulkForm({ ...bulkForm, end_time: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Slot Duration</label>
              <select className="input" value={bulkForm.slot_duration}
                onChange={e => setBulkForm({ ...bulkForm, slot_duration: Number(e.target.value) })}>
                {[15, 20, 30, 45, 60].map(d => (
                  <option key={d} value={d}>{d} minutes</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={bulkForm.slot_type}
                onChange={e => setBulkForm({ ...bulkForm, slot_type: e.target.value })}>
                <option value="IN_PERSON">In Person</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
            Preview: {(() => {
              const [sh, sm] = bulkForm.start_time.split(':').map(Number)
              const [eh, em] = bulkForm.end_time.split(':').map(Number)
              const totalMin = (eh * 60 + em) - (sh * 60 + sm)
              const count = Math.floor(totalMin / bulkForm.slot_duration)
              return count > 0 ? `~${count} slots will be created` : 'Invalid time range'
            })()}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Generating...' : 'Generate Slots'}
            </button>
            <button type="button" onClick={() => setShowBulk(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
