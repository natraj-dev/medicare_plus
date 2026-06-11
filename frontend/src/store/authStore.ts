import { create } from 'zustand'
import api from '../utils/api'

interface User {
  id: number
  email: string
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN'
  is_active: boolean
  profile?: {
    id: number
    full_name: string
    avatar_url?: string
    specialization?: string
  }
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; full_name: string; role: string }) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      const me = await api.get('/auth/me')
      set({ user: me.data, isAuthenticated: true, isLoading: false })
    } catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  register: async (data) => {
    set({ isLoading: true })
    try {
      await api.post('/auth/register', data)
      set({ isLoading: false })
    } catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data, isAuthenticated: true })
    } catch {
      localStorage.clear()
      set({ user: null, isAuthenticated: false })
    }
  },
}))
