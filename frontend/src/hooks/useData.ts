import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

// Generic fetch hook
export function useFetch<T>(url: string | null, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!url) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await api.get(url)
      setData(res.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [url, ...deps])

  useEffect(() => { refetch() }, [refetch])
  return { data, loading, error, refetch }
}

// Mutation hook
export function useMutation<T = any>(method: 'post' | 'put' | 'delete' = 'post') {
  const [loading, setLoading] = useState(false)

  const mutate = async (url: string, data?: any): Promise<T | null> => {
    setLoading(true)
    try {
      const res = await (method === 'delete' ? api.delete(url) : api[method](url, data))
      return res.data
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Operation failed'
      toast.error(msg)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading }
}

// Doctors list hook
export function useDoctors(params?: Record<string, any>) {
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/doctors', { params: { limit: 100, ...params } })
      .then(r => setDoctors(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [JSON.stringify(params)])

  return { doctors, loading }
}

// Patients list hook (admin/doctor)
export function usePatients() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/patients?limit=200')
      .then(r => setPatients(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { patients, loading }
}

// Notification count
export function useUnreadCount() {
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    api.get('/notifications/unread-count')
      .then(r => setCount(r.data.unread_count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [])

  return { count, refresh }
}
