import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, ScanLine, AlertCircle, Info } from 'lucide-react'

export default function Scanner() {
  const navigate = useNavigate()
  const [scanning, setScanning] = useState(false)
  const [error, setError]       = useState(null)
  const scannerRef = useRef(null)

  const startScan = async () => {
    setError(null)
    try {
      const scanner = new Html5Qrcode('qr-reader-viewport')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          try {
            const url = new URL(decodedText)
            const match = url.pathname.match(/\/feedback\/([a-zA-Z0-9-]+)/)
            if (match) {
              scanner.stop().catch(() => {})
              setScanning(false)
              navigate(`/feedback/${match[1]}`)
            }
          } catch {
            // Not a URL — ignore
          }
        },
        () => {} // per-frame error (no QR in frame) — ignore
      )
      setScanning(true)
    } catch (err) {
      const denied = err.name === 'NotAllowedError' || err.message?.includes('Permission')
      setError(
        denied
          ? 'Camera access denied. Please allow camera permissions in your browser settings and try again.'
          : 'Could not start the camera. Make sure no other app is using it, then try again.'
      )
    }
  }

  const stopScan = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch { /* ignore */ }
      scannerRef.current = null
    }
    setScanning(false)
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-forest-900">Scan QR Code</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Point your camera at a colleague's QR code to open their feedback form.
        </p>
      </div>

      <div className="card space-y-4">
        {/*
          The viewport div must always be visible in the DOM.
          html5-qrcode initialises before React re-renders, so hiding it
          with display:none (Tailwind `hidden`) prevents the video from rendering.
          We use a relative-positioned idle overlay instead.
        */}
        <div
          id="qr-reader-viewport"
          className="w-full rounded-xl overflow-hidden bg-gray-900 min-h-[300px] relative"
        >
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <div className="w-20 h-20 bg-forest-100 rounded-2xl flex items-center justify-center mb-4">
                <ScanLine size={36} className="text-forest-600" />
              </div>
              <h2 className="font-display text-xl font-bold text-white mb-2">Ready to Scan</h2>
              <p className="text-gray-300 text-sm max-w-xs">
                Tap "Start Camera" below to activate your camera and scan a colleague's QR code.
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Controls */}
        {!scanning ? (
          <button
            onClick={startScan}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Camera size={18} />
            Start Camera
          </button>
        ) : (
          <button
            onClick={stopScan}
            className="w-full border-2 border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50 font-semibold py-3 rounded-xl transition-all text-sm"
          >
            Stop Camera
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-3">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-semibold mb-1">How to use</p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-blue-600">
            <li>Click <strong>Start Camera</strong> and allow camera access when prompted</li>
            <li>Point your camera at a colleague's printed or on-screen QR code</li>
            <li>The feedback form will open automatically once the code is detected</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
