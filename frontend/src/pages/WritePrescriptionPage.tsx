import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, Pill } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { PageSpinner } from '../components/ui/index'

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'As needed', 'Before meals', 'After meals', 'At bedtime']
const DURATIONS = ['1 day', '2 days', '3 days', '5 days', '7 days', '10 days', '14 days', '1 month', '2 months', '3 months', 'Ongoing']

const emptyMed = (): Medication => ({ name: '', dosage: '', frequency: 'Twice daily', duration: '7 days', instructions: '' })

export default function WritePrescriptionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const patientIdParam = searchParams.get('patient_id')
  const appointmentId = searchParams.get('appointment_id')

  const [patients, setPatients] = useState<any[]>([])
  const [consultations, setConsultations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    patient_id: patientIdParam ? Number(patientIdParam) : 0,
    consultation_id: '',
    instructions: '',
    valid_until: '',
  })
  const [medications, setMedications] = useState<Medication[]>([emptyMed()])

  useEffect(() => {
    api.get('/appointments/my-patients').then(r => setPatients(r.data)).catch(() => { })
  }, [])

  useEffect(() => {
    if (form.patient_id) {
      api.get('/consultations').then(r => {
        // filter by patient via appointment reference
        setConsultations(r.data.slice(0, 20))
      }).catch(() => { })
    }
  }, [form.patient_id])

  const addMed = () => setMedications([...medications, emptyMed()])
  const removeMed = (i: number) => setMedications(medications.filter((_, idx) => idx !== i))
  const updateMed = (i: number, field: keyof Medication, value: string) => {
    setMedications(medications.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.patient_id) { toast.error('Select a patient'); return }
    if (medications.some(m => !m.name || !m.dosage)) {
      toast.error('Fill in medicine name and dosage for all entries')
      return
    }
    setSubmitting(true)
    try {
      const payload: any = {
        patient_id: form.patient_id,
        medications,
        instructions: form.instructions || undefined,
        valid_until: form.valid_until || undefined,
        consultation_id: form.consultation_id ? Number(form.consultation_id) : undefined,
      }
      await api.post('/prescriptions', payload)
      toast.success('Prescription created successfully!')
      navigate('/prescriptions')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create prescription')
    }
    setSubmitting(false)
  }

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <Link to="/prescriptions" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft size={16} /> Back to Prescriptions
      </Link>

      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Write Prescription</h1>
        <p className="text-gray-500 text-sm mt-1">Create a new prescription for your patient</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Patient & Consultation */}
        <div className="card p-5 space-y-4">
          <h2 className="font-display font-semibold text-gray-900">Patient Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Select Patient *</label>
              <select className="input" value={form.patient_id}
                onChange={e => setForm({ ...form, patient_id: Number(e.target.value) })} required>
                <option value={0}>— Choose patient —</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} (ID: {p.id})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Linked Consultation (optional)</label>
              <select className="input" value={form.consultation_id}
                onChange={e => setForm({ ...form, consultation_id: e.target.value })}>
                <option value="">— None —</option>
                {consultations.map(c => <option key={c.id} value={c.id}>Consultation #{c.id} — {c.created_at?.slice(0, 10)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Valid Until (optional)</label>
              <input type="date" className="input" value={form.valid_until}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm({ ...form, valid_until: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Medications */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-gray-900 flex items-center gap-2">
              <Pill size={16} className="text-primary-600" /> Medications
            </h2>
            <button type="button" onClick={addMed} className="btn-secondary text-sm flex items-center gap-1.5 py-1.5">
              <Plus size={14} /> Add Medicine
            </button>
          </div>

          {medications.map((med, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50 relative">
              {medications.length > 1 && (
                <button type="button" onClick={() => removeMed(i)}
                  className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={15} />
                </button>
              )}
              <div className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-1 rounded inline-block">
                Medicine {i + 1}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Medicine Name *</label>
                  <input className="input" placeholder="e.g. Paracetamol 500mg"
                    value={med.name} onChange={e => updateMed(i, 'name', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Dosage *</label>
                  <input className="input" placeholder="e.g. 1 tablet, 5ml"
                    value={med.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Frequency</label>
                  <select className="input" value={med.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)}>
                    {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Duration</label>
                  <select className="input" value={med.duration} onChange={e => updateMed(i, 'duration', e.target.value)}>
                    {DURATIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Special Instructions</label>
                  <input className="input" placeholder="e.g. Take after meals, avoid alcohol"
                    value={med.instructions} onChange={e => updateMed(i, 'instructions', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* General instructions */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-gray-900 mb-3">General Instructions</h2>
          <textarea className="input" rows={3}
            placeholder="General instructions, lifestyle advice, dietary restrictions..."
            value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} />
        </div>

        {/* Preview */}
        {medications.some(m => m.name) && (
          <div className="card p-5 bg-green-50 border-green-100">
            <h2 className="font-display font-semibold text-gray-800 mb-3">Preview</h2>
            {medications.filter(m => m.name).map((m, i) => (
              <div key={i} className="text-sm text-gray-700 py-1.5 border-b border-green-100 last:border-0">
                <span className="font-medium">{m.name}</span> — {m.dosage} — {m.frequency} — {m.duration}
                {m.instructions && <span className="text-gray-500"> ({m.instructions})</span>}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary flex-1 py-2.5">
            {submitting ? 'Creating...' : 'Create Prescription'}
          </button>
          <Link to="/prescriptions" className="btn-secondary px-6 py-2.5">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
