import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader, AlertCircle } from 'lucide-react'

/**
 * This page lives at /auth/callback.
 * Supabase redirects here after the Google OAuth flow completes.
 * We check whether this user already has a profile row:
 *   - Yes → go to dashboard (or returnTo)
 *   - No  → go to /onboarding (first-time Google user)
 */
export default function AuthCallback() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [error, setError] = useState(null)

  useEffect(() => {
    const handle = async () => {
      // Supabase automatically exchanges the code in the URL hash/query
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setError('Authentication failed. Please try signing in again.')
        return
      }

      const returnTo = new URLSearchParams(location.search).get('returnTo') || '/dashboard'

      // Check if a profile row already exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profile) {
        // Existing user — go straight to their destination
        navigate(returnTo, { replace: true })
      } else {
        // New Google user — needs to complete profile
        // Pass returnTo so onboarding can redirect there after completion
        navigate(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`, { replace: true })
      }
    }

    handle()
  }, [])

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-forest-950 px-4">
      <div className="text-center max-w-sm">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="font-display text-2xl font-bold text-white mb-2">Sign-in Failed</h2>
        <p className="text-forest-300 mb-6">{error}</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-forest-950">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-forest-300 font-medium">Completing sign-in...</p>
      </div>
    </div>
  )
}
