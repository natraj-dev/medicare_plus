import { useState, useEffect } from 'react'
import { Users, Search, CheckCircle, XCircle, Star, Eye } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Modal, PageSpinner, StatusBadge } from '../components/ui/index'

export default function DoctorManagementPage() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<any>(null)
  const limit = 20

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/doctors/list', {
        params: {
          search: search || undefined,
          verified_only: verifiedOnly || undefined,
          skip: page * limit,
          limit,
        },
      })
      setDoctors(data.doctors)
      setTotal(data.total)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchDoctors() }, [search, verifiedOnly, page])

  const verify = async (doctorId: number, verified: boolean) => {
    try {
      await api.put(`/admin/doctors/${doctorId}/${verified ? 'verify' : 'unverify'}`)
      toast.success(verified ? 'Doctor verified' : 'Verification removed')
      fetchDoctors()
    } catch { toast.error('Failed') }
  }

  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Doctor Management</h1>
        <p className="text-gray-500 text-sm mt-1">{total} total doctors</p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name or specialization..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={verifiedOnly}
            onChange={e => { setVerifiedOnly(e.target.checked); setPage(0) }} />
          Verified only
        </label>
      </div>

      {loading ? <PageSpinner /> : doctors.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No doctors found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Specialization</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Appointments</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {doctors.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs shrink-0">
                          {d.full_name?.[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{d.full_name}</div>
                          <div className="text-xs text-gray-400">{d.experience} yrs exp</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.specialization}</td>
                    <td className="px-4 py-3 text-gray-700">₹{d.consultation_fee}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-yellow-600">
                        <Star size={12} className="fill-yellow-400 text-yellow-400" />
                        {d.rating?.toFixed(1)} ({d.total_reviews})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.total_appointments}</td>
                    <td className="px-4 py-3 text-gray-700">₹{d.revenue_generated?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={d.is_verified ? 'badge-green' : 'badge-yellow'}>
                          {d.is_verified ? '✓ Verified' : 'Unverified'}
                        </span>
                        <StatusBadge status={d.availability_status} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelected(d)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View details">
                          <Eye size={14} />
                        </button>
                        {d.is_verified ? (
                          <button
                            onClick={() => verify(d.id, false)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove verification">
                            <XCircle size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => verify(d.id, true)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Verify doctor">
                            <CheckCircle size={14} />
                          </button>
                        )}
                      </div>
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

      {/* Doctor detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Doctor Details" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-700 font-bold text-2xl">
                {selected.full_name?.[0]}
              </div>
              <div>
                <div className="text-xl font-display font-bold text-gray-900">{selected.full_name}</div>
                <div className="text-sm text-primary-600 font-medium">{selected.specialization}</div>
                <div className="flex items-center gap-2 mt-1">
                  {selected.is_verified
                    ? <span className="badge-green">✓ Verified</span>
                    : <span className="badge-yellow">Unverified</span>}
                  <StatusBadge status={selected.availability_status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Qualification', selected.qualification],
                ['Experience', `${selected.experience} years`],
                ['Consultation Fee', `₹${selected.consultation_fee}`],
                ['Rating', `${selected.rating} ★ (${selected.total_reviews} reviews)`],
                ['Total Appointments', selected.total_appointments],
                ['Revenue Generated', `₹${selected.revenue_generated?.toLocaleString()}`],
                ['Joined', selected.created_at?.slice(0, 10)],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="font-medium text-gray-900 text-sm mt-0.5">{val || '—'}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              {!selected.is_verified ? (
                <button
                  onClick={() => { verify(selected.id, true); setSelected(null) }}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <CheckCircle size={15} /> Verify Doctor
                </button>
              ) : (
                <button
                  onClick={() => { verify(selected.id, false); setSelected(null) }}
                  className="btn-danger flex-1 flex items-center justify-center gap-2">
                  <XCircle size={15} /> Remove Verification
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
