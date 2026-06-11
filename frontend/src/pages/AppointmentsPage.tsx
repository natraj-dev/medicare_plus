import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Plus, XCircle, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { StatusBadge, PageSpinner, ConfirmDialog, EmptyState } from '../components/ui/index'

export default function AppointmentsPage() {
  const { user } = useAuthStore()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [cancelId, setCancelId] = useState<number | null>(null)

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { limit: 100 }
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/appointments', { params })
      setAppointments(data)
    } catch { toast.error('Failed to load appointments') }
    setLoading(false)
  }

  useEffect(() => { fetchAppointments() }, [statusFilter])

  const cancelAppointment = async () => {
    if (!cancelId) return
    try {
      await api.delete(`/appointments/${cancelId}`)
      toast.success('Appointment cancelled')
      fetchAppointments()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to cancel')
    }
    setCancelId(null)
  }

  const statuses = ['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-sm mt-1">{appointments.length} total records</p>
        </div>
        {user?.role !== 'DOCTOR' && (
          <Link to="/appointments/book" className="btn-primary flex items-center gap-2 shrink-0">
            <Plus size={16} /> Book Appointment
          </Link>
        )}
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              statusFilter === s
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <PageSpinner /> : appointments.length === 0 ? (
        <EmptyState
          icon={<Calendar size={40} />}
          title="No appointments found"
          description={statusFilter ? `No ${statusFilter.toLowerCase()} appointments` : 'Book your first appointment'}
          action={
            user?.role !== 'DOCTOR' ? (
              <Link to="/appointments/book" className="btn-primary inline-flex items-center gap-2">
                <Plus size={16} /> Book Appointment
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {appointments.map(appt => (
            <div key={appt.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-4">
                  {/* Date badge */}
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary-500 uppercase leading-tight">
                      {format(new Date(appt.appointment_date), 'MMM')}
                    </span>
                    <span className="text-xl font-display font-bold text-primary-600 leading-tight">
                      {format(new Date(appt.appointment_date), 'd')}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-gray-900">
                        {format(new Date(appt.appointment_date), 'EEEE, MMMM d, yyyy')}
                      </span>
                      <StatusBadge status={appt.status} />
                      <span className="badge-gray text-xs">{appt.appointment_type?.replace('_', ' ')}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      🕐 {appt.appointment_time?.slice(0, 5)} &nbsp;·&nbsp; {appt.duration_minutes} min
                    </div>
                    {appt.reason && (
                      <div className="text-sm text-gray-600 mt-0.5">📝 {appt.reason}</div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {['PENDING', 'CONFIRMED'].includes(appt.status) && user?.role !== 'DOCTOR' && (
                    <button
                      onClick={() => setCancelId(appt.id)}
                      className="flex items-center gap-1 text-sm text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-colors">
                      <XCircle size={14} /> Cancel
                    </button>
                  )}
                  {user?.role === 'DOCTOR' && appt.status === 'PENDING' && (
                    <button
                      onClick={async () => {
                        await api.put(`/appointments/${appt.id}/confirm`)
                        toast.success('Confirmed')
                        fetchAppointments()
                      }}
                      className="text-sm text-green-600 border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-xl transition-colors">
                      Confirm
                    </button>
                  )}
                  <Link
                    to={`/appointments/${appt.id}`}
                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 border border-primary-200 hover:bg-primary-50 px-3 py-1.5 rounded-xl transition-colors">
                    Details <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={cancelId !== null}
        onClose={() => setCancelId(null)}
        onConfirm={cancelAppointment}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? This cannot be undone."
        confirmLabel="Yes, Cancel"
        danger
      />
    </div>
  )
}
