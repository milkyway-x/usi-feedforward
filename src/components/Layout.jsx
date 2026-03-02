import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  LayoutDashboard, QrCode, Star, Bell, LogOut,
  Menu, X, Users, AlertTriangle,
  Shield, GraduationCap, ScanLine, UserCircle, Building2
} from 'lucide-react'

const USILogo = () => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md">
      <img src="/usi-logo.png" alt="USI" className="w-full h-full object-cover" />
    </div>
    <div>
      <p className="font-display font-bold text-white text-sm leading-tight">USI</p>
      <p className="text-gold-300 text-xs leading-tight">FeedForward</p>
    </div>
  </div>
)

export default function Layout({ isAdmin = false }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (profile) fetchUnread()
  }, [profile])

  const fetchUnread = async () => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false)
    setUnreadCount(count || 0)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const userLinks = [
    { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/my-qr',         icon: QrCode,          label: 'My QR Code' },
    { to: '/scanner',       icon: ScanLine,         label: 'Scan QR' },
    { to: '/my-feedback',   icon: Star,             label: 'My Ratings' },
    { to: '/notifications', icon: Bell,             label: 'Notifications', badge: unreadCount },
    { to: '/profile',       icon: UserCircle,       label: 'My Profile' },
  ]

  const adminLinks = [
    { to: '/admin',              icon: LayoutDashboard, label: 'Overview',           end: true },
    { to: '/admin/users',        icon: Users,           label: 'Manage Users' },
    { to: '/admin/roster',       icon: GraduationCap,   label: 'Student Roster' },
    { to: '/admin/feedback',     icon: Star,            label: 'All Feedback' },
    { to: '/admin/suspicious',   icon: AlertTriangle,   label: 'Suspicious Activity' },
    { to: '/admin/departments',  icon: Building2,       label: 'Departments' },
  ]

  const links = isAdmin ? adminLinks : userLinks

  const Sidebar = () => (
    <aside className="w-64 bg-forest-900 min-h-screen flex flex-col shadow-2xl">
      <div className="p-5 border-b border-forest-700">
        <USILogo />
      </div>

      {/* Profile summary */}
      <div className="p-4 border-b border-forest-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gold-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{profile?.full_name}</p>
            <p className="text-forest-300 text-xs capitalize truncate">
              {profile?.role?.replace('_', ' ')} {isAdmin && '· Admin'}
            </p>
          </div>
          {isAdmin && <Shield size={14} className="text-gold-400 shrink-0" />}
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, icon: Icon, label, badge, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {badge > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Switch view for admin */}
      {profile?.role === 'admin' && (
        <div className="p-3 border-t border-forest-700">
          <NavLink
            to={isAdmin ? '/dashboard' : '/admin'}
            className="sidebar-link text-gold-300 hover:text-gold-100"
          >
            <Shield size={16} />
            <span>{isAdmin ? 'User View' : 'Admin Panel'}</span>
          </NavLink>
        </div>
      )}

      {/* Sign out */}
      <div className="p-3 border-t border-forest-700">
        <button
          onClick={handleSignOut}
          className="sidebar-link w-full text-red-300 hover:bg-red-900 hover:text-red-100"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen bg-amber-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-forest-900 text-white p-4 flex items-center justify-between sticky top-0 z-40">
          <USILogo />
          <button onClick={() => setSidebarOpen(true)} className="text-white">
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
