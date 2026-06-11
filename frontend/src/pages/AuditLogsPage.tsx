import { useState, useEffect } from 'react'
import { ClipboardList, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    try { const { data } = await api.get('/audit-logs?limit=100'); setLogs(data) } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [])

  const actionColor: Record<string, string> = {
    LOGIN: 'badge-blue', REGISTER: 'badge-green', DELETE: 'badge-red',
    UPDATE: 'badge-yellow', CREATE: 'badge-green', VIEW: 'badge-gray',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 text-sm mt-1">System activity and security monitoring</p>
        </div>
        <button onClick={fetchLogs} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? <div className="text-center text-gray-400 py-10">Loading...</div>
        : logs.length === 0 ? (
          <div className="card p-12 text-center">
            <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No audit logs found</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs text-gray-500">
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {format(new Date(log.created_at), 'MMM d, HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-gray-700">#{log.user_id || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={actionColor[log.action] || 'badge-gray'}>{log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.resource_type}{log.resource_id ? ` #${log.resource_id}` : ''}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">{log.ip_address || '—'}</td>
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
