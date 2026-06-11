import { Link } from 'react-router-dom'
import { Heart, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-3xl mb-6 shadow-xl">
          <Heart size={36} className="text-white" />
        </div>
        <div className="text-8xl font-display font-bold text-primary-600 mb-2">404</div>
        <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/dashboard" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
