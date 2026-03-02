import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { UserCircle, BadgeCheck, Mail, Hash, Building2, Briefcase, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Profile() {
  const { profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({ full_name: '', department: '', position: '' })
  const [departments, setDepartments] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        full_name:  profile.full_name  || '',
        department: profile.department || '',
        position:   profile.position   || '',
      })
    }
  }, [profile])

  useEffect(() => {
    supabase
      .from('departments')
      .select('name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data) setDepartments(data.map(d => d.name))
      })
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) return toast.error('Full name is required.')
    if (!form.department)       return toast.error('Please select your department.')

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:  form.full_name.trim(),
        department: form.department,
        position:   form.position.trim() || null,
      })
      .eq('id', profile.id)

    setSaving(false)

    if (error) {
      toast.error('Could not save changes. Please try again.')
    } else {
      refreshProfile()
      toast.success('Profile updated!')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-forest-900">My Profile</h1>
        <p className="text-gray-500 mt-1 text-sm">Update your display name, department, and position.</p>
      </div>

      {/* Avatar + identity */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 bg-gold-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shrink-0">
          {profile?.full_name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-xl text-forest-900 truncate">{profile?.full_name}</p>
          <p className="text-gray-400 text-sm capitalize">{profile?.role?.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Read-only fields */}
      <div className="card space-y-4">
        <h2 className="font-display font-bold text-lg text-gray-800 mb-2">Account Info</h2>

        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
          <Mail size={16} className="text-gray-400 shrink-0" />
          <div>
            <p className="text-xs text-gray-400 font-medium">Email</p>
            <p className="text-sm text-gray-700 font-semibold">{profile?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
          <Hash size={16} className="text-gray-400 shrink-0" />
          <div>
            <p className="text-xs text-gray-400 font-medium">Employee / Staff ID</p>
            <p className="text-sm text-gray-700 font-semibold font-mono">{profile?.employee_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
          <ShieldCheck size={16} className="text-gray-400 shrink-0" />
          <div>
            <p className="text-xs text-gray-400 font-medium">Role</p>
            <p className="text-sm text-gray-700 font-semibold capitalize">{profile?.role?.replace('_', ' ')}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          ID number and role cannot be changed. Contact your administrator if there is an error.
        </p>
      </div>

      {/* Editable fields */}
      <form onSubmit={handleSubmit} className="card space-y-5">
        <h2 className="font-display font-bold text-lg text-gray-800">Edit Details</h2>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <UserCircle size={14} className="inline mr-1.5 text-gray-400" />
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            className="input-field"
            placeholder="Juan dela Cruz"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <Building2 size={14} className="inline mr-1.5 text-gray-400" />
            Department / Office <span className="text-red-400">*</span>
          </label>
          <select
            value={form.department}
            onChange={e => set('department', e.target.value)}
            className="input-field"
            required
          >
            <option value="">Select your department...</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <Briefcase size={14} className="inline mr-1.5 text-gray-400" />
            Position / Title
          </label>
          <input
            type="text"
            value={form.position}
            onChange={e => set('position', e.target.value)}
            className="input-field"
            placeholder="e.g. Administrative Assistant II, Professor"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <BadgeCheck size={16} />
              Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  )
}
