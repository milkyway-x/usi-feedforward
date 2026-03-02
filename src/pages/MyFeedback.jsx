import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, getRatingLabel, FEEDBACK_QUESTIONS } from '../lib/supabase'
import { Star, Filter, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

export default function MyFeedback() {
  const { profile } = useAuth()
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 10

  useEffect(() => {
    if (profile) fetchFeedback()
  }, [profile, page])

  const fetchFeedback = async () => {
    setLoading(true)
    const { data, count, error } = await supabase
      .from('feedback')
      .select('id, average_rating, submitted_at, comments, q1_greet, q2_listen, q3_communicate, q4_follow_through, q5_dignity, q6_accuracy, q7_overall', { count: 'exact' })
      .eq('recipient_id', profile.id)
      .order('submitted_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    setFeedback(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-forest-900">My Ratings</h1>
          <p className="text-gray-500 mt-1 text-sm">{total} total feedback received</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : feedback.length === 0 ? (
        <div className="card text-center py-16">
          <Star size={48} className="mx-auto mb-4 text-gray-200" />
          <h3 className="font-display text-xl font-bold text-gray-400">No feedback yet</h3>
          <p className="text-gray-400 text-sm mt-2">Share your QR code to start collecting feedback.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map(f => {
            const info = getRatingLabel(f.average_rating)
            return (
              <div key={f.id} className="card hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  {/* Score badge */}
                  <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 ${info.bg}`}>
                    <span className={`text-xl font-display font-bold ${info.color}`}>
                      {parseFloat(f.average_rating).toFixed(1)}
                    </span>
                    <span className={`text-xs ${info.color} opacity-70`}>/4.0</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${info.bg} ${info.color}`}>
                        {info.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(f.submitted_at), 'MMMM d, yyyy · h:mm a')}
                      </span>
                    </div>

                    {f.comments && (
                      <p className="text-sm text-gray-600 italic mb-3">"{f.comments}"</p>
                    )}

                    {/* Per-question breakdown */}
                    <div className="grid grid-cols-7 gap-1">
                      {FEEDBACK_QUESTIONS.map((q, i) => {
                        const qKey = q.id
                        const qVal = f[qKey]
                        const qInfo = getRatingLabel(qVal)
                        return (
                          <div key={q.id} title={`Q${i+1}: ${q.label}`} className={`h-6 rounded flex items-center justify-center text-xs font-bold ${qInfo.bg} ${qInfo.color}`}>
                            {qVal}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Q1 – Q7 scores</p>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:border-gold-400 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:border-gold-400 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
