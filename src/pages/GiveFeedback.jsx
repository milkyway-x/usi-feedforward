import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase, sha256, FEEDBACK_QUESTIONS } from '../lib/supabase'
import {
  CheckCircle, AlertCircle, Loader, ArrowRight,
  GraduationCap, UserCheck, ChevronRight, ShieldCheck, Info
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Sub-components ───────────────────────────────────────────────────────────

const RatingQuestion = ({ index, question, value, onChange }) => (
  <div className="bg-gray-50 rounded-2xl p-5 hover:bg-gold-50/30 transition-colors">
    <p className="text-sm font-medium text-gray-700 mb-4">
      <span className="text-gold-600 font-bold">{index}.</span> {question}
    </p>
    <div className="flex items-center gap-2 justify-center">
      {[1, 2, 3, 4].map(n => (
        <div key={n} className="rating-option">
          <input
            type="radio"
            id={`q${index}_${n}`}
            name={`q${index}`}
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
          />
          <label htmlFor={`q${index}_${n}`}>{n}</label>
        </div>
      ))}
    </div>
    <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
      <span>Strongly Disagree</span>
      <span>Strongly Agree</span>
    </div>
  </div>
)

// ─── Step 1: Who are you? ─────────────────────────────────────────────────────
const GiverTypeSelector = ({ onSelect }) => (
  <div className="space-y-4">
    <div className="text-center mb-6">
      <p className="text-gold-300 text-xs font-semibold uppercase tracking-widest mb-2">
        Step 1 of 2
      </p>
      <h2 className="font-display text-2xl font-bold text-white">How are you submitting?</h2>
      <p className="text-forest-300 mt-2 text-sm">Select your role to continue</p>
    </div>

    <button
      onClick={() => onSelect('employee')}
      className="w-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-gold-400/60 rounded-2xl p-5 flex items-center gap-4 transition-all group text-left"
    >
      <div className="w-12 h-12 bg-gold-500/30 rounded-xl flex items-center justify-center group-hover:bg-gold-500/50 transition-colors shrink-0">
        <UserCheck size={22} className="text-gold-300" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-white">Employee / Faculty</p>
        <p className="text-forest-300 text-sm mt-0.5">Teaching or non-teaching staff with a system account</p>
      </div>
      <ChevronRight size={18} className="text-forest-400 group-hover:text-gold-300" />
    </button>

    <button
      onClick={() => onSelect('student')}
      className="w-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-gold-400/60 rounded-2xl p-5 flex items-center gap-4 transition-all group text-left"
    >
      <div className="w-12 h-12 bg-forest-500/30 rounded-xl flex items-center justify-center group-hover:bg-forest-500/50 transition-colors shrink-0">
        <GraduationCap size={22} className="text-forest-300" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-white">Student</p>
        <p className="text-forest-300 text-sm mt-0.5">No account needed — verify with your Student ID and full name</p>
      </div>
      <ChevronRight size={18} className="text-forest-400 group-hover:text-gold-300" />
    </button>

    <p className="text-center text-forest-400 text-xs pt-2">
      <ShieldCheck size={12} className="inline mr-1" />
      Your identity is kept confidential. Recipients cannot see who rated them.
    </p>
  </div>
)

// ─── Student verification form ────────────────────────────────────────────────
const StudentVerifyForm = ({ recipientId, onVerified, onBack }) => {
  const [studentId, setStudentId] = useState('')
  const [fullName, setFullName]   = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError]         = useState('')

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!studentId.trim() || !fullName.trim()) {
      setError('Both fields are required.')
      return
    }

    setVerifying(true)
    setError('')

    try {
      // Hash both values client-side — raw data never leaves the browser
      const [idHash, nameHash] = await Promise.all([
        sha256(studentId),
        sha256(fullName),
      ])

      // Check 24-hour cooldown first (fast path — avoids roster lookup)
      const { data: isDupe } = await supabase.rpc('check_student_duplicate', {
        p_student_id_hash: idHash,
        p_recipient_id:    recipientId,
      })

      if (isDupe) {
        setError('You already submitted feedback for this staff member in the last 24 hours.')
        setVerifying(false)
        return
      }

      // Verify against roster (only the RPC can touch that table)
      const { data, error: rpcError } = await supabase.rpc('verify_student', {
        p_id_hash:   idHash,
        p_name_hash: nameHash,
      })

      if (rpcError) throw rpcError

      if (!data.verified) {
        setError(data.reason)
      } else {
        // Pass verified student data + the hash (never the raw ID) upstream
        onVerified({
          idHash:      data.id_hash,
          displayName: data.full_name,
          courseCode:  data.course_code,
          yearLevel:   data.year_level,
        })
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
      console.error(err)
    }

    setVerifying(false)
  }

  return (
    <div>
      <div className="text-center mb-6">
        <p className="text-gold-300 text-xs font-semibold uppercase tracking-widest mb-2">
          Step 1 of 2 — Student Verification
        </p>
        <h2 className="font-display text-2xl font-bold text-white">Verify your identity</h2>
        <p className="text-forest-300 mt-2 text-sm">Your details are checked against the enrollment masterlist</p>
      </div>

      <form onSubmit={handleVerify} className="bg-white rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Student ID Number <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            className="input-field font-mono"
            placeholder="e.g. 2024-00123"
            required
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Full Name (as registered) <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="input-field"
            placeholder="e.g. DELA CRUZ, JUAN PEDRO"
            required
            autoComplete="off"
          />
          <p className="text-xs text-gray-400 mt-1">
            Must match exactly as it appears on your registration form (Last, First Middle or First Last).
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Privacy notice */}
        <div className="bg-forest-50 border border-forest-200 rounded-xl p-3 flex items-start gap-2">
          <Info size={15} className="text-forest-500 shrink-0 mt-0.5" />
          <p className="text-forest-700 text-xs leading-relaxed">
            Your Student ID and name are <strong>hashed in your browser</strong> before being verified.
            The raw values are never stored or transmitted. Only an anonymous hash is saved with your feedback.
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onBack}
            className="flex-1 border-2 border-gray-200 text-gray-500 hover:border-gray-300 font-semibold py-3 rounded-xl transition-all text-sm">
            Back
          </button>
          <button type="submit" disabled={verifying}
            className="flex-2 btn-secondary flex-1 flex items-center justify-center gap-2">
            {verifying ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </>
            ) : (
              <>Verify & Continue <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GiveFeedback() {
  const { qrToken }     = useParams()
  const { user, profile } = useAuth()
  const navigate          = useNavigate()

  const [recipient,      setRecipient]      = useState(null)
  const [pageLoading,    setPageLoading]    = useState(true)
  const [submitting,     setSubmitting]     = useState(false)
  const [submitted,      setSubmitted]      = useState(false)
  const [pageError,      setPageError]      = useState(null)
  const [alreadyRated,   setAlreadyRated]   = useState(false)

  // 'idle' | 'choose' | 'student-verify' | 'form'
  const [step, setStep] = useState('idle')

  // Employee path: set when user is logged in
  // Student path: set after successful RPC verification
  const [giverType,      setGiverType]      = useState(null)  // 'employee' | 'student'
  const [studentInfo,    setStudentInfo]    = useState(null)  // { idHash, displayName, … }

  const [ratings, setRatings] = useState({
    q1_greet: 0, q2_listen: 0, q3_communicate: 0,
    q4_follow_through: 0, q5_dignity: 0, q6_accuracy: 0, q7_overall: 0
  })
  const [comments, setComments] = useState('')

  const ratingKeys = Object.keys(ratings)

  // ── Load recipient ──────────────────────────────────────────────────────────
  useEffect(() => { fetchRecipient() }, [qrToken])

  // ── If logged-in employee lands here, skip straight to giver-type choice ───
  useEffect(() => {
    if (recipient && user && profile) {
      if (profile.id === recipient.id) {
        setPageError('You cannot rate yourself.')
        return
      }
      checkEmployeeDuplicate()
    } else if (recipient && !pageLoading) {
      setStep('choose')
    }
  }, [recipient, user, profile])

  const fetchRecipient = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, employee_id, department, position, role')
      .eq('qr_token', qrToken)
      .eq('is_active', true)
      .single()

    if (error || !data) setPageError('This QR code is invalid or has been deactivated.')
    else setRecipient(data)
    setPageLoading(false)
  }

  const checkEmployeeDuplicate = async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('feedback')
      .select('id')
      .eq('giver_id', user.id)
      .eq('recipient_id', recipient.id)
      .gte('submitted_at', since)
      .maybeSingle()

    if (data) setAlreadyRated(true)
    else setStep('choose')
  }

  // ── Giver type chosen ───────────────────────────────────────────────────────
  const handleGiverTypeSelect = (type) => {
    if (type === 'employee') {
      if (!user) {
        navigate(`/login?returnTo=/feedback/${qrToken}`)
        return
      }
      setGiverType('employee')
      setStep('form')
    } else {
      setGiverType('student')
      setStep('student-verify')
    }
  }

  // ── Student verified ────────────────────────────────────────────────────────
  const handleStudentVerified = (info) => {
    setStudentInfo(info)
    setStep('form')
  }

  // ── Submit feedback ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (ratingKeys.some(k => ratings[k] === 0)) {
      toast.error('Please rate all 7 criteria before submitting.')
      return
    }

    setSubmitting(true)

    const payload = {
      recipient_id: recipient.id,
      giver_type:   giverType,
      ...ratings,
      comments: comments.trim() || null,
    }

    if (giverType === 'employee') {
      payload.giver_id = user.id
    } else {
      payload.student_id_hash = studentInfo.idHash
    }

    const { error } = await supabase.from('feedback').insert(payload)
    setSubmitting(false)

    if (error) {
      console.error(error)
      toast.error('Submission failed. Please try again.')
    } else {
      setSubmitted(true)
    }
  }

  // ─── Render states ─────────────────────────────────────────────────────────

  if (pageLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-forest-950">
      <Loader size={32} className="animate-spin text-gold-500" />
    </div>
  )

  if (pageError) return (
    <div className="min-h-screen flex items-center justify-center bg-forest-950 px-4">
      <div className="text-center max-w-sm">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="font-display text-2xl font-bold text-white mb-2">Oops!</h2>
        <p className="text-forest-300 mb-6">{pageError}</p>
        <Link to="/" className="btn-secondary inline-block">Go to Home</Link>
      </div>
    </div>
  )

  if (alreadyRated) return (
    <div className="min-h-screen flex items-center justify-center bg-forest-950 px-4">
      <div className="text-center max-w-sm">
        <AlertCircle size={48} className="text-gold-400 mx-auto mb-4" />
        <h2 className="font-display text-2xl font-bold text-white mb-2">Already Submitted</h2>
        <p className="text-forest-300 mb-6">
          You've already rated <strong className="text-white">{recipient?.full_name}</strong> in the
          last 24 hours. Please wait before rating them again.
        </p>
        {user
          ? <Link to="/dashboard" className="btn-secondary inline-block">Back to Dashboard</Link>
          : <Link to="/"          className="btn-secondary inline-block">Back to Home</Link>
        }
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-forest-950 px-4">
      <div className="text-center max-w-sm animate-slide-up">
        <div className="w-20 h-20 bg-forest-800 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-forest-600">
          <CheckCircle size={40} className="text-forest-400" />
        </div>
        <h2 className="font-display text-3xl font-bold text-white mb-3">Thank you!</h2>
        <p className="text-forest-300 mb-1">
          Your feedback for <strong className="text-white">{recipient.full_name}</strong> has been recorded.
        </p>
        <p className="text-forest-400 text-sm mb-8">Your identity is kept confidential.</p>
        {user
          ? <Link to="/dashboard" className="btn-primary inline-block">Back to Dashboard</Link>
          : <Link to="/"          className="btn-primary inline-block">Back to Home</Link>
        }
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 py-10 px-4">
      <div className="max-w-xl mx-auto">

        {/* School header */}
        <div className="text-center mb-6">
          <p className="text-gold-300 text-xs font-semibold uppercase tracking-widest mb-1">
            Universidad de Sta. Isabel De Naga, Inc.
          </p>
          <h1 className="font-display text-2xl font-bold text-white">Customer Service Feedback</h1>
        </div>

        {/* Recipient card — always visible */}
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-gold-500 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0">
            {recipient.full_name?.charAt(0)}
          </div>
          <div>
            <p className="text-white font-bold">{recipient.full_name}</p>
            <p className="text-forest-300 text-sm">{recipient.position || recipient.role?.replace('_', ' ')}</p>
            <p className="text-forest-400 text-xs">{recipient.department}</p>
          </div>
        </div>

        {/* ── Step: choose giver type ── */}
        {step === 'choose' && (
          <GiverTypeSelector onSelect={handleGiverTypeSelect} />
        )}

        {/* ── Step: student verification ── */}
        {step === 'student-verify' && (
          <StudentVerifyForm
            recipientId={recipient.id}
            onVerified={handleStudentVerified}
            onBack={() => setStep('choose')}
          />
        )}

        {/* ── Step: feedback form ── */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">

            {/* Identity confirmation banner */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 flex items-center gap-3">
              <ShieldCheck size={18} className="text-gold-300 shrink-0" />
              <div>
                <p className="text-white text-sm font-semibold">
                  Step 2 of 2 — {giverType === 'student' ? 'Verified Student' : 'Logged-in Employee'}
                </p>
                <p className="text-forest-300 text-xs mt-0.5">
                  {giverType === 'student'
                    ? `${studentInfo.displayName} · ${studentInfo.courseCode ?? ''} ${studentInfo.yearLevel ? `Year ${studentInfo.yearLevel}` : ''}`
                    : `${profile?.full_name} · ${profile?.department}`
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="ml-auto text-xs text-forest-400 hover:text-red-300 transition-colors"
              >
                Change
              </button>
            </div>

            {/* Rating scale reference */}
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-forest-200 text-xs font-semibold mb-2 uppercase tracking-wider">Rating Scale</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-forest-300">
                <span>1 = Strongly Disagree (Needs Improvement)</span>
                <span>2 = Disagree (Satisfactory)</span>
                <span>3 = Agree (Very Satisfactory)</span>
                <span>4 = Strongly Agree (Excellent)</span>
              </div>
            </div>

            {/* Questions */}
            <div className="bg-white rounded-2xl p-6 space-y-5">
              {FEEDBACK_QUESTIONS.map((q, i) => (
                <RatingQuestion
                  key={q.id}
                  index={i + 1}
                  question={q.label}
                  value={ratings[q.id]}
                  onChange={(v) => setRatings(p => ({ ...p, [q.id]: v }))}
                />
              ))}
            </div>

            {/* Comments */}
            <div className="bg-white rounded-2xl p-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Other Comments (Optional)</label>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                className="input-field resize-none"
                rows={3}
                placeholder="Share any additional feedback here..."
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{comments.length}/500</p>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full text-base">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : 'Submit Feedback'}
            </button>

            <p className="text-center text-forest-400 text-xs pb-6">
              <ShieldCheck size={12} className="inline mr-1" />
              Your identity is anonymous to the recipient. Admins only can view giver information.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
