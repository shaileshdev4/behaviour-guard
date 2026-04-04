'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { verifyVoiceBlob, type VoiceVerifyResponse } from '@/lib/voiceApi'

type Props = {
  onVerified: (res: VoiceVerifyResponse) => void
  onFailure: (message: string, res?: VoiceVerifyResponse) => void
  disabled?: boolean
  frameless?: boolean
}

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const m of c) {
    if (MediaRecorder.isTypeSupported(m)) return m
  }
  return ''
}

export default function AudioStepUpCapture({ onVerified, onFailure, disabled, frameless }: Props) {
  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeRef = useRef('')
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && (!navigator.mediaDevices?.getUserMedia || !pickMime())) {
      setSupported(false)
    }
  }, [])

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(
    () => () => {
      recRef.current?.stop()
      cleanupStream()
    },
    [cleanupStream]
  )

  const startRecording = useCallback(async () => {
    if (disabled || busy || !supported) return
    const mime = pickMime()
    if (!mime) {
      onFailure('Recording not supported in this browser.')
      return
    }
    mimeRef.current = mime
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      chunksRef.current = []
      const rec = new MediaRecorder(stream, { mimeType: mime })
      recRef.current = rec
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.start(250)
      setRecording(true)
    } catch (e) {
      onFailure(e instanceof Error ? e.message : 'Microphone permission denied.')
    }
  }, [busy, disabled, onFailure, supported])

  const stopAndVerify = useCallback(async () => {
    const rec = recRef.current
    if (!rec || rec.state === 'inactive') {
      onFailure('Start recording first.')
      return
    }
    if (disabled || busy) return

    setBusy(true)
    const mime = mimeRef.current || 'audio/webm'

    await new Promise<void>((resolve) => {
      rec.onstop = () => {
        cleanupStream()
        recRef.current = null
        resolve()
      }
      try {
        if (rec.state === 'recording') rec.requestData()
        rec.stop()
      } catch {
        cleanupStream()
        recRef.current = null
        resolve()
      }
    })

    setRecording(false)

    try {
      const blob = new Blob(chunksRef.current, { type: mime })
      chunksRef.current = []
      if (blob.size < 500) {
        onFailure('Clip too short — record a few seconds.')
        return
      }
      const res = await verifyVoiceBlob(blob)
      if (res.status === 'verified') {
        onVerified(res)
      } else {
        const hint =
          res.detail ||
          (res.status === 'too_short'
            ? 'Recording too short.'
            : 'Voice verification unavailable.')
        onFailure(hint, res)
      }
    } catch (e) {
      onFailure(e instanceof Error ? e.message : 'Network error')
    } finally {
      setBusy(false)
    }
  }, [busy, cleanupStream, disabled, onFailure, onVerified])

  if (!supported) {
    return (
      <div
        style={{
          marginBottom: 16,
          padding: 14,
          borderRadius: 'var(--r-md)',
          background: 'var(--yellow-bg)',
          border: '1px solid var(--yellow-border)',
          fontSize: 12,
          color: 'var(--yellow)',
        }}
      >
        Voice recording is not supported in this browser. Use “Verify with image” instead.
      </div>
    )
  }

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
        Voice verification
      </p>
      <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.5 }}>
        Record a short phrase (e.g. “This is my secure session”). Press stop when done — we upload
        and verify.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={disabled || busy || recording}
          onClick={startRecording}
          style={{ padding: '8px 14px', fontSize: 13 }}
        >
          Start recording
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={disabled || busy || !recording}
          onClick={() => void stopAndVerify()}
          style={{ padding: '8px 14px', fontSize: 13 }}
        >
          {busy ? 'Sending…' : 'Stop & verify'}
        </button>
      </div>
    </div>
  )
}
