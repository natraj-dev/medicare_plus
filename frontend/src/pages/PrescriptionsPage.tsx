// PrescriptionsPage.tsx
import { useState, useEffect } from 'react'
import { Pill, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'

export function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    api.get('/prescriptions').then(r => setPrescriptions(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const parseMeds = (meds: string) => {
    try { return JSON.parse(meds) } catch { return [] }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Prescriptions</h1>
        <p className="text-gray-500 text-sm mt-1">View your prescription history</p>
      </div>
      {loading ? <div className="text-center text-gray-400 py-10">Loading...</div>
        : prescriptions.length === 0 ? (
          <div className="card p-12 text-center">
            <Pill size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No prescriptions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prescriptions.map(p => (
              <div key={p.id} className="card overflow-hidden">
                <button className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                  <div>
                    <div className="font-medium text-gray-900">Prescription #{p.id}</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {format(new Date(p.created_at), 'MMM d, yyyy')}
                      {p.valid_until && ` • Valid until ${format(new Date(p.valid_until), 'MMM d, yyyy')}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={p.is_active ? 'badge-green' : 'badge-gray'}>{p.is_active ? 'Active' : 'Expired'}</span>
                    {expanded === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {expanded === p.id && (
                  <div className="px-4 pb-4 border-t border-gray-50">
                    <div className="mt-3 space-y-2">
                      {parseMeds(p.medications).map((m: any, i: number) => (
                        <div key={i} className="bg-blue-50 rounded-lg p-3">
                          <div className="font-medium text-blue-900">{m.name}</div>
                          <div className="text-sm text-blue-700 mt-0.5">{m.dosage} — {m.frequency} — {m.duration}</div>
                          {m.instructions && <div className="text-xs text-blue-600 mt-0.5">{m.instructions}</div>}
                        </div>
                      ))}
                    </div>
                    {p.instructions && (
                      <div className="mt-3 bg-yellow-50 rounded-lg p-3 text-sm text-yellow-800">
                        <strong>Instructions:</strong> {p.instructions}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

export default PrescriptionsPage
