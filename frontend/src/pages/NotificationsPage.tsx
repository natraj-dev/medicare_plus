import { useState, useEffect } from 'react'
import { Bell, CheckCheck, Circle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import api from '../utils/api'
import toast from 'react-hot-toast'

const TYPE_ICONS: Record<string, string> = {
  APPOINTMENT_CONFIRMATION: '📅',
  APPOINTMENT_REMINDER: '⏰',
  PRESCRIPTION_UPDATE: '💊',
  TEST_RESULT: '🔬',
  PAYMENT_SUCCESS: '💳',
  GENERAL: '🔔',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    setLoading(true)
    try { const { data } = await api.get('/notifications'); setNotifications(data) } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchNotifications() }, [])

  const markRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('All notifications marked as read')
    } catch {}
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary flex items-center gap-2 text-sm">
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      {loading ? <div className="text-center text-gray-400 py-10">Loading...</div>
        : notifications.length === 0 ? (
          <div className="card p-12 text-center">
            <Bell size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={`card p-4 cursor-pointer transition-all ${n.is_read ? 'opacity-75' : 'border-l-4 border-l-primary-500 bg-blue-50/30'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{TYPE_ICONS[n.notification_type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-gray-900 text-sm">{n.title}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {!n.is_read && <Circle size={8} className="fill-primary-600 text-primary-600" />}
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
