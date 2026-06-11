import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Star, Clock, DollarSign, Award, Phone, Calendar, ChevronLeft } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function DoctorDetailPage() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const [doctor, setDoctor] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', is_anonymous: false })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/doctors/${id}`),
      api.get(`/reviews/doctor/${id}`),
      api.get(`/schedules/doctor/${id}`),
    ]).then(([d, r, s]) => {
      setDoctor(d.data)
      setReviews(r.data)
      setSchedule(s.data)
    }).catch(() => toast.error('Failed to load doctor details'))
      .finally(() => setLoading(false))
  }, [id])

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/reviews', { ...reviewForm, doctor_id: Number(id) })
      toast.success('Review submitted!')
      const r = await api.get(`/reviews/doctor/${id}`)
      setReviews(r.data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit review')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>
  if (!doctor) return <div className="text-center py-20 text-gray-400">Doctor not found</div>

  const dayOrder = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Link to="/doctors" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft size={16} /> Back to Doctors
      </Link>

      {/* Profile Card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700 font-bold text-3xl shrink-0">
            {doctor.full_name?.[0]}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-display font-bold text-gray-900">{doctor.full_name}</h1>
                <p className="text-primary-600 font-medium">{doctor.specialization}</p>
              </div>
              {doctor.is_verified && <span className="badge-green">✓ Verified</span>}
            </div>
            <p className="text-sm text-gray-500 mt-1">{doctor.qualification}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              <span className="flex items-center gap-1"><Clock size={14} />{doctor.experience} years exp.</span>
              <span className="flex items-center gap-1"><Star size={14} className="text-yellow-400 fill-yellow-400" />{doctor.rating?.toFixed(1)} ({doctor.total_reviews} reviews)</span>
              <span className="flex items-center gap-1 text-green-600 font-semibold">₹{doctor.consultation_fee} / visit</span>
            </div>
            {doctor.bio && <p className="text-sm text-gray-600 mt-3">{doctor.bio}</p>}
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <Link to={`/appointments/book?doctor_id=${doctor.id}`} className="btn-primary flex items-center gap-2">
            <Calendar size={16} /> Book Appointment
          </Link>
        </div>
      </div>

      {/* Schedule */}
      {schedule.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-gray-900 mb-4">Weekly Schedule</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {schedule.sort((a, b) => dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week)).map((s: any) => (
              <div key={s.id} className="bg-blue-50 rounded-lg p-3">
                <div className="font-medium text-blue-800 text-sm">{s.day_of_week}</div>
                <div className="text-xs text-blue-600 mt-0.5">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.slot_duration} min slots</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-gray-900 mb-4">Patient Reviews ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No reviews yet</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r: any) => (
              <div key={r.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">{Array.from({length: 5}).map((_, i) => (
                    <Star key={i} size={14} className={i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                  ))}</div>
                  <span className="text-xs text-gray-400">{r.is_anonymous ? 'Anonymous' : `Patient #${r.patient_id}`}</span>
                </div>
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Submit review (patients only) */}
        {user?.role === 'PATIENT' && (
          <form onSubmit={submitReview} className="mt-5 pt-5 border-t border-gray-100 space-y-3">
            <h3 className="font-medium text-gray-800 text-sm">Write a Review</h3>
            <div>
              <label className="label">Rating</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setReviewForm({...reviewForm, rating: n})}>
                    <Star size={22} className={n <= reviewForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Comment (optional)</label>
              <textarea className="input" rows={3} placeholder="Share your experience..."
                value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={reviewForm.is_anonymous}
                onChange={e => setReviewForm({...reviewForm, is_anonymous: e.target.checked})} />
              Post anonymously
            </label>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
