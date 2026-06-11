import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star, Clock, DollarSign, Filter } from 'lucide-react'
import api from '../utils/api'

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const params: any = { limit: 50 }
      if (search) params.search = search
      if (specialization) params.specialization = specialization
      if (availableOnly) params.available_only = true
      const { data } = await api.get('/doctors', { params })
      setDoctors(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchDoctors() }, [search, specialization, availableOnly])

  const statusColor: any = {
    AVAILABLE: 'text-green-600 bg-green-50',
    BUSY: 'text-orange-600 bg-orange-50',
    ON_LEAVE: 'text-red-600 bg-red-50',
    OFFLINE: 'text-gray-600 bg-gray-50',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Find a Doctor</h1>
        <p className="text-gray-500 text-sm mt-1">Search and filter our qualified specialists</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="input pl-9" placeholder="Search doctor name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <input className="input sm:w-48" placeholder="Specialization..." value={specialization} onChange={e => setSpecialization(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
            <input type="checkbox" className="rounded" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} />
            Available only
          </label>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex gap-3"><div className="w-12 h-12 bg-gray-200 rounded-full" /><div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-3/4" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div></div>
            </div>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">No doctors found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map(doc => (
            <div key={doc.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-lg shrink-0">
                  {doc.full_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{doc.full_name}</h3>
                  <p className="text-sm text-gray-500">{doc.specialization}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[doc.availability_status] || 'text-gray-600 bg-gray-50'}`}>
                  {doc.availability_status?.replace('_', ' ')}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {doc.qualification && <p className="text-xs truncate">{doc.qualification}</p>}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1"><Clock size={13} /><span>{doc.experience}y exp</span></div>
                  <div className="flex items-center gap-1"><Star size={13} className="text-yellow-400 fill-yellow-400" /><span>{doc.rating?.toFixed(1)} ({doc.total_reviews})</span></div>
                  <div className="flex items-center gap-1 text-green-600 font-medium"><span>₹{doc.consultation_fee}</span></div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/doctors/${doc.id}`} className="btn-secondary flex-1 text-center text-sm py-1.5">View Profile</Link>
                <Link to={`/appointments/book?doctor_id=${doc.id}`} className="btn-primary flex-1 text-center text-sm py-1.5">Book</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
