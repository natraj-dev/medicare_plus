import { useState } from 'react'
import {
  Download, CreditCard, BarChart2, Activity,
  TestTube, Stethoscope, Calendar
} from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { PageSpinner } from '../components/ui/index'

function ReportTable({ headers, rows }: { headers: string[]; rows: any[][] }) {
  if (!rows?.length) return <p className="text-sm text-gray-400 text-center py-6">No records found.</p>
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map(h => (
              <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{cell ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ReportsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [filters, setFilters] = useState({ from_date: '', to_date: '', status: '' })
  const [reportData, setReportData] = useState<any>(null)
  const [activeReport, setActiveReport] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(false)

  const setLoad = (key: string, val: boolean) =>
    setLoading(prev => ({ ...prev, [key]: val }))

  const downloadPdf = async (url: string, filename: string, key: string, params?: Record<string, any>) => {
    setLoad(key, true)
    try {
      const res = await api.get(url, { params, responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
      toast.success('PDF downloaded!')
    } catch {
      toast.error('Download failed. Try again.')
    }
    setLoad(key, false)
  }

  const viewReport = async (url: string, key: string, params?: Record<string, any>) => {
    setDataLoading(true)
    setActiveReport(key)
    setReportData(null)
    try {
      const res = await api.get(url, { params })
      setReportData(res.data)
    } catch {
      toast.error('Failed to load report data')
      setActiveReport(null)
    }
    setDataLoading(false)
  }

  const apptParams = {
    from_date: filters.from_date || undefined,
    to_date:   filters.to_date   || undefined,
    status:    filters.status    || undefined,
  }

  const reports = [
    {
      key: 'appointments',
      title: 'Appointment Report',
      description: 'All appointments with status breakdown and analytics',
      icon: Calendar,
      color: 'bg-blue-500',
      roles: ['PATIENT', 'DOCTOR', 'ADMIN'],
      onView: () => viewReport('/reports/appointments', 'appointments', apptParams),
      onPdf: () => downloadPdf('/reports/appointments/pdf', `appointments_${Date.now()}.pdf`, 'appointments_pdf', apptParams),
    },
    {
      key: 'medical_summary',
      title: 'Medical Summary',
      description: 'Complete personal health record summary as PDF',
      icon: Stethoscope,
      color: 'bg-green-500',
      roles: ['PATIENT'],
      onPdf: () => downloadPdf('/reports/medical-summary/pdf', `medical_summary_${Date.now()}.pdf`, 'medical_pdf'),
    },
    {
      key: 'billing',
      title: 'Billing Report',
      description: 'Invoices, payment history and outstanding amounts',
      icon: CreditCard,
      color: 'bg-yellow-500',
      roles: ['PATIENT', 'ADMIN'],
      onView: () => viewReport('/reports/billing', 'billing'),
    },
    {
      key: 'lab_tests',
      title: 'Lab Tests Report',
      description: 'All laboratory test requests and results',
      icon: TestTube,
      color: 'bg-purple-500',
      roles: ['PATIENT', 'DOCTOR', 'ADMIN'],
      onView: () => viewReport('/reports/lab-tests', 'lab_tests'),
    },
    {
      key: 'doctors',
      title: 'Doctor Performance',
      description: 'Per-doctor appointment counts, ratings and revenue',
      icon: BarChart2,
      color: 'bg-red-500',
      roles: ['ADMIN'],
      onView: () => viewReport('/reports/doctors', 'doctors'),
    },
  ].filter(r => r.roles.includes(user?.role || ''))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Reports & Downloads</h1>
        <p className="text-gray-500 text-sm mt-1">Generate detailed reports and export as PDF</p>
      </div>

      {/* Date filters */}
      <div className="card p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Date Range Filter (for appointment reports)</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-xs">From</label>
            <input type="date" className="input text-sm"
              value={filters.from_date}
              onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))} />
          </div>
          <div>
            <label className="label text-xs">To</label>
            <input type="date" className="input text-sm"
              value={filters.to_date}
              onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))} />
          </div>
          <div>
            <label className="label text-xs">Status</label>
            <select className="input text-sm"
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">All Statuses</option>
              {['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setFilters({ from_date: '', to_date: '', status: '' })}
            className="btn-secondary text-sm py-2 px-4">
            Clear
          </button>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <div key={r.key} className="card p-5 flex flex-col">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${r.color}`}>
              <r.icon size={18} className="text-white" />
            </div>
            <h3 className="font-display font-semibold text-gray-900">{r.title}</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4 flex-1">{r.description}</p>
            <div className="flex gap-2">
              {r.onView && (
                <button
                  onClick={r.onView}
                  disabled={dataLoading && activeReport === r.key}
                  className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5">
                  <Activity size={14} />
                  {dataLoading && activeReport === r.key ? 'Loading...' : 'View'}
                </button>
              )}
              {r.onPdf && (
                <button
                  onClick={r.onPdf}
                  disabled={loading[r.key + '_pdf']}
                  className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5">
                  <Download size={14} />
                  {loading[r.key + '_pdf'] ? 'Downloading...' : 'PDF'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Report Data Panel */}
      {activeReport && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-gray-900">
              {reports.find(r => r.key === activeReport)?.title} — Data
            </h2>
            <button
              onClick={() => { setReportData(null); setActiveReport(null) }}
              className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors">
              ✕ Close
            </button>
          </div>

          {dataLoading ? (
            <PageSpinner />
          ) : reportData && (
            <>
              {activeReport === 'appointments' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-blue-700">{reportData.total}</div>
                      <div className="text-xs text-blue-500 mt-0.5">Total</div>
                    </div>
                    {Object.entries(reportData.by_status || {}).map(([k, v]) => (
                      <div key={k} className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-gray-700">{v as number}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{k}</div>
                      </div>
                    ))}
                  </div>
                  <ReportTable
                    headers={['ID', 'Date', 'Time', 'Patient', 'Doctor', 'Status', 'Type', 'Reason']}
                    rows={(reportData.records || []).slice(0, 30).map((a: any) => [
                      a.id, a.appointment_date, a.appointment_time,
                      `#${a.patient_id}`, `#${a.doctor_id}`,
                      a.status, a.type?.replace('_', ' '), a.reason || '—',
                    ])}
                  />
                </div>
              )}

              {activeReport === 'billing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      ['Total Billed',    `₹${Number(reportData.total_billed).toLocaleString()}`,    'bg-blue-50 text-blue-700'],
                      ['Total Collected', `₹${Number(reportData.total_collected).toLocaleString()}`, 'bg-green-50 text-green-700'],
                      ['Outstanding',     `₹${Number(reportData.outstanding).toLocaleString()}`,     'bg-red-50 text-red-700'],
                    ].map(([label, val, cls]) => (
                      <div key={label as string} className={`rounded-xl p-4 text-center ${cls}`}>
                        <div className="text-2xl font-bold">{val}</div>
                        <div className="text-xs mt-0.5 opacity-70">{label}</div>
                      </div>
                    ))}
                  </div>
                  <ReportTable
                    headers={['Invoice', 'Date', 'Total Amount', 'Paid', 'Status']}
                    rows={(reportData.records || []).slice(0, 30).map((b: any) => [
                      b.invoice_number, b.created_at,
                      `₹${b.total_amount}`, `₹${b.paid_amount}`,
                      b.payment_status,
                    ])}
                  />
                </div>
              )}

              {activeReport === 'lab_tests' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-purple-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-purple-700">{reportData.total}</div>
                      <div className="text-xs text-purple-500 mt-0.5">Total Tests</div>
                    </div>
                    {Object.entries(reportData.by_status || {}).map(([k, v]) => (
                      <div key={k} className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-gray-700">{v as number}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{k.replace('_', ' ')}</div>
                      </div>
                    ))}
                  </div>
                  <ReportTable
                    headers={['ID', 'Test Name', 'Type', 'Status', 'Requested', 'Completed']}
                    rows={(reportData.records || []).slice(0, 30).map((t: any) => [
                      t.id, t.test_name, t.test_type || '—',
                      t.status.replace('_', ' '),
                      t.requested_date, t.completed_date || '—',
                    ])}
                  />
                </div>
              )}

              {activeReport === 'doctors' && (
                <ReportTable
                  headers={['#', 'Name', 'Specialization', 'Appointments', 'Completed', 'Rating', 'Revenue', 'Verified']}
                  rows={(reportData.records || []).map((d: any, i: number) => [
                    i + 1, d.full_name, d.specialization,
                    d.total_appointments, d.completed_appointments,
                    `${d.rating} ★`, `₹${d.revenue_generated}`,
                    d.is_verified ? '✓' : '✗',
                  ])}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
