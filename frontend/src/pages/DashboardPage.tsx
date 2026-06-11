import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, Users, FileText, Bell, TrendingUp, Clock,
  CheckCircle, XCircle, Plus, Bot, Stethoscope, BarChart2,
  UserCheck, Download, AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import api from '../utils/api'
import { format } from 'date-fns'
import { StatusBadge } from '../components/ui/index'

function StatCard({ label, value, icon: Icon, colorClass, sub }: {
  label: string; value: any; icon: any; colorClass: string; sub?: string
}) {
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorClass}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="text-2xl font-display font-bold text-gray-900">{value ?? '—'}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function AppointmentItem({ appt }: { appt: any }) {
  return (
    <Link to={`/appointments/${appt.id}`}
      className="flex items-center justify-between py-3 border-b last:border-0 border-gray-50 hover:bg-gray-50 -mx-1 px-1 rounded-lg transition-colors">
      <div>
        <div className="text-sm font-medium text-gray-900">
          {format(new Date(appt.appointment_date), 'MMM d, yyyy')} at {appt.appointment_time?.slice(0, 5)}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{appt.reason || 'General Consultation'}</div>
      </div>
      <StatusBadge status={appt.status} />
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [appointments, setAppointments] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [adminStats, setAdminStats] = useState<any>(null)

  useEffect(() => {
    api.get('/appointments?limit=10').then(r => setAppointments(r.data)).catch(() => {})
    api.get('/notifications?limit=5').then(r => setNotifications(r.data)).catch(() => {})
    if (user?.role === 'ADMIN') {
      api.get('/admin/dashboard').then(r => setAdminStats(r.data)).catch(() => {})
    }
  }, [user])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const pending   = appointments.filter(a => a.status === 'PENDING').length
  const confirmed = appointments.filter(a => a.status === 'CONFIRMED').length
  const completed = appointments.filter(a => a.status === 'COMPLETED').length
  const cancelled = appointments.filter(a => a.status === 'CANCELLED').length

  // Role-specific quick actions
  const patientActions = [
    { to: '/appointments/book', icon: Calendar,    label: 'Book Appointment', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    { to: '/doctors',           icon: Users,       label: 'Find Doctor',      color: 'bg-green-50 text-green-600 hover:bg-green-100' },
    { to: '/medical-records',   icon: FileText,    label: 'Medical Records',  color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
    { to: '/ai-assistant',      icon: Bot,         label: 'AI Assistant',     color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
    { to: '/billing',           icon: TrendingUp,  label: 'Billing',          color: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' },
    { to: '/reports',           icon: Download,    label: 'Download Reports', color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
  ]

  const doctorActions = [
    { to: '/consultation/new',  icon: Stethoscope, label: 'Add Consultation', color: 'bg-green-50 text-green-600 hover:bg-green-100' },
    { to: '/prescriptions/write',icon: FileText,   label: 'Write Rx',         color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    { to: '/my-patients',       icon: UserCheck,   label: 'My Patients',      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
    { to: '/schedule',          icon: Clock,       label: 'My Schedule',      color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
  ]

  const adminActions = [
    { to: '/admin',             icon: BarChart2,   label: 'Analytics',        color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    { to: '/admin/patients',    icon: Users,       label: 'Patients',         color: 'bg-green-50 text-green-600 hover:bg-green-100' },
    { to: '/admin/doctors',     icon: UserCheck,   label: 'Doctors',          color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
    { to: '/departments',       icon: AlertCircle, label: 'Departments',      color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
  ]

  const quickActions =
    user?.role === 'ADMIN'  ? adminActions  :
    user?.role === 'DOCTOR' ? doctorActions :
    patientActions

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            {greeting()}, {user?.profile?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        {user?.role === 'PATIENT' && (
          <Link to="/appointments/book" className="btn-primary flex items-center gap-2 shrink-0">
            <Plus size={16} /> Book Appointment
          </Link>
        )}
        {user?.role === 'DOCTOR' && (
          <Link to="/consultation/new" className="btn-primary flex items-center gap-2 shrink-0">
            <Stethoscope size={16} /> New Consultation
          </Link>
        )}
      </div>

      {/* Admin stats */}
      {user?.role === 'ADMIN' && adminStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Patients"      value={adminStats.total_patients}       icon={Users}         colorClass="bg-blue-500"   />
          <StatCard label="Total Doctors"       value={adminStats.total_doctors}        icon={UserCheck}     colorClass="bg-green-500"  />
          <StatCard label="Today's Appts"       value={adminStats.appointments_today}   icon={Calendar}      colorClass="bg-purple-500" sub={`${adminStats.pending_appointments} pending`} />
          <StatCard label="Total Revenue"       value={`₹${Number(adminStats.total_revenue).toLocaleString()}`} icon={TrendingUp} colorClass="bg-orange-500" />
        </div>
      )}

      {/* Patient / Doctor stats */}
      {user?.role !== 'ADMIN' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total"      value={appointments.length} icon={Calendar}     colorClass="bg-blue-500"   />
          <StatCard label="Pending"    value={pending}             icon={Clock}        colorClass="bg-yellow-500" />
          <StatCard label="Completed"  value={completed}           icon={CheckCircle}  colorClass="bg-green-500"  />
          <StatCard label="Cancelled"  value={cancelled}           icon={XCircle}      colorClass="bg-red-500"    />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent appointments */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-gray-900">Recent Appointments</h2>
            <Link to="/appointments" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          {appointments.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Calendar size={32} className="mx-auto mb-2 opacity-40" />
              No appointments yet
            </div>
          ) : (
            <div>
              {appointments.slice(0, 6).map(a => <AppointmentItem key={a.id} appt={a} />)}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-gray-900">Recent Notifications</h2>
            <Link to="/notifications" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Bell size={32} className="mx-auto mb-2 opacity-40" />
              No notifications
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n: any) => (
                <div key={n.id}
                  className={`p-3 rounded-xl text-sm transition-all ${
                    n.is_read ? 'bg-gray-50' : 'bg-blue-50 border border-blue-100'
                  }`}>
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {!n.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />}
                    {n.title}
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5 line-clamp-1">{n.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map(q => (
            <Link key={q.to} to={q.to}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${q.color}`}>
              <q.icon size={22} />
              <span className="text-xs font-medium text-center leading-tight">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
