'use client'
import { useState } from 'react'
import { useSessionStore } from '@/lib/store'

export default function TransferPage() {
  const { state, score } = useSessionStore()
  const [form, setForm] = useState({
    accountNumber: '',
    ifsc:          '',
    name:          '',
    amount:        '',
    remarks:       '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (state === 'red') return
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Fund Transfer</h1>
        <p className="text-slate-400 text-sm mt-1">
          BehaviorGuard monitors this form in real time
        </p>
      </div>

      {submitted && (
        <div className="bg-green-500/20 border border-green-500/40
                        rounded-xl p-4 text-green-400 text-sm font-medium">
          ✅ Transfer initiated successfully
        </div>
      )}

      {state === 'red' && (
        <div className="bg-red-500/20 border border-red-500/40
                        rounded-xl p-4 text-red-400 text-sm">
          🔴 Transfers blocked — complete security verification first
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">
              Account Number
            </label>
            <input
              type="text"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              placeholder="Enter 12-digit account number"
              maxLength={12}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl
                         px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">IFSC Code</label>
            <input
              type="text"
              value={form.ifsc}
              onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
              placeholder="e.g. SBIN0001234"
              maxLength={11}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl
                         px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">
              Beneficiary Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter full name"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl
                         px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">
              Amount (₹)
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl
                         px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">
              Remarks (optional)
            </label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="e.g. Rent payment"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl
                         px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Trust score: <span className="text-white font-mono">{score.toFixed(0)}/100</span>
            </div>
            <button
              type="submit"
              disabled={state === 'red'}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40
                         disabled:cursor-not-allowed text-white font-semibold
                         px-6 py-3 rounded-xl transition-colors"
            >
              Transfer Now
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}