import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { Heart, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed')
    }
  }

  const demoLogin = async (role: string) => {
    const creds = {
      admin: { email: 'admin@medicare.com', password: 'admin123' },
      doctor: { email: 'arjun@medicare.com', password: 'doctor123' },
      patient: { email: 'patient@medicare.com', password: 'patient123' },
    }[role]!
    setEmail(creds.email)
    setPassword(creds.password)
    try {
      await login(creds.email, creds.password)
      toast.success('Logged in as demo ' + role)
      navigate('/dashboard')
    } catch (err: any) {
      toast.error('Demo login failed. Make sure backend is running and seeded.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-3 shadow-lg">
            <Heart size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">MediCare Plus</h1>
          <p className="text-gray-500 text-sm mt-1">Hospital & Appointment Management</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:underline font-medium">Register</Link>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-3">Quick Demo Access</p>
            <div className="grid grid-cols-3 gap-2">
              {['patient', 'doctor', 'admin'].map(role => (
                <button key={role} onClick={() => demoLogin(role)}
                  className="text-xs border border-gray-200 rounded-lg py-2 px-2 hover:bg-gray-50 capitalize font-medium text-gray-600 transition-colors">
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
