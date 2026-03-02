import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Pencil, Check, X, ToggleLeft, ToggleRight, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [newName, setNewName]         = useState('')
  const [adding, setAdding]           = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [editName, setEditName]       = useState('')

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .order('sort_order')
      .order('name')
    setDepartments(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchDepartments() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return

    setAdding(true)
    const maxOrder = departments.reduce((m, d) => Math.max(m, d.sort_order || 0), 0)
    const { error } = await supabase
      .from('departments')
      .insert({ name, sort_order: maxOrder + 1 })

    setAdding(false)

    if (error) {
      toast.error(error.code === '23505' ? 'A department with that name already exists.' : 'Could not add department.')
    } else {
      setNewName('')
      toast.success(`"${name}" added.`)
      fetchDepartments()
    }
  }

  const handleToggleActive = async (dept) => {
    const { error } = await supabase
      .from('departments')
      .update({ is_active: !dept.is_active })
      .eq('id', dept.id)

    if (error) {
      toast.error('Could not update department.')
    } else {
      toast.success(`"${dept.name}" ${dept.is_active ? 'deactivated' : 'activated'}.`)
      fetchDepartments()
    }
  }

  const startEdit = (dept) => {
    setEditingId(dept.id)
    setEditName(dept.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleSaveEdit = async (dept) => {
    const name = editName.trim()
    if (!name) return

    const { error } = await supabase
      .from('departments')
      .update({ name })
      .eq('id', dept.id)

    if (error) {
      toast.error(error.code === '23505' ? 'That name is already taken.' : 'Could not rename department.')
    } else {
      toast.success('Department renamed.')
      cancelEdit()
      fetchDepartments()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-forest-900">Departments</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage the department list shown during onboarding and profile editing.
        </p>
      </div>

      {/* Add department */}
      <div className="card">
        <h2 className="font-display font-bold text-lg text-gray-800 mb-4">Add Department</h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. College of Engineering"
            className="input-field flex-1"
            required
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="btn-secondary flex items-center gap-2 shrink-0"
          >
            {adding
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Plus size={16} />
            }
            Add
          </button>
        </form>
      </div>

      {/* Department list */}
      <div className="card">
        <h2 className="font-display font-bold text-lg text-gray-800 mb-4">
          All Departments
          <span className="ml-2 text-sm font-normal text-gray-400">({departments.length})</span>
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Building2 size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No departments yet. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {departments.map(dept => (
              <div
                key={dept.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  dept.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                }`}
              >
                <Building2 size={16} className="text-gray-400 shrink-0" />

                {editingId === dept.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 border border-gold-400 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(dept); if (e.key === 'Escape') cancelEdit() }}
                  />
                ) : (
                  <span className={`flex-1 text-sm font-medium ${dept.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                    {dept.name}
                  </span>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  {editingId === dept.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(dept)}
                        className="p-1.5 text-forest-600 hover:bg-forest-100 rounded-lg transition-colors"
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(dept)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Rename"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(dept)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          dept.is_active
                            ? 'text-forest-500 hover:bg-forest-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={dept.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {dept.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Deactivated departments are hidden from new onboarding and profile forms but remain on existing profiles.
        </p>
      </div>
    </div>
  )
}
