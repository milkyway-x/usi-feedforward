import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AlertTriangle, Eye, Flag } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminSuspicious() {
  const [patterns, setPatterns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchPatterns() }, [])

  const fetchPatterns = async () => {
    const { data } = await supabase
      .from('suspicious_patterns')
      .select('*')
      .order('feedback_count', { ascending: false })
    setPatterns(data || [])
    setLoading(false)
  }

  const flagAll = async (giverEmployeeId, recipientEmployeeId) => {
    // Get giver and recipient IDs
    const { data: giver } = await supabase.from('profiles').select('id').eq('employee_id', giverEmployeeId).single()
    const { data: recipient } = await supabase.from('profiles').select('id').eq('employee_id', recipientEmployeeId).single()

    if (!giver || !recipient) return toast.error('Could not find users.')

    const { error } = await supabase
      .from('feedback')
      .update({ is_flagged: true, flag_reason: 'Suspicious pattern - repeated rater detected' })
      .eq('giver_id', giver.id)
      .eq('recipient_id', recipient.id)

    if (!error) toast.success('All matching feedback flagged for review.')
    else toast.error('Failed to flag.')
  }

  const getSeverityColor = (count) => {
    if (count >= 10) return { bg: 'bg-red-100', text: 'text-red-700', label: 'High Risk' }
    if (count >= 5) return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Medium Risk' }
    return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Watch' }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-forest-900">Suspicious Activity</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Pairs where the same person has rated another 3+ times — potential fraud indicators.
        </p>
      </div>

      {/* Explanation */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 space-y-1">
          <p className="font-semibold">How suspicious activity is detected</p>
          <p>This view flags any pair where Person A has rated Person B three or more times. While occasional repeat feedback can be legitimate (e.g., frequent service interactions), high volumes from the same rater may indicate collusion or gaming.</p>
          <p>Admins should investigate these cases and, if fraudulent, request justification from the involved parties or flag the submissions.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : patterns.length === 0 ? (
        <div className="card text-center py-16">
          <AlertTriangle size={48} className="mx-auto mb-4 text-gray-200" />
          <h3 className="font-display text-xl font-bold text-gray-400">No suspicious patterns detected</h3>
          <p className="text-gray-400 text-sm mt-2">All feedback appears to come from varied sources.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {patterns.map((p, i) => {
            const sev = getSeverityColor(p.feedback_count)
            return (
              <div key={i} className={`card border-l-4 ${p.feedback_count >= 10 ? 'border-l-red-400' : p.feedback_count >= 5 ? 'border-l-orange-400' : 'border-l-yellow-400'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sev.bg} ${sev.text}`}>
                        {sev.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {p.feedback_count} submissions from same person
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-xs text-blue-500 font-semibold uppercase mb-1">Feedback Giver</p>
                        <p className="font-bold text-gray-800">{p.giver_name}</p>
                        <p className="text-gray-500 text-xs">ID: {p.giver_employee_id}</p>
                      </div>
                      <div className="bg-gold-50 rounded-xl p-4">
                        <p className="text-xs text-gold-600 font-semibold uppercase mb-1">Feedback Recipient</p>
                        <p className="font-bold text-gray-800">{p.recipient_name}</p>
                        <p className="text-gray-500 text-xs">ID: {p.recipient_employee_id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>Avg rating given: <strong>{p.avg_given_rating}</strong></span>
                      <span>First: {new Date(p.first_feedback).toLocaleDateString()}</span>
                      <span>Last: {new Date(p.last_feedback).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => flagAll(p.giver_employee_id, p.recipient_employee_id)}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 px-3 py-2 rounded-xl transition-colors"
                    >
                      <Flag size={14} /> Flag All
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
