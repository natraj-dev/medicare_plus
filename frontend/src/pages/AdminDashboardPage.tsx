import { useState, useEffect } from 'react'
import { Users, Calendar, TrendingUp, Building2, Clock, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../utils/api'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <div className="text-2xl font-display font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [revenue, setRevenue] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setStats(r.data)).catch(() => {})
    api.get('/admin/analytics/appointments').then(r => setAnalytics(r.data)).catch(() => {})
    api.get('/admin/analytics/revenue').then(r => setRevenue(r.data)).catch(() => {})
    api.get('/admin/users?limit=10').then(r => setUsers(r.data)).catch(() => {})
  }, [])

  const statusChartData = analytics?.by_status ? Object.entries(analytics.by_status).map(([k, v]) => ({ name: k, value: v })) : []

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Hospital analytics and management overview</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Patients" value={stats.total_patients} icon={Users} color="bg-blue-500" />
          <StatCard label="Total Doctors" value={stats.total_doctors} icon={Users} color="bg-green-500" />
          <StatCard label="Today's Appointments" value={stats.appointments_today} icon={Calendar} color="bg-purple-500" sub={`${stats.pending_appointments} pending`} />
          <StatCard label="Total Revenue" value={`₹${(stats.total_revenue / 1000).toFixed(0)}K`} icon={TrendingUp} color="bg-orange-500" />
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <Clock size={20} className="text-yellow-500" />
            <div><div className="text-xl font-bold">{stats.pending_appointments}</div><div className="text-xs text-gray-500">Pending</div></div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-500" />
            <div><div className="text-xl font-bold">{stats.completed_appointments}</div><div className="text-xs text-gray-500">Completed</div></div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <Building2 size={20} className="text-blue-500" />
            <div><div className="text-xl font-bold">{stats.departments_count}</div><div className="text-xs text-gray-500">Departments</div></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments chart */}
        {analytics?.last_7_days && (
          <div className="card p-5">
            <h2 className="font-display font-semibold text-gray-900 mb-4">Appointments – Last 7 Days</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.last_7_days}>
                <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Status pie */}
        {statusChartData.length > 0 && (
          <div className="card p-5">
            <h2 className="font-display font-semibold text-gray-900 mb-4">Appointment Status Breakdown</h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={180}>
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {statusChartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusChartData.map((s: any, i: number) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      {s.name}
                    </span>
                    <span className="font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Revenue summary */}
      {revenue && (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-gray-900 mb-4">Revenue Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-sm text-blue-600">Total Billed</div>
              <div className="text-2xl font-bold text-blue-800 mt-1">₹{revenue.total_billed?.toLocaleString()}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-sm text-green-600">Collected</div>
              <div className="text-2xl font-bold text-green-800 mt-1">₹{revenue.total_collected?.toLocaleString()}</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4">
              <div className="text-sm text-yellow-600">Pending Bills</div>
              <div className="text-2xl font-bold text-yellow-800 mt-1">{revenue.pending_bills}</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent users */}
      {users.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-gray-900 mb-4">Recent Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b">
                <th className="pb-2">ID</th><th className="pb-2">Email</th><th className="pb-2">Role</th><th className="pb-2">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u: any) => (
                  <tr key={u.id}>
                    <td className="py-2 text-gray-400">#{u.id}</td>
                    <td className="py-2 text-gray-900">{u.email}</td>
                    <td className="py-2"><span className="badge-blue">{u.role}</span></td>
                    <td className="py-2"><span className={u.is_active ? 'badge-green' : 'badge-red'}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
