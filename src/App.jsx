import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import MyQRCode from './pages/MyQRCode'
import GiveFeedback from './pages/GiveFeedback'
import MyFeedback from './pages/MyFeedback'
import Notifications from './pages/Notifications'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminFeedback from './pages/AdminFeedback'
import AdminSuspicious from './pages/AdminSuspicious'
import AdminRoster from './pages/AdminRoster'
import Layout from './components/Layout'

// ── Guard: authenticated + profile complete ───────────────────────────────────
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, profile, loading, needsOnboarding } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-forest-700 font-medium">Loading...</p>
      </div>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  // Authenticated via Google but hasn't filled profile yet
  if (needsOnboarding) return <Navigate to="/onboarding" replace />

  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/dashboard" replace />

  return children
}

// ── Guard: redirect logged-in users away from auth pages ─────────────────────
const PublicRoute = ({ children }) => {
  const { user, loading, needsOnboarding } = useAuth()
  if (loading) return null
  if (user && needsOnboarding) return <Navigate to="/onboarding" replace />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

// ── Onboarding guard: only for authenticated users needing profile ────────────
const OnboardingRoute = ({ children }) => {
  const { user, loading, needsOnboarding } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!needsOnboarding) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* OAuth callback — no guard, Supabase redirects here */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* One-time profile setup for new Google users */}
      <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />

      {/* QR feedback — public, student path doesn't need auth */}
      <Route path="/feedback/:qrToken" element={<GiveFeedback />} />

      {/* Protected — regular employees */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard"      element={<Dashboard />} />
        <Route path="my-qr"          element={<MyQRCode />} />
        <Route path="my-feedback"    element={<MyFeedback />} />
        <Route path="notifications"  element={<Notifications />} />
      </Route>

      {/* Protected — admin */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><Layout isAdmin /></ProtectedRoute>}>
        <Route index           element={<AdminDashboard />} />
        <Route path="users"    element={<AdminUsers />} />
        <Route path="roster"   element={<AdminRoster />} />
        <Route path="feedback" element={<AdminFeedback />} />
        <Route path="suspicious" element={<AdminSuspicious />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1a1a',
              color: '#fff',
              fontFamily: '"Source Sans 3", sans-serif',
              borderRadius: '12px',
            },
            success: {
              iconTheme: { primary: '#f59e0b', secondary: '#fff' }
            }
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
