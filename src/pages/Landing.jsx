import { Link } from 'react-router-dom'
import { QrCode, Shield, BarChart3, Bell, Star, CheckCircle, Users } from 'lucide-react'

const features = [
  {
    icon: QrCode,
    title: 'QR-Based Identity',
    desc: 'Every employee and student has a unique QR code tied to their ID. No more anonymous slips.',
  },
  {
    icon: Shield,
    title: 'Tamper-Proof',
    desc: 'Feedback can only be submitted by registered system users. Self-rating is technically impossible.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    desc: 'Admins see live dashboards with ratings, trends, and department-level breakdowns instantly.',
  },
  {
    icon: Bell,
    title: 'Instant Notifications',
    desc: 'Staff are notified when they receive feedback — no waiting until awarding day to know how they\'re doing.',
  },
  {
    icon: Shield,
    title: 'Privacy Protected',
    desc: 'Recipients never see who rated them. Only admins can view giver identities for fraud investigation.',
  },
  {
    icon: Users,
    title: 'Mutual Evaluation',
    desc: 'Teaching and non-teaching employees are both customers to each other — all covered in one system.',
  },
]

const benefits = [
  'Eliminates ballot stuffing & self-rating fraud',
  'Auditable trail of every submission with timestamps',
  'Suspicious pattern detection flags repeated givers',
  'Paperless — saves costs and reduces waste',
  'Accessible from any smartphone via QR scan',
  'Awards-ready leaderboard data at any time',
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 text-white font-body">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
            <img src="/usi-logo.png" alt="USI" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-display font-bold text-white text-lg leading-tight">USI FeedForward</p>
            <p className="text-gold-300 text-xs">Universidad de Sta. Isabel De Naga, Inc.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="bg-gold-500 hover:bg-gold-400 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-all shadow-lg hover:shadow-gold-500/30">Sign In</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-500/30 text-gold-300 text-sm font-medium px-4 py-2 rounded-full mb-8">
          <Star size={14} className="fill-gold-400 text-gold-400" />
          Digital Customer Feedback System
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6">
          Honest Feedback.
          <br />
          <span className="text-gold-400">Verified Identity.</span>
        </h1>
        <p className="text-forest-200 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          USI FeedForward replaces paper slips with a secure, QR-powered platform that makes every rating count — and every attempt to cheat visible.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/login" className="bg-gold-500 hover:bg-gold-400 text-white font-bold px-8 py-4 rounded-2xl text-lg shadow-xl hover:shadow-gold-500/40 transition-all">
            Sign In
          </Link>
          <a href="#features" className="border border-forest-500 text-forest-200 hover:border-gold-500 hover:text-gold-300 font-semibold px-8 py-4 rounded-2xl text-lg transition-all">
            Learn More
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="font-display text-4xl font-bold text-center mb-4">Why Digital?</h2>
        <p className="text-forest-300 text-center max-w-xl mx-auto mb-14">
          Every feature was designed to address the real vulnerabilities of the paper-based system.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-forest-800/50 border border-forest-700 rounded-2xl p-6 hover:border-gold-500/50 transition-all group">
              <div className="w-12 h-12 bg-gold-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gold-500/30 transition-colors">
                <Icon size={22} className="text-gold-400" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">{title}</h3>
              <p className="text-forest-300 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits list */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-gold-600 to-gold-500 rounded-3xl p-10 shadow-2xl">
          <h2 className="font-display text-3xl font-bold text-white mb-8 text-center">At a Glance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map(b => (
              <div key={b} className="flex items-start gap-3">
                <CheckCircle size={18} className="text-forest-900 shrink-0 mt-0.5" />
                <span className="text-forest-950 font-medium text-sm">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-forest-800 px-6 py-8 text-center text-forest-400 text-sm">
        <p>© {new Date().getFullYear()} Universidad de Sta. Isabel De Naga, Inc. — USI FeedForward</p>
        <p className="mt-1">Built for integrity. Designed for trust.</p>
      </footer>
    </div>
  )
}
