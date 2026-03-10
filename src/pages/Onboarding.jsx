import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  UserCircle, BadgeCheck, ChevronRight,
  Briefcase, BookOpen, Info
} from 'lucide-react'
import toast from 'react-hot-toast'

const RoleCard = ({ value, current, onChange, icon: Icon, title, description }) => {
  const selected = current === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`
        w-full text-left p-4 rounded-2xl border-2 transition-all duration-150
        ${selected
          ? 'border-gold-500 bg-gold-50 shadow-md shadow-gold-100'
          : 'border-gray-100 hover:border-gold-300 hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? 'bg-gold-500' : 'bg-gray-100'} transition-colors`}>
          <Icon size={18} className={selected ? 'text-white' : 'text-gray-400'} />
          {/* <img src="/usi-logo.png" alt="USI" className="w-full h-full object-cover" /> */}
        </div>
        <div className="flex-1">
          <p className={`font-semibold text-sm ${selected ? 'text-gold-700' : 'text-gray-700'}`}>{title}</p>
          <p className="text-gray-400 text-xs mt-0.5">{description}</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'border-gold-500 bg-gold-500' : 'border-gray-200'}`}>
          {selected && <div className="w-2 h-2 bg-white rounded-full" />}
        </div>
      </div>
    </button>
  )
}

export default function Onboarding() {
  const { user, completeOnboarding, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = new URLSearchParams(location.search).get('returnTo') || '/dashboard'

  const [step, setStep] = useState(1) // 1 = role, 2 = details
  const [form, setForm] = useState({
    role: '',
    employee_id: '',
    department: '',
    position: '',
    // full_name pre-filled from Google but user can correct it
    full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
  })
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState([])

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

  const handleRoleNext = () => {
    if (!form.role) return toast.error('Please select your role to continue.')
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.employee_id.trim()) return toast.error('Employee/Staff ID is required.')
    if (!form.full_name.trim())   return toast.error('Full name is required.')
    if (!form.department)         return toast.error('Please select your department.')

    setLoading(true)

    // Check if this employee_id is already taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('employee_id', form.employee_id.trim())
      .maybeSingle()

    if (existing) {
      toast.error('This ID number is already registered. Contact your admin if this is a mistake.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id:          user.id,
        email:       user.email,
        full_name:   form.full_name.trim(),
        employee_id: form.employee_id.trim(),
        role:        form.role,
        department:  form.department,
        position:    form.position.trim() || null,
      })
      .select()
      .single()

    setLoading(false)

    if (error) {
      toast.error('Could not save your profile. Please try again.')
      console.error(error)
      return
    }

    completeOnboarding(data)
    toast.success('Profile complete! Welcome to USI FeedForward.')
    navigate(returnTo, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-gold-900/30">
            <img src="/usi-logo.png" alt="USI" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white">One Last Step</h1>
          <p className="text-forest-300 mt-2 text-sm">
            Complete your profile to start using USI FeedForward
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-gold-500 text-white' : 'bg-white/10 text-forest-400'}`}>
                {step > s ? <BadgeCheck size={16} /> : s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 rounded-full transition-all ${step > s ? 'bg-gold-500' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-gold-400 via-gold-500 to-forest-500" />

          <div className="p-8">
            {/* Google account info */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 mb-6">
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Google profile"
                  className="w-9 h-9 rounded-full"
                />
              ) : (
                <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                  <UserCircle size={20} className="text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.user_metadata?.name || user?.email}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <span className="text-xs text-forest-600 font-semibold bg-forest-100 px-2 py-0.5 rounded-full shrink-0">Google</span>
            </div>
            <button
              type="button"
              onClick={async () => { await signOut(); navigate('/login', { replace: true }) }}
              className="text-xs text-gray-400 hover:text-red-500 underline underline-offset-2 transition-colors mt-2"
            >
              Use a different account
            </button>

            {/* ── Step 1: Role ── */}
            {step === 1 && (
              <div className="space-y-4 animate-slide-up">
                <div>
                  <h2 className="font-display font-bold text-xl text-forest-900 mb-1">What is your role?</h2>
                  <p className="text-gray-400 text-sm">This determines what you can do in the system.</p>
                </div>

                <div className="space-y-3 mt-4">
                  <RoleCard
                    value="non_teaching"
                    current={form.role}
                    onChange={v => set('role', v)}
                    icon={Briefcase}
                    title="Non-Teaching Staff"
                    description="Administrative, support, and service staff"
                  />
                  <RoleCard
                    value="teaching"
                    current={form.role}
                    onChange={v => set('role', v)}
                    icon={BookOpen}
                    title="Teaching Staff / Faculty"
                    description="Instructors, professors, and academic staff"
                  />
                </div>

                <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3 mt-2">
                  <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-blue-600 text-xs">
                    Both roles can give and receive feedback. The distinction is used for analytics and reporting only.
                  </p>
                </div>

                <button onClick={handleRoleNext} className="btn-secondary w-full flex items-center justify-center gap-2 mt-4">
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* ── Step 2: Details ── */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
                <div>
                  <h2 className="font-display font-bold text-xl text-forest-900 mb-1">Your Details</h2>
                  <p className="text-gray-400 text-sm">Used to generate your unique QR code and for identification.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
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
                  <p className="text-xs text-gray-400 mt-1">Pre-filled from your Google account. Correct if needed.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Employee / Staff ID Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.employee_id}
                    onChange={e => set('employee_id', e.target.value)}
                    className="input-field font-mono"
                    placeholder="e.g. 2019-00123"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">This becomes your unique QR code identifier. Must match your official school ID.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Position / Title</label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={e => set('position', e.target.value)}
                    className="input-field"
                    placeholder="e.g. Administrative Assistant II, Professor"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 border-2 border-gray-200 text-gray-500 hover:border-gray-300 font-semibold py-3 rounded-xl transition-all text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-2 btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <BadgeCheck size={16} />
                        Complete Setup
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
