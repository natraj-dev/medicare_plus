import { useState, useEffect } from 'react'
import { User, Save, Key } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' })
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    const endpoint = user?.role === 'PATIENT' ? '/patients/me' : user?.role === 'DOCTOR' ? '/doctors/me' : null
    if (endpoint) {
      api.get(endpoint).then(r => setProfile(r.data)).catch(() => {}).finally(() => setLoading(false))
    } else { setLoading(false) }
  }, [user])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const endpoint = user?.role === 'PATIENT' ? '/patients/me' : '/doctors/me'
      await api.put(endpoint, profile)
      await fetchMe()
      toast.success('Profile updated!')
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSaving(false)
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingPw(true)
    try {
      await api.post('/auth/change-password', pwForm)
      toast.success('Password changed!')
      setPwForm({ current_password: '', new_password: '' })
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setChangingPw(false)
  }

  if (loading) return <div className="text-center text-gray-400 py-10">Loading...</div>

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account information</p>
      </div>

      {/* Account info */}
      <div className="card p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700 font-bold text-2xl">
            {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{profile?.full_name || 'User'}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${user?.role === 'ADMIN' ? 'bg-red-100 text-red-700' : user?.role === 'DOCTOR' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {user?.role}
            </span>
          </div>
        </div>

        {profile && (
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={profile.full_name || ''} onChange={e => setProfile({ ...profile, full_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={profile.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              {user?.role === 'PATIENT' && (
                <>
                  <div>
                    <label className="label">Age</label>
                    <input type="number" className="input" value={profile.age || ''} onChange={e => setProfile({ ...profile, age: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="label">Blood Group</label>
                    <select className="input" value={profile.blood_group || ''} onChange={e => setProfile({ ...profile, blood_group: e.target.value })}>
                      <option value="">—</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select className="input" value={profile.gender || ''} onChange={e => setProfile({ ...profile, gender: e.target.value })}>
                      <option value="">—</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Address</label>
                    <input className="input" value={profile.address || ''} onChange={e => setProfile({ ...profile, address: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Allergies</label>
                    <input className="input" placeholder="e.g. Penicillin, Peanuts" value={profile.allergies || ''} onChange={e => setProfile({ ...profile, allergies: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Chronic Conditions</label>
                    <input className="input" placeholder="e.g. Diabetes, Hypertension" value={profile.chronic_conditions || ''} onChange={e => setProfile({ ...profile, chronic_conditions: e.target.value })} />
                  </div>
                </>
              )}
              {user?.role === 'DOCTOR' && (
                <>
                  <div>
                    <label className="label">Specialization</label>
                    <input className="input" value={profile.specialization || ''} onChange={e => setProfile({ ...profile, specialization: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Experience (years)</label>
                    <input type="number" className="input" value={profile.experience || ''} onChange={e => setProfile({ ...profile, experience: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="label">Consultation Fee (₹)</label>
                    <input type="number" className="input" value={profile.consultation_fee || ''} onChange={e => setProfile({ ...profile, consultation_fee: Number(e.target.value) })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Bio</label>
                    <textarea className="input" rows={3} value={profile.bio || ''} onChange={e => setProfile({ ...profile, bio: e.target.value })} />
                  </div>
                </>
              )}
            </div>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Save size={15} />{saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>

      {/* Change password */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-gray-900 mb-4 flex items-center gap-2"><Key size={16} /> Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" value={pwForm.current_password} onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} required minLength={6} />
          </div>
          <button type="submit" disabled={changingPw} className="btn-primary">{changingPw ? 'Updating...' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  )
}
