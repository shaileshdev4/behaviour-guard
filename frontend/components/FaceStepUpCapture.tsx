'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { verifyFaceImage, type FaceVerifyResponse } from '@/lib/faceApi'

type Props = {
  /** Called when API returns status === "verified" */
  onVerified: (res: FaceVerifyResponse) => void
  /** Human-readable failure (no_face, unknown, not_configured, deps_missing, network) */
  onFailure: (message: string, res?: FaceVerifyResponse) => void
  disabled?: boolean
  /** When true, no inner card chrome (parent already framed). */
  frameless?: boolean
}

export default function FaceStepUpCapture({ onVerified, onFailure, disabled, frameless }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [busy, setBusy] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }, [])

  const startCamera = useCallback(async () => {
    if (disabled) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
    } catch (e) {
      onFailure(
        e instanceof Error ? e.message : 'Camera permission denied or unavailable.'
      )
    }
  }, [disabled, onFailure])

  useEffect(() => () => stopCamera(), [stopCamera])

  const captureAndVerify = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || disabled || busy) return
    if (video.readyState < 2) {
      onFailure('Wait for the camera preview to start.')
      return
    }

    setBusy(true)
    try {
      const ctx = canvas.getContext('2d')
      const w = video.videoWidth
      const h = video.videoHeight
      if (!w || !h || !ctx) {
        onFailure('Camera not ready.')
        return
      }
      canvas.width = w
      canvas.height = h
      ctx.drawImage(video, 0, 0, w, h)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88)
      )
      if (!blob) {
        onFailure('Could not capture frame.')
        return
      }

      const res = await verifyFaceImage(blob)
      if (res.status === 'verified') {
        onVerified(res)
      } else {
        const hint =
          res.detail ||
          (res.status === 'no_face'
            ? 'No face detected — face the camera.'
            : res.status === 'unknown'
              ? 'Face did not match enrolled profile.'
              : res.status === 'not_configured'
                ? 'No face model at server models/face/face_model.pkl (or set FACE_STEPUP_BYPASS=1).'
                : res.status === 'deps_missing'
                  ? 'Server missing face_recognition / Pillow.'
                  : 'Verification failed.')
        onFailure(hint, res)
      }
    } catch (e) {
      onFailure(e instanceof Error ? e.message : 'Network error')
    } finally {
      setBusy(false)
    }
  }, [busy, disabled, onFailure, onVerified])

  const shell = frameless
    ? { marginBottom: 0, padding: 0, borderRadius: 0, background: 'transparent', border: 'none' }
    : {
        marginBottom: 16,
        padding: 14,
        borderRadius: 'var(--r-md)',
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
      }

  return (
    <div style={shell}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text2)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 10,
        }}
      >
        Face verification
      </p>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          maxHeight: 220,
          borderRadius: 'var(--r)',
          background: '#0f1229',
          objectFit: 'cover',
        }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={disabled || busy}
          onClick={cameraOn ? stopCamera : startCamera}
          style={{ padding: '8px 14px', fontSize: 13 }}
        >
          {cameraOn ? 'Stop camera' : 'Start camera'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={disabled || busy || !cameraOn}
          onClick={captureAndVerify}
          style={{ padding: '8px 14px', fontSize: 13 }}
        >
          {busy ? 'Checking…' : 'Capture & verify face'}
        </button>
      </div>
    </div>
  )
}
