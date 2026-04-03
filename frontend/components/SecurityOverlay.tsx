'use client'
import { useState } from 'react'
import { useSessionStore } from '@/lib/store'
import { sendFeedback } from '@/lib/api'

export default function SecurityOverlay() {
  const { showOverlay, explanation, sessionId, setOverlay, updateScore } =
    useSessionStore()
  const [otp, setOtp] = useState('')

  if (!showOverlay) return null

  const handleVerify = async () => {
    if (!sessionId) return
    await sendFeedback(sessionId, true)
    updateScore({ score: 70, state: 'green' })
    setOverlay(false)
    setOtp('')
  }

  const handleNotMe = async () => {
    if (!sessionId) return
    await sendFeedback(sessionId, false)
    setOverlay(false)
    alert('Account secured. Please contact support.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-red-500/50 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-400 text-xl">🔐</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Security Check Required</h2>
            <p className="text-slate-400 text-sm">Unusual activity detected</p>
          </div>
        </div>

        {/* Explanation */}
        {explanation?.messages && explanation.messages.length > 0 && (
          <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
            <p className="text-slate-300 text-sm font-medium mb-2">
              What we noticed:
            </p>
            {explanation.messages.map((msg: string, i: number) => (
              <p key={i} className="text-slate-400 text-sm flex items-start gap-2 mb-1">
                <span className="text-yellow-400 mt-0.5">•</span>
                {msg}
              </p>
            ))}
            {explanation.advice && (
              <p className="text-slate-500 text-xs mt-3 italic">
                {explanation.advice}
              </p>
            )}
          </div>
        )}

        {/* OTP Input */}
        <div className="mb-6">
          <label className="text-slate-300 text-sm mb-2 block">
            Enter OTP sent to +91 98765-XXXXX
          </label>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6-digit OTP"
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3
                       text-white text-center text-xl tracking-widest
                       focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleVerify}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                       py-3 rounded-xl transition-colors"
          >
            ✓ Verify — This was me
          </button>
          <button
            onClick={handleNotMe}
            className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-semibold
                       py-3 rounded-xl border border-red-500/30 transition-colors"
          >
            Not me
          </button>
        </div>
      </div>
    </div>
  )
}