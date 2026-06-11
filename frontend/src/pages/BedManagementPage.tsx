import { useState, useEffect } from 'react'
import { BedDouble, Plus, RefreshCw, X, Building } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Modal, PageSpinner, EmptyState } from '../components/ui/index'

const BED_STATUS_STYLES: Record<string, string> = {
  AVAILABLE:   'bg-green-100 border-green-300 text-green-800',
  OCCUPIED:    'bg-red-100 border-red-300 text-red-800',
  MAINTENANCE: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  RESERVED:    'bg-blue-100 border-blue-300 text-blue-800',
}

const WARD_TYPES = ['GENERAL','ICU','EMERGENCY','MATERNITY','PEDIATRIC','SURGICAL','ISOLATION']

export default function BedManagementPage() {
  const { user } = useAuthStore()
  const [wards, setWards]               = useState<any[]>([])
  const [beds, setBeds]                 = useState<any[]>([])
  const [availability, setAvailability] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [selectedWard, setSelectedWard] = useState<number | null>(null)
  const [showWardForm, setShowWardForm] = useState(false)
  const [showBedForm, setShowBedForm]   = useState(false)
  const [wardForm, setWardForm] = useState({ name:'', ward_type:'GENERAL', floor:1, total_beds:10, description:'' })
  const [bedForm, setBedForm]   = useState({ ward_id:0, bed_number:'', bed_type:'STANDARD', features:'' })
  const [submitting, setSubmitting] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [w, a] = await Promise.all([
        api.get('/beds/wards'),
        api.get('/beds/availability'),
      ])
      setWards(w.data)
      setAvailability(a.data)
      if (w.data.length > 0 && !selectedWard) setSelectedWard(w.data[0].id)
    } catch {}
    setLoading(false)
  }

  const fetchBeds = async (wardId: number) => {
    try {
      const { data } = await api.get(`/beds?ward_id=${wardId}`)
      setBeds(data)
    } catch {}
  }

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { if (selectedWard) fetchBeds(selectedWard) }, [selectedWard])

  const createWard = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/beds/wards', wardForm)
      toast.success('Ward created!')
      setShowWardForm(false)
      setWardForm({ name:'', ward_type:'GENERAL', floor:1, total_beds:10, description:'' })
      fetchAll()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const createBed = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/beds', { ...bedForm, ward_id: Number(bedForm.ward_id) })
      toast.success('Bed added!')
      setShowBedForm(false)
      setBedForm({ ward_id:0, bed_number:'', bed_type:'STANDARD', features:'' })
      if (selectedWard) fetchBeds(selectedWard)
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const updateBedStatus = async (bedId: number, status: string) => {
    try {
      await api.put(`/beds/${bedId}/status?status=${status}`)
      toast.success('Status updated')
      if (selectedWard) fetchBeds(selectedWard)
      fetchAll()
    } catch { toast.error('Failed') }
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Bed Management</h1>
          <p className="text-gray-500 text-sm mt-1">Hospital wards and bed allocation</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowWardForm(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <Building size={15} /> Add Ward
            </button>
            <button onClick={() => setShowBedForm(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={15} /> Add Bed
            </button>
          </div>
        )}
      </div>

      {/* Availability summary */}
      {availability.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {availability.map((a: any) => (
            <button key={a.ward_id}
              onClick={() => setSelectedWard(a.ward_id)}
              className={`card p-4 text-left transition-all hover:shadow-md ${selectedWard === a.ward_id ? 'ring-2 ring-primary-500' : ''}`}>
              <div className="font-semibold text-gray-900 text-sm mb-1">{a.ward_name}</div>
              <div className="text-xs text-gray-500 mb-2">{a.ward_type} • Floor {a.floor}</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-600 font-bold">{a.available} free</span>
                <span className="text-gray-300">|</span>
                <span className="text-red-500">{a.occupied} occupied</span>
              </div>
              {/* Mini progress bar */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full transition-all"
                  style={{ width: `${a.total > 0 ? (a.occupied / a.total) * 100 : 0}%` }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bed grid */}
      {loading ? <PageSpinner /> : (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-gray-900">
              {wards.find(w => w.id === selectedWard)?.name || 'Select a Ward'} — Beds
            </h2>
            <button onClick={() => selectedWard && fetchBeds(selectedWard)}
              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              <RefreshCw size={15} />
            </button>
          </div>

          {beds.length === 0 ? (
            <EmptyState icon={<BedDouble size={36} />} title="No beds in this ward"
              description={isAdmin ? "Add beds to get started" : "No beds configured"}
              action={isAdmin ? <button onClick={() => setShowBedForm(true)} className="btn-primary">Add Bed</button> : undefined} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {beds.map(bed => (
                <div key={bed.id}
                  className={`border-2 rounded-xl p-3 text-center transition-all ${BED_STATUS_STYLES[bed.status] || 'bg-gray-50 border-gray-200'}`}>
                  <BedDouble size={22} className="mx-auto mb-1.5" />
                  <div className="font-bold text-sm">{bed.bed_number}</div>
                  <div className="text-xs mt-0.5 opacity-75">{bed.bed_type}</div>
                  <div className="text-xs font-medium mt-1">{bed.status}</div>
                  {isAdmin && bed.status === 'AVAILABLE' && (
                    <button onClick={() => updateBedStatus(bed.id, 'MAINTENANCE')}
                      className="mt-2 text-[10px] bg-white/50 hover:bg-white px-2 py-0.5 rounded-full transition-colors">
                      Maintenance
                    </button>
                  )}
                  {isAdmin && bed.status === 'MAINTENANCE' && (
                    <button onClick={() => updateBedStatus(bed.id, 'AVAILABLE')}
                      className="mt-2 text-[10px] bg-white/50 hover:bg-white px-2 py-0.5 rounded-full transition-colors">
                      Set Available
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-50">
            {Object.entries(BED_STATUS_STYLES).map(([status, cls]) => (
              <div key={status} className="flex items-center gap-1.5 text-xs">
                <div className={`w-3 h-3 rounded border ${cls}`} />
                <span className="text-gray-600">{status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ward Form Modal */}
      <Modal open={showWardForm} onClose={() => setShowWardForm(false)} title="Add New Ward">
        <form onSubmit={createWard} className="space-y-4">
          <div>
            <label className="label">Ward Name *</label>
            <input className="input" placeholder="e.g. General Ward A"
              value={wardForm.name} onChange={e => setWardForm({ ...wardForm, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Ward Type</label>
              <select className="input" value={wardForm.ward_type}
                onChange={e => setWardForm({ ...wardForm, ward_type: e.target.value })}>
                {WARD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Floor</label>
              <input type="number" className="input" min={1}
                value={wardForm.floor} onChange={e => setWardForm({ ...wardForm, floor: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={wardForm.description}
              onChange={e => setWardForm({ ...wardForm, description: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Creating...' : 'Create Ward'}
            </button>
            <button type="button" onClick={() => setShowWardForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Bed Form Modal */}
      <Modal open={showBedForm} onClose={() => setShowBedForm(false)} title="Add New Bed">
        <form onSubmit={createBed} className="space-y-4">
          <div>
            <label className="label">Ward *</label>
            <select className="input" value={bedForm.ward_id}
              onChange={e => setBedForm({ ...bedForm, ward_id: Number(e.target.value) })} required>
              <option value={0}>— Select ward —</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Bed Number *</label>
              <input className="input" placeholder="e.g. A-01"
                value={bedForm.bed_number} onChange={e => setBedForm({ ...bedForm, bed_number: e.target.value })} required />
            </div>
            <div>
              <label className="label">Bed Type</label>
              <select className="input" value={bedForm.bed_type}
                onChange={e => setBedForm({ ...bedForm, bed_type: e.target.value })}>
                {['STANDARD','ICU','ELECTRIC','BARIATRIC'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Features</label>
            <input className="input" placeholder="e.g. oxygen, monitor, ventilator"
              value={bedForm.features} onChange={e => setBedForm({ ...bedForm, features: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Adding...' : 'Add Bed'}
            </button>
            <button type="button" onClick={() => setShowBedForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
