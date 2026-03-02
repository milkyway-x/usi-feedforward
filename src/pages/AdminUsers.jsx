import { useState, useEffect } from 'react'
import { supabase, getRatingLabel } from '../lib/supabase'
import { Search, Filter, Download, UserCheck, UserX } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const ROLES = ['all', 'teaching', 'non_teaching', 'student']

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 15

  useEffect(() => { fetchUsers() }, [page, roleFilter])

  const fetchUsers = async () => {
    setLoading(true)
    let query = supabase
      .from('feedback_analytics')
      .select('*', { count: 'exact' })
      .neq('role', 'admin')

    if (roleFilter !== 'all') query = query.eq('role', roleFilter)

    const { data, count } = await query
      .order('overall_avg_rating', { ascending: false, nullsFirst: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    setUsers(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  const toggleActive = async (userId, currentStatus) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', userId)
    if (!error) {
      toast.success(currentStatus ? 'User deactivated' : 'User activated')
      fetchUsers()
    }
  }

  const filtered = search
    ? users.filter(u =>
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
        u.department?.toLowerCase().includes(search.toLowerCase())
      )
    : users

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-forest-900">Manage Users</h1>
          <p className="text-gray-500 mt-1 text-sm">{total} registered users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, ID, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(0) }} className="input-field w-auto">
          {ROLES.map(r => <option key={r} value={r}>{r === 'all' ? 'All Roles' : r.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                <th className="p-4">Employee</th>
                <th className="p-4">Role</th>
                <th className="p-4">Department</th>
                <th className="p-4">Feedback</th>
                <th className="p-4">Avg Rating</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => {
                const info = u.overall_avg_rating ? getRatingLabel(parseFloat(u.overall_avg_rating)) : null
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gold-100 rounded-full flex items-center justify-center text-gold-600 font-bold text-sm shrink-0">
                          {u.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{u.full_name}</p>
                          <p className="text-gray-400 text-xs">{u.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-medium text-gray-500 capitalize bg-gray-100 px-2 py-0.5 rounded-full">
                        {u.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-xs max-w-[150px] truncate">{u.department}</td>
                    <td className="p-4 font-semibold text-gray-700">{u.total_feedback_count || 0}</td>
                    <td className="p-4">
                      {info ? (
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-lg text-forest-700">
                            {parseFloat(u.overall_avg_rating).toFixed(2)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${info.bg} ${info.color}`}>{info.label}</span>
                        </div>
                      ) : <span className="text-gray-300">N/A</span>}
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-forest-600 bg-forest-100 px-2 py-0.5 rounded-full font-medium">Active</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">No users found.</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-40">
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  )
}
