import { useState, useEffect } from 'react'
import { supabase, getRatingLabel } from '../lib/supabase'
import { Users, Star, AlertTriangle, TrendingUp, Award, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'

const StatCard = ({ icon: Icon, label, value, color = 'gold', sub }) => {
  const colors = {
    gold: 'bg-gold-100 text-gold-600',
    forest: 'bg-forest-100 text-forest-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
  }
  return (
    <div className="card">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={22} />
        </div>
        <div>
          <p className="text-gray-500 text-sm">{label}</p>
          <p className="font-display font-bold text-3xl text-gray-900 mt-0.5">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const [{ data: allAnalytics }, { count: totalFeedback }, { count: totalUsers }, { count: flagged }] = await Promise.all([
      supabase.from('feedback_analytics').select('*').order('overall_avg_rating', { ascending: false }).limit(10),
      supabase.from('feedback').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
      supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('is_flagged', true),
    ])

    setAnalytics(allAnalytics || [])
    setStats({ totalFeedback, totalUsers, flagged })
    setLoading(false)
  }

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-forest-900">Admin Overview</h1>
        <p className="text-gray-500 mt-1 text-sm">Universidad de Sta. Isabel De Naga, Inc. — FeedForward Dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers} color="forest" />
        <StatCard icon={Star} label="Total Feedback" value={stats?.totalFeedback} color="gold" />
        <StatCard icon={AlertTriangle} label="Flagged" value={stats?.flagged} color="red" sub="Needs review" />
        <StatCard icon={Award} label="Top Performer" value={analytics[0]?.full_name?.split(' ')[0]} color="blue" sub={`Avg: ${parseFloat(analytics[0]?.overall_avg_rating || 0).toFixed(2)}`} />
      </div>

      {/* Top performers */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 size={20} className="text-gold-600" />
          <h2 className="font-display text-xl font-bold text-gray-900">Top 10 Performers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-3">Rank</th>
                <th className="pb-3">Name</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Feedback</th>
                <th className="pb-3">Average</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {analytics.map((a, i) => {
                const info = a.overall_avg_rating ? getRatingLabel(parseFloat(a.overall_avg_rating)) : null
                return (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 font-bold text-gray-400">#{i + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center text-gold-600 font-bold text-xs">
                          {a.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{a.full_name}</p>
                          <p className="text-gray-400 text-xs">{a.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-gray-500 text-xs">{a.department}</td>
                    <td className="py-3 font-semibold text-gray-700">{a.total_feedback_count}</td>
                    <td className="py-3 font-display font-bold text-xl text-forest-700">
                      {a.overall_avg_rating ? parseFloat(a.overall_avg_rating).toFixed(2) : '—'}
                    </td>
                    <td className="py-3">
                      {info && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${info.bg} ${info.color}`}>
                          {info.label}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
