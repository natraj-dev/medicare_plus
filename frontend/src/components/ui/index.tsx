import { Fragment, ReactNode } from 'react'
import { X, AlertTriangle, Loader2 } from 'lucide-react'

// ── Modal ──────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${widths[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h2 className="font-display font-bold text-gray-900 text-lg">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-primary-600" />
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size={32} />
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────────
interface EmptyProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}
export function EmptyState({ icon, title, description, action }: EmptyProps) {
  return (
    <div className="card p-12 text-center">
      <div className="flex justify-center mb-3 text-gray-300">{icon}</div>
      <p className="font-medium text-gray-700">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────
interface ConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }: ConfirmProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <AlertTriangle size={20} className={danger ? 'text-red-600' : 'text-yellow-600'} />
          </div>
          <h3 className="font-display font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className={danger ? 'btn-danger flex-1' : 'btn-primary flex-1'}>{confirmLabel}</button>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Status Badge ───────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, string> = {
  PENDING: 'badge-yellow', CONFIRMED: 'badge-blue', COMPLETED: 'badge-green',
  CANCELLED: 'badge-red', RESCHEDULED: 'badge-gray', NO_SHOW: 'badge-gray',
  PAID: 'badge-green', PARTIALLY_PAID: 'badge-blue',
  AVAILABLE: 'badge-green', BUSY: 'badge-yellow', ON_LEAVE: 'badge-red', OFFLINE: 'badge-gray',
  REQUESTED: 'badge-yellow', SAMPLE_COLLECTED: 'badge-blue', IN_PROGRESS: 'badge-blue',
  ACTIVE: 'badge-green', EXPIRED: 'badge-red',
}
export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_MAP[status?.toUpperCase()] || 'badge-gray'
  return <span className={cls}>{status?.replace(/_/g, ' ')}</span>
}

// ── Info Row ───────────────────────────────────────────────────────────────────
export function InfoRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-500 sm:w-36 shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value || '—'}</span>
    </div>
  )
}

// ── Section Header ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Stats Card ─────────────────────────────────────────────────────────────────
export function StatsCard({ label, value, icon: Icon, colorClass, sub }: {
  label: string; value: ReactNode; icon: any; colorClass: string; sub?: string
}) {
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorClass}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="text-2xl font-display font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}
