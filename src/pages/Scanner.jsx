import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ScanLine, AlertCircle, Info } from 'lucide-react'

export default function Scanner() {
  const navigate    = useNavigate()
  const videoRef    = useRef(null)
  const streamRef   = useRef(null)
  const rafRef      = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError]       = useState(null)

  /* ── stop & clean up ─────────────────────────────────── */
  const stopScan = () => {
    if (rafRef.current)    { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current)  { videoRef.current.srcObject = null }
    setScanning(false)
  }

  /* ── start scanning ───────────────────────────────────── */
  const startScan = async () => {
    setError(null)

    if (!('BarcodeDetector' in window)) {
      setError('QR scanning requires Chrome or Edge. Please open this page in one of those browsers.')
      return
    }

    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setScanning(true)

      /* scan loop — runs every animation frame */
      const loop = async () => {
        if (!streamRef.current || !videoRef.current) return
        try {
          const results = await detector.detect(videoRef.current)
          for (const r of results) {
            try {
              const url   = new URL(r.rawValue)
              const match = url.pathname.match(/\/feedback\/([a-zA-Z0-9-]+)/)
              if (match) {
                stopScan()
                navigate(`/feedback/${match[1]}`)
                return
              }
            } catch { /* not a valid URL */ }
          }
        } catch { /* frame not ready yet */ }
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)

    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Camera access was denied. Please allow camera permissions in your browser and try again.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.')
      } else {
        setError(`Could not start camera: ${err.message}`)
      }
    }
  }

  /* clean up on page leave */
  useEffect(() => () => stopScan(), []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── UI ───────────────────────────────────────────────── */
  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-forest-900">Scan QR Code</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Point your camera at a colleague's QR code to open their feedback form.
        </p>
      </div>

      <div className="card space-y-4">
        {/* Camera viewport */}
        <div className="relative w-full rounded-xl overflow-hidden bg-gray-900" style={{ minHeight: 300 }}>

          {/* Native <video> — we control it directly */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            style={{ display: scanning ? 'block' : 'none' }}
          />

          {/* Scan-box overlay */}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 border-2 border-white/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
          )}

          {/* Idle placeholder */}
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <div className="w-20 h-20 bg-forest-100 rounded-2xl flex items-center justify-center mb-4">
                <ScanLine size={36} className="text-forest-600" />
              </div>
              <h2 className="font-display text-xl font-bold text-white mb-2">Ready to Scan</h2>
              <p className="text-gray-300 text-sm max-w-xs">
                Tap "Start Camera" below to activate your camera.
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
          <button onClick={startScan} className="btn-secondary w-full flex items-center justify-center gap-2">
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
