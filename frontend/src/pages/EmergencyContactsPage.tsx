import { useState, useEffect } from 'react'
import { AlertCircle, Plus, Trash2, X, Star } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function EmergencyContactsPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', relationship: '', phone: '', email: '', is_primary: false })
  const [submitting, setSubmitting] = useState(false)

  const fetchContacts = async () => {
    setLoading(true)
    try { const { data } = await api.get('/emergency-contacts'); setContacts(data) } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchContacts() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/emergency-contacts', form)
      toast.success('Contact added')
      setShowForm(false)
      setForm({ name: '', relationship: '', phone: '', email: '', is_primary: false })
      fetchContacts()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
    setSubmitting(false)
  }

  const deleteContact = async (id: number) => {
    if (!confirm('Remove this contact?')) return
    try { await api.delete(`/emergency-contacts/${id}`); toast.success('Removed'); fetchContacts() }
    catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Emergency Contacts</h1>
          <p className="text-gray-500 text-sm mt-1">People to contact in case of emergency</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Contact</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-display font-bold">Add Emergency Contact</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Name *</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Relationship *</label>
                  <input className="input" placeholder="e.g. Spouse, Parent" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="label">Phone *</label>
                <input className="input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_primary} onChange={e => setForm({ ...form, is_primary: e.target.checked })} />
                Set as primary contact
              </label>
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Adding...' : 'Add Contact'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="text-center text-gray-400 py-10">Loading...</div>
        : contacts.length === 0 ? (
          <div className="card p-12 text-center">
            <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No emergency contacts added</p>
            <p className="text-sm text-gray-400 mt-1">Add contacts who can be reached in an emergency</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map(c => (
              <div key={c.id} className={`card p-4 ${c.is_primary ? 'border-l-4 border-l-red-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">{c.name?.[0]}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{c.name}</span>
                        {c.is_primary && <span className="badge-red flex items-center gap-0.5"><Star size={10} fill="currentColor" /> Primary</span>}
                      </div>
                      <div className="text-sm text-gray-500">{c.relationship}</div>
                      <div className="text-sm text-blue-600 mt-0.5">📞 {c.phone}</div>
                      {c.email && <div className="text-xs text-gray-400">✉️ {c.email}</div>}
                    </div>
                  </div>
                  <button onClick={() => deleteContact(c.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
