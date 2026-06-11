import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import toast from 'react-hot-toast'

const PAY_STATUS_COLORS: Record<string, string> = {
  PAID: 'badge-green', PENDING: 'badge-yellow', PARTIALLY_PAID: 'badge-blue',
  CANCELLED: 'badge-red', REFUNDED: 'badge-gray',
}

export default function BillingPage() {
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBills = async () => {
    setLoading(true)
    try { const { data } = await api.get('/billing'); setBills(data) } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchBills() }, [])

  const payBill = async (billId: number) => {
    try {
      await api.put(`/billing/${billId}`, { payment_status: 'PAID', payment_method: 'ONLINE', paid_amount: bills.find(b => b.id === billId)?.total_amount })
      toast.success('Payment successful!')
      fetchBills()
    } catch { toast.error('Payment failed') }
  }

  const totalDue = bills.filter(b => b.payment_status === 'PENDING').reduce((s, b) => s + b.total_amount, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Billing & Payments</h1>
        <p className="text-gray-500 text-sm mt-1">View and manage your invoices</p>
      </div>

      {/* Summary */}
      {bills.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Billed', value: `₹${bills.reduce((s, b) => s + b.total_amount, 0).toFixed(2)}`, color: 'text-gray-900', bg: 'bg-gray-50' },
            { label: 'Total Paid', value: `₹${bills.reduce((s, b) => s + b.paid_amount, 0).toFixed(2)}`, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Amount Due', value: `₹${totalDue.toFixed(2)}`, color: 'text-red-700', bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`card p-4 ${s.bg}`}>
              <div className="text-sm text-gray-500">{s.label}</div>
              <div className={`text-2xl font-display font-bold mt-1 ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? <div className="text-center text-gray-400 py-10">Loading...</div>
        : bills.length === 0 ? (
          <div className="card p-12 text-center">
            <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No billing records found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bills.map(b => (
              <div key={b.id} className="card p-5">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="font-mono text-sm font-medium text-gray-700">{b.invoice_number}</span>
                      <span className={PAY_STATUS_COLORS[b.payment_status] || 'badge-gray'}>{b.payment_status.replace('_', ' ')}</span>
                    </div>
                    <div className="text-xs text-gray-400">{format(new Date(b.created_at), 'MMM d, yyyy')}</div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      {b.consultation_fee > 0 && <div><span className="text-gray-500">Consultation</span><div className="font-medium">₹{b.consultation_fee}</div></div>}
                      {b.lab_fee > 0 && <div><span className="text-gray-500">Lab</span><div className="font-medium">₹{b.lab_fee}</div></div>}
                      {b.medication_fee > 0 && <div><span className="text-gray-500">Medication</span><div className="font-medium">₹{b.medication_fee}</div></div>}
                      {b.discount > 0 && <div><span className="text-gray-500">Discount</span><div className="font-medium text-green-600">-₹{b.discount}</div></div>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right flex flex-col items-end gap-2">
                    <div className="text-2xl font-display font-bold text-gray-900">₹{b.total_amount.toFixed(2)}</div>
                    {b.payment_status === 'PENDING' && (
                      <button onClick={() => payBill(b.id)} className="btn-primary flex items-center gap-1 text-sm py-1.5 px-4">
                        <CheckCircle size={14} /> Pay Now
                      </button>
                    )}
                    {b.payment_date && <div className="text-xs text-gray-400">Paid {format(new Date(b.payment_date), 'MMM d')}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
