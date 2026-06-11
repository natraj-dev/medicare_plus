import { useState, useEffect } from 'react'
import {
  Users, Calendar, TrendingUp, BedDouble, Activity,
  AlertTriangle, MessageSquare, UserCheck, BarChart2,
  RefreshCw, Building2, Star
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import api from '../utils/api'
import { PageSpinner } from '../components/ui/index'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

function StatCard({ label, value, icon: Icon, colorClass, sub }: any) {
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

export default function AdvancedAnalyticsPage() {
  const [stats, setStats]       = useState<any>(null)
  const [trend, setTrend]       = useState<any[]>([])
  const [deptPerf, setDeptPerf] = useState<any[]>([])
  const [docPerf, setDocPerf]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [s, t, d, doc] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/revenue-trend?days=14'),
        api.get('/analytics/department-performance'),
        api.get('/analytics/doctor-performance'),
      ])
      setStats(s.data)
      setTrend(t.data)
      setDeptPerf(d.data)
      setDocPerf(doc.data)
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return <PageSpinner />

  const bedOccupancyData = stats ? [
    { name: 'Available', value: stats.available_beds },
    { name: 'Occupied',  value: stats.occupied_beds  },
    { name: 'Other',     value: Math.max(0, stats.total_beds - stats.available_beds - stats.occupied_beds) },
  ] : []

  const apptStatusData = stats ? [
    { name: 'Pending',   value: stats.pending_appointments   },
    { name: 'Completed', value: stats.completed_appointments },
  ] : []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Complete hospital performance overview</p>
        </div>
        <button onClick={() => fetchAll(true)} disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {stats && (
        <>
          {/* Top KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Patients"     value={stats.total_patients}       icon={Users}         colorClass="bg-blue-500" />
            <StatCard label="Total Doctors"      value={stats.total_doctors}        icon={UserCheck}     colorClass="bg-green-500"
              sub={`${stats.verified_doctors} verified`} />
            <StatCard label="Total Appointments" value={stats.total_appointments}   icon={Calendar}      colorClass="bg-purple-500"
              sub={`${stats.appointments_today} today`} />
            <StatCard label="Total Revenue"      value={`₹${Number(stats.total_revenue).toLocaleString()}`} icon={TrendingUp} colorClass="bg-orange-500"
              sub={`₹${Number(stats.revenue_this_month).toLocaleString()} this month`} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Consultations"      value={stats.total_consultations}  icon={Activity}      colorClass="bg-teal-500" />
            <StatCard label="Current Admissions" value={stats.current_admissions}   icon={BedDouble}     colorClass="bg-indigo-500"
              sub={`${stats.total_admissions} total`} />
            <StatCard label="Avg Satisfaction"   value={`${stats.average_feedback_score} ★`} icon={MessageSquare} colorClass="bg-yellow-500"
              sub={`${stats.total_feedback} reviews`} />
            <StatCard label="Active Emergencies" value={stats.active_emergencies}   icon={AlertTriangle} colorClass="bg-red-500"
              sub={`${stats.total_emergencies} total`} />
          </div>

          {/* Beds + Appointment status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-5">
              <h2 className="font-display font-semibold text-gray-900 mb-1">Bed Occupancy</h2>
              <p className="text-xs text-gray-400 mb-4">{stats.total_beds} total beds</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={160}>
                  <PieChart>
                    <Pie data={bedOccupancyData} dataKey="value" cx="50%" cy="50%"
                      innerRadius={45} outerRadius={70}>
                      {bedOccupancyData.map((_: any, i: number) => (
                        <Cell key={i} fill={['#10b981','#ef4444','#f59e0b'][i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 text-sm">
                  {[
                    ['Available', stats.available_beds, 'bg-green-500'],
                    ['Occupied',  stats.occupied_beds,  'bg-red-500'],
                    ['Other',     Math.max(0, stats.total_beds - stats.available_beds - stats.occupied_beds), 'bg-yellow-500'],
                  ].map(([label, val, color]) => (
                    <div key={label as string} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                        {label}
                      </span>
                      <span className="font-bold text-gray-800">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="font-display font-semibold text-gray-900 mb-1">Appointment Overview</h2>
              <p className="text-xs text-gray-400 mb-4">{stats.appointments_this_week} this week</p>
              <div className="space-y-3">
                {[
                  ['Today',     stats.appointments_today,     'bg-blue-500',  stats.appointments_today],
                  ['Pending',   stats.pending_appointments,   'bg-yellow-500',stats.pending_appointments],
                  ['Completed', stats.completed_appointments, 'bg-green-500', stats.completed_appointments],
                  ['This Week', stats.appointments_this_week, 'bg-purple-500',stats.appointments_this_week],
                ].map(([label, val, color, pct]) => (
                  <div key={label as string}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-bold text-gray-900">{val}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`}
                        style={{ width: `${stats.total_appointments > 0 ? Math.min(100, ((pct as number) / stats.total_appointments) * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue trend */}
          {trend.length > 0 && (
            <div className="card p-5">
              <h2 className="font-display font-semibold text-gray-900 mb-4">Revenue & Appointments — Last 14 Days</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v: any, name: string) =>
                      name === 'revenue' ? [`₹${v}`, 'Revenue'] : [v, 'Appointments']
                    }
                  />
                  <Legend />
                  <Line yAxisId="left"  type="monotone" dataKey="revenue"      stroke="#3b82f6" strokeWidth={2} dot={false} name="Revenue (₹)" />
                  <Line yAxisId="right" type="monotone" dataKey="appointments" stroke="#10b981" strokeWidth={2} dot={false} name="Appointments" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Department performance */}
          {deptPerf.length > 0 && (
            <div className="card p-5">
              <h2 className="font-display font-semibold text-gray-900 mb-4">Department Performance</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptPerf.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="department" type="category" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="total_appointments" fill="#3b82f6" radius={[0,4,4,0]} name="Appointments" />
                  <Bar dataKey="doctor_count"       fill="#10b981" radius={[0,4,4,0]} name="Doctors" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Doctor performance table */}
          {docPerf.length > 0 && (
            <div className="card p-5">
              <h2 className="font-display font-semibold text-gray-900 mb-4">Top Doctor Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">Doctor</th>
                      <th className="px-4 py-2.5">Specialization</th>
                      <th className="px-4 py-2.5">Appointments</th>
                      <th className="px-4 py-2.5">Completed</th>
                      <th className="px-4 py-2.5">Rating</th>
                      <th className="px-4 py-2.5">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {docPerf.slice(0, 10).map((d: any, i: number) => (
                      <tr key={d.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-gray-400 font-medium">#{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs shrink-0">
                              {d.name?.[0]}
                            </div>
                            <span className="font-medium text-gray-900">{d.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{d.specialization}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">{d.total_appointments}</td>
                        <td className="px-4 py-2.5 text-green-600 font-medium">{d.completed_appointments}</td>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-1 text-yellow-600">
                            <Star size={12} className="fill-yellow-400 text-yellow-400" />
                            {d.rating?.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-blue-600">
                          ₹{Number(d.revenue).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
