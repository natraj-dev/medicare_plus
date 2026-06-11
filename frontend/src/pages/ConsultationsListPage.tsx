import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Stethoscope, Plus, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { PageSpinner, EmptyState } from '../components/ui/index'

export default function ConsultationsListPage() {
  const { user } = useAuthStore()
  const [consultations, setConsultations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/consultations')
      .then(r => setConsultations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Consultations</h1>
          <p className="text-gray-500 text-sm mt-1">
            {user?.role === 'DOCTOR' ? 'Your consultation records' : 'Your consultation history'}
          </p>
        </div>
        {user?.role === 'DOCTOR' && (
          <Link to="/consultation/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Consultation
          </Link>
        )}
      </div>

      {consultations.length === 0 ? (
        <EmptyState
          icon={<Stethoscope size={40} />}
          title="No consultations found"
          description="Consultation records will appear here after appointments."
        />
      ) : (
        <div className="space-y-3">
          {consultations.map((c: any) => (
            <div key={c.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-medium text-gray-900">Consultation #{c.id}</span>
                    <span className="badge-blue">Appointment #{c.appointment_id}</span>
                  </div>
                  {c.diagnosis && (
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-medium text-gray-500">Diagnosis: </span>
                      {c.diagnosis}
                    </div>
                  )}
                  {c.treatment_plan && (
                    <div className="text-sm text-gray-600 line-clamp-2">
                      <span className="font-medium text-gray-500">Treatment: </span>
                      {c.treatment_plan}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>📅 {format(new Date(c.created_at), 'MMM d, yyyy')}</span>
                    {c.follow_up_date && (
                      <span className="text-blue-500">🔄 Follow-up: {c.follow_up_date}</span>
                    )}
                  </div>
                </div>
                <Link
                  to={`/appointments/${c.appointment_id}`}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 shrink-0">
                  View <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
