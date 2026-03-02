import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  // true when user authenticated via Google but hasn't completed profile yet
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setNeedsOnboarding(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle() // won't throw on no row unlike .single()

    if (!error && data) {
      setProfile(data)
      setNeedsOnboarding(false)
    } else {
      // Authenticated but no profile row yet — Google OAuth new user
      setProfile(null)
      setNeedsOnboarding(true)
    }
    setLoading(false)
  }

  // Google OAuth — opens popup or redirect
  const signInWithGoogle = async (returnTo = '/dashboard') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
        queryParams: {
          // Hint to Google to show account picker every time
          prompt: 'select_account',
          // Restrict to institutional domain if desired (optional — remove to allow any Google account)
          // hd: 'usi.edu.ph',
        },
      },
    })
    return { error }
  }

  const signInWithEmail = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUpWithEmail = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setNeedsOnboarding(false)
  }

  const refreshProfile = () => {
    if (user) fetchProfile(user.id)
  }

  // Called from Onboarding page after profile row is created
  const completeOnboarding = (profileData) => {
    setProfile(profileData)
    setNeedsOnboarding(false)
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      needsOnboarding,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      refreshProfile,
      completeOnboarding,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
