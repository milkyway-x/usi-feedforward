import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Bell, CheckCheck, Star, AlertTriangle, Info } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

const iconMap = {
  feedback: { Icon: Star, color: 'text-gold-500', bg: 'bg-gold-100' },
  flag: { Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100' },
  system: { Icon: Info, color: 'text-blue-500', bg: 'bg-blue-100' },
}

export default function Notifications() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) fetchNotifications()
  }, [profile])

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setLoading(false)
    // Mark all as read
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', profile.id).eq('is_read', false)
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', profile.id)
    setNotifications(n => n.map(x => ({ ...x, is_read: true })))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-forest-900">Notifications</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {notifications.filter(n => !n.is_read).length} unread
          </p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllRead} className="flex items-center gap-2 text-sm text-forest-600 hover:text-forest-700 font-semibold">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-16">
          <Bell size={48} className="mx-auto mb-4 text-gray-200" />
          <h3 className="font-display text-xl font-bold text-gray-400">No notifications</h3>
          <p className="text-gray-400 text-sm mt-2">You'll be notified when you receive new feedback.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const { Icon, color, bg } = iconMap[n.type] || iconMap.system
            return (
              <div key={n.id} className={`card flex items-start gap-4 transition-all ${!n.is_read ? 'border-gold-200 bg-gold-50/50' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon size={18} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                    {!n.is_read && <span className="w-2 h-2 bg-gold-500 rounded-full shrink-0 mt-1" />}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
