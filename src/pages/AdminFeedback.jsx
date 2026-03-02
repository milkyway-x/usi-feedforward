import { useState, useEffect } from 'react'
import { supabase, getRatingLabel } from '../lib/supabase'
import { Flag, Search } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const PAGE_SIZE = 15

  useEffect(() => { fetchFeedback() }, [page])

  const fetchFeedback = async () => {
    setLoading(true)
    const { data, count } = await supabase
      .from('feedback')
      .select(`
        id, average_rating, submitted_at, comments, is_flagged, flag_reason,
        recipient:profiles!feedback_recipient_id_fkey(full_name, employee_id, department),
        giver:profiles!feedback_giver_id_fkey(full_name, employee_id)
      `, { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    setFeedback(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  const toggleFlag = async (id, currentFlagged) => {
    const reason = !currentFlagged ? prompt('Reason for flagging (optional):') : null
    const { error } = await supabase.from('feedback').update({
      is_flagged: !currentFlagged,
      flag_reason: reason || null,
    }).eq('id', id)
    if (!error) {
      toast.success(currentFlagged ? 'Flag removed' : 'Feedback flagged')
      fetchFeedback()
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const filtered = search
    ? feedback.filter(f =>
        f.recipient?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        f.giver?.full_name?.toLowerCase().includes(search.toLowerCase())
      )
    : feedback

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-forest-900">All Feedback</h1>
        <p className="text-gray-500 mt-1 text-sm">{total} total submissions — full visibility as admin</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search by name..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="input-field pl-9" />
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
                <th className="p-4">Recipient</th>
                <th className="p-4">Rated By</th>
                <th className="p-4">Score</th>
                <th className="p-4">Comments</th>
                <th className="p-4">Date</th>
                <th className="p-4">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(f => {
                const info = getRatingLabel(f.average_rating)
                return (
                  <tr key={f.id} className={`hover:bg-gray-50 ${f.is_flagged ? 'bg-red-50' : ''}`}>
                    <td className="p-4">
                      <p className="font-semibold text-gray-800">{f.recipient?.full_name}</p>
                      <p className="text-gray-400 text-xs">{f.recipient?.department}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-700">{f.giver?.full_name}</p>
                      <p className="text-gray-400 text-xs">{f.giver?.employee_id}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-lg text-forest-700">
                          {parseFloat(f.average_rating).toFixed(2)}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${info.bg} ${info.color}`}>{info.label}</span>
                      </div>
                    </td>
                    <td className="p-4 max-w-[200px]">
                      <p className="text-xs text-gray-500 truncate italic">{f.comments || '—'}</p>
                      {f.is_flagged && f.flag_reason && (
                        <p className="text-xs text-red-500 font-medium mt-0.5">⚑ {f.flag_reason}</p>
                      )}
                    </td>
                    <td className="p-4 text-gray-400 text-xs whitespace-nowrap">
                      {format(new Date(f.submitted_at), 'MMM d, yyyy')}
                      <br />{format(new Date(f.submitted_at), 'h:mm a')}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleFlag(f.id, f.is_flagged)}
                        className={`p-2 rounded-xl transition-colors ${f.is_flagged ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}`}
                        title={f.is_flagged ? 'Remove flag' : 'Flag as suspicious'}
                      >
                        <Flag size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No feedback found.</div>}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40">Previous</button>
          <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
