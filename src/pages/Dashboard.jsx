import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase, getRatingLabel, FEEDBACK_QUESTIONS } from '../lib/supabase'
import { Star, QrCode, Bell, TrendingUp, Award, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const RatingBar = ({ label, value }) => {
  const pct = (value / 4) * 100
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-gray-600">
        <span className="truncate max-w-[200px]">{label}</span>
        <span className="text-forest-700 font-bold ml-2">{value?.toFixed(2) ?? '—'}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentFeedback, setRecentFeedback] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) fetchData()
  }, [profile])

  const fetchData = async () => {
    // Get analytics for this user
    const { data: analytics } = await supabase
      .from('feedback_analytics')
      .select('*')
      .eq('id', profile.id)
      .single()

    setStats(analytics)

    // Get recent feedback (no giver name shown)
    const { data: recent } = await supabase
      .from('feedback')
      .select('id, average_rating, submitted_at, comments')
      .eq('recipient_id', profile.id)
      .order('submitted_at', { ascending: false })
      .limit(5)

    setRecentFeedback(recent || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
    </div>
  )

  const rating = stats?.overall_avg_rating
  const ratingInfo = rating ? getRatingLabel(parseFloat(rating)) : null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-forest-900">
          Good day, {profile?.full_name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">{profile?.department} · {profile?.position || profile?.role?.replace('_', ' ')}</p>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/my-qr" className="card bg-gradient-to-br from-forest-700 to-forest-900 text-white hover:shadow-xl transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <QrCode size={22} />
            </div>
            <div>
              <p className="font-semibold">My QR Code</p>
              <p className="text-forest-300 text-xs mt-0.5">Show for feedback scanning</p>
            </div>
            <ChevronRight size={16} className="ml-auto text-forest-400 group-hover:text-white" />
          </div>
        </Link>

        <Link to="/my-feedback" className="card hover:shadow-xl transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold-100 rounded-xl flex items-center justify-center group-hover:bg-gold-200 transition-colors">
              <Star size={22} className="text-gold-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">My Ratings</p>
              <p className="text-gray-400 text-xs mt-0.5">{stats?.total_feedback_count || 0} total feedback</p>
            </div>
            <ChevronRight size={16} className="ml-auto text-gray-300 group-hover:text-gray-600" />
          </div>
        </Link>

        <Link to="/notifications" className="card hover:shadow-xl transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-forest-100 rounded-xl flex items-center justify-center group-hover:bg-forest-200 transition-colors">
              <Bell size={22} className="text-forest-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Notifications</p>
              <p className="text-gray-400 text-xs mt-0.5">Stay updated</p>
            </div>
            <ChevronRight size={16} className="ml-auto text-gray-300 group-hover:text-gray-600" />
          </div>
        </Link>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall rating card */}
        <div className="card">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900">Overall Rating</h2>
              <p className="text-gray-400 text-sm mt-1">Based on {stats?.total_feedback_count || 0} evaluations</p>
            </div>
            <Award size={20} className="text-gold-500" />
          </div>

          {rating ? (
            <div className="text-center py-4">
              <div className="text-7xl font-display font-bold text-forest-800 mb-2">{parseFloat(rating).toFixed(2)}</div>
              <div className={`inline-flex px-4 py-1.5 rounded-full text-sm font-semibold ${ratingInfo?.bg} ${ratingInfo?.color}`}>
                {ratingInfo?.label}
              </div>
              <p className="text-gray-400 text-xs mt-3">Scale: 1.0 – 4.0</p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Star size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No feedback yet. Share your QR code to get started!</p>
            </div>
          )}
        </div>

        {/* Per-question breakdown */}
        <div className="card">
          <h2 className="font-display text-xl font-bold text-gray-900 mb-5">Category Breakdown</h2>
          {stats?.total_feedback_count > 0 ? (
            <div className="space-y-4">
              {FEEDBACK_QUESTIONS.map((q, i) => (
                <RatingBar
                  key={q.id}
                  label={`${i + 1}. ${q.label.substring(0, 50)}...`}
                  value={stats[`avg_q${i + 1}`]}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Your category scores will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent feedback */}
      {recentFeedback.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-bold text-gray-900">Recent Feedback</h2>
            <Link to="/my-feedback" className="text-gold-600 hover:text-gold-700 text-sm font-semibold">View all</Link>
          </div>
          <div className="space-y-3">
            {recentFeedback.map(f => {
              const info = getRatingLabel(f.average_rating)
              return (
                <div key={f.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${info.bg} ${info.color}`}>
                    {parseFloat(f.average_rating).toFixed(1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{f.comments || 'No comments provided.'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{format(new Date(f.submitted_at), 'MMM d, yyyy · h:mm a')}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${info.bg} ${info.color} shrink-0`}>
                    {info.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
