import { useState, useEffect } from 'react'
import { Users, Search, Eye, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { Modal, PageSpinner } from '../components/ui/index'

export default function MyPatientsPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    api.get('/appointments/my-patients')
      .then(r => { setPatients(r.data); setFiltered(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!search.trim()) { setFiltered(patients); return }
    const q = search.toLowerCase()
    setFiltered(patients.filter((p: any) =>
      p.full_name?.toLowerCase().includes(q) ||
      p.phone?.includes(q)
    ))
  }, [search, patients])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">My Patients</h1>
        <p className="text-gray-500 text-sm mt-1">{patients.length} patients treated</p>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name or phone..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? <PageSpinner /> : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">{search ? 'No patients match your search' : 'No patients yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p: any) => (
            <div key={p.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold shrink-0">
                  {p.full_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{p.full_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                    {p.age && <span>{p.age} yrs</span>}
                    {p.gender && <span> • {p.gender}</span>}
                    {p.blood_group && <span> • {p.blood_group}</span>}
                  </div>
                  {p.phone && <div className="text-xs text-gray-400 mt-0.5">📞 {p.phone}</div>}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {p.total_appointments} appointment{p.total_appointments !== 1 ? 's' : ''}
                </span>
                {p.last_appointment && (
                  <span>Last: {p.last_appointment}</span>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setSelected(p)}
                  className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5">
                  <Eye size={13} /> View
                </button>
                <Link
                  to={`/appointments/book?doctor_id=me&patient_override=${p.id}`}
                  className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5">
                  <Calendar size={13} /> Book
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Patient Details" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700 font-bold text-2xl">
                {selected.full_name?.[0]}
              </div>
              <div>
                <div className="text-xl font-display font-bold text-gray-900">{selected.full_name}</div>
                <div className="text-sm text-gray-500">Patient ID #{selected.id}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Age', selected.age],
                ['Gender', selected.gender],
                ['Blood Group', selected.blood_group],
                ['Phone', selected.phone],
                ['Total Visits', selected.total_appointments],
                ['Last Visit', selected.last_appointment],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="font-medium text-gray-900 text-sm mt-0.5">{val || '—'}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                to={`/prescriptions/write?patient_id=${selected.id}`}
                className="btn-primary flex-1 text-center text-sm"
                onClick={() => setSelected(null)}>
                Write Prescription
              </Link>
              <Link
                to={`/lab-tests?patient=${selected.id}`}
                className="btn-secondary flex-1 text-center text-sm"
                onClick={() => setSelected(null)}>
                Request Lab Test
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
