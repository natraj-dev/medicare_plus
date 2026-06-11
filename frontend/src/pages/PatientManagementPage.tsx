import { useState, useEffect } from 'react'
import { Users, Search, Eye, X } from 'lucide-react'
import api from '../utils/api'
import { Modal, PageSpinner, StatusBadge } from '../components/ui/index'

export default function PatientManagementPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const limit = 20

  const fetchPatients = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/patients', {
        params: { search: search || undefined, skip: page * limit, limit }
      })
      setPatients(data.patients)
      setTotal(data.total)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchPatients() }, [search, page])

  const openDetail = async (patientId: number) => {
    setDetailLoading(true)
    try {
      const { data } = await api.get(`/admin/patients/${patientId}/detail`)
      setSelected(data)
    } catch {}
    setDetailLoading(false)
  }

  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Patient Management</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total patients</p>
        </div>
      </div>

      <div className="card p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }} />
        </div>
      </div>

      {loading ? <PageSpinner /> : patients.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No patients found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Age / Gender</th>
                  <th className="px-4 py-3">Blood Group</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Appointments</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs shrink-0">
                          {p.full_name?.[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{p.full_name}</div>
                          <div className="text-xs text-gray-400">ID #{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.age || '—'} / {p.gender || '—'}</td>
                    <td className="px-4 py-3">
                      {p.blood_group ? (
                        <span className="badge-blue">{p.blood_group}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.total_appointments}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{p.created_at?.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(p.id)}
                        className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm">
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
              <span className="text-sm text-gray-500">Page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40">← Prev</button>
                <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
                  className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Patient detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Patient Details" size="lg">
        {detailLoading ? <PageSpinner /> : selected && (
          <div className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Full Name', selected.patient.full_name],
                ['Age', selected.patient.age || '—'],
                ['Gender', selected.patient.gender || '—'],
                ['Blood Group', selected.patient.blood_group || '—'],
                ['Phone', selected.patient.phone || '—'],
                ['Address', selected.patient.address || '—'],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="font-medium text-gray-900 text-sm mt-0.5">{val}</div>
                </div>
              ))}
            </div>

            {(selected.patient.allergies || selected.patient.chronic_conditions) && (
              <div className="flex flex-col sm:flex-row gap-3">
                {selected.patient.allergies && (
                  <div className="flex-1 bg-red-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-red-700 mb-1">⚠️ Allergies</div>
                    <div className="text-sm text-red-800">{selected.patient.allergies}</div>
                  </div>
                )}
                {selected.patient.chronic_conditions && (
                  <div className="flex-1 bg-yellow-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-yellow-700 mb-1">🔔 Chronic Conditions</div>
                    <div className="text-sm text-yellow-800">{selected.patient.chronic_conditions}</div>
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                ['Appointments', selected.stats.total_appointments],
                ['Prescriptions', selected.stats.prescriptions],
                ['Lab Tests', selected.stats.lab_tests],
                ['Records', selected.stats.medical_records],
                ['Billed', `₹${selected.stats.total_billed}`],
                ['Collected', `₹${selected.stats.total_collected}`],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-blue-50 rounded-lg p-2 text-center">
                  <div className="font-bold text-blue-700 text-sm">{val}</div>
                  <div className="text-xs text-blue-500">{label}</div>
                </div>
              ))}
            </div>

            {/* Recent appointments */}
            {selected.recent_appointments?.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-800 mb-2 text-sm">Recent Appointments</h3>
                <div className="space-y-2">
                  {selected.recent_appointments.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-gray-700">{a.date} at {a.time}</span>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
