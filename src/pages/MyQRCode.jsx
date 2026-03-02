import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../contexts/AuthContext'
import { Download, Printer, Share2, QrCode, Info } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MyQRCode() {
  const { profile } = useAuth()
  const qrRef = useRef(null)

  const feedbackUrl = `${window.location.origin}/feedback/${profile?.qr_token}`

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `USI-FeedForward-QR-${profile.employee_id}.svg`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('QR code downloaded!')
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Give me feedback!', url: feedbackUrl })
    } else {
      await navigator.clipboard.writeText(feedbackUrl)
      toast.success('Link copied to clipboard!')
    }
  }

  const handlePrint = () => window.print()

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-forest-900">My QR Code</h1>
        <p className="text-gray-500 mt-1 text-sm">Display this to receive customer service feedback.</p>
      </div>

      {/* QR Card */}
      <div className="card text-center" ref={qrRef}>
        {/* Header for print */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-gold-600 uppercase tracking-widest mb-1">Universidad de Sta. Isabel De Naga, Inc.</p>
          <h2 className="font-display text-2xl font-bold text-forest-900">Customer Service Feedback</h2>
          <p className="text-gray-400 text-sm mt-1">Scan to rate this staff member's service</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white border-4 border-gold-400 rounded-2xl shadow-xl animate-pulse-gold inline-block">
            <QRCodeSVG
              value={feedbackUrl}
              size={220}
              bgColor="#ffffff"
              fgColor="#14532d"
              level="H"
              includeMargin={false}
              imageSettings={{
                src: '',
                x: undefined, y: undefined,
                height: 40, width: 40,
                excavate: true,
              }}
            />
          </div>
        </div>

        {/* Staff info */}
        <div className="bg-forest-50 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gold-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {profile?.full_name?.charAt(0)}
            </div>
            <div className="text-left">
              <p className="font-display font-bold text-lg text-forest-900">{profile?.full_name}</p>
              <p className="text-forest-600 text-sm">{profile?.position || profile?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="text-center">
            <span className="bg-forest-100 text-forest-700 text-xs font-bold px-3 py-1 rounded-full">
              ID: {profile?.employee_id}
            </span>
            <span className="bg-gold-100 text-gold-700 text-xs font-bold px-3 py-1 rounded-full ml-2">
              {profile?.department}
            </span>
          </div>
        </div>

        {/* URL display */}
        <p className="text-xs text-gray-400 font-mono break-all">{feedbackUrl}</p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3 no-print">
        <button onClick={handleDownload} className="card flex flex-col items-center gap-2 p-4 hover:border-gold-300 hover:shadow-md transition-all cursor-pointer">
          <Download size={22} className="text-gold-600" />
          <span className="text-xs font-semibold text-gray-600">Download</span>
        </button>
        <button onClick={handlePrint} className="card flex flex-col items-center gap-2 p-4 hover:border-gold-300 hover:shadow-md transition-all cursor-pointer">
          <Printer size={22} className="text-forest-600" />
          <span className="text-xs font-semibold text-gray-600">Print</span>
        </button>
        <button onClick={handleShare} className="card flex flex-col items-center gap-2 p-4 hover:border-gold-300 hover:shadow-md transition-all cursor-pointer">
          <Share2 size={22} className="text-blue-600" />
          <span className="text-xs font-semibold text-gray-600">Share Link</span>
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-3 no-print">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 space-y-1">
          <p className="font-semibold">How it works</p>
          <p>When a customer scans your QR code, they'll be directed to fill out a digital feedback form. You will receive a notification, but the identity of the rater will remain private — only admins can view who rated you.</p>
          <p className="mt-2 font-medium">💡 Tip: Print and laminate your QR code and place it at your workspace.</p>
        </div>
      </div>
    </div>
  )
}
