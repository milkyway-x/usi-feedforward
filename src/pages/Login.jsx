import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function Login() {
  const [loading, setLoading] = useState(false)
  const { signInWithGoogle } = useAuth()
  const location = useLocation()
  const returnTo = new URLSearchParams(location.search).get('returnTo') || '/dashboard'

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await signInWithGoogle(returnTo)
    if (error) {
      toast.error('Could not connect to Google. Please try again.')
      setLoading(false)
    }
    // On success the page redirects — loading stays true intentionally
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="flex items-center gap-2 text-forest-300 hover:text-gold-300 mb-8 text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Gold top bar */}
          <div className="h-1.5 bg-gradient-to-r from-gold-400 via-gold-500 to-forest-500" />

          <div className="p-8">
            {/* Logo + title */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md shadow-gold-200">
                <img src="/usi-logo.png" alt="USI" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl text-forest-900 leading-tight">
                  Welcome to USI FeedForward
                </h1>
                <p className="text-gray-400 text-xs mt-0.5">
                  Universidad de Sta. Isabel De Naga, Inc.
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Sign in with your Google account to access the feedback platform.
              First-time users will be asked to complete their profile after signing in.
            </p>

            {/* Google sign-in button */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-gold-400 hover:bg-gold-50 text-gray-700 font-semibold py-3.5 px-6 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-gray-300 border-t-gold-500 rounded-full animate-spin" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Trust indicators */}
            <div className="mt-6 pt-6 border-t border-gray-100 space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-gray-400">
                <ShieldCheck size={14} className="text-forest-500 shrink-0" />
                <span>Your Google credentials are never shared with USI FeedForward</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-gray-400">
                <Sparkles size={14} className="text-gold-500 shrink-0" />
                <span>New users complete a one-time profile setup after signing in</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-forest-400 text-xs mt-6">
          By signing in you agree to our terms of use and privacy policy.
        </p>
      </div>
    </div>
  )
}
