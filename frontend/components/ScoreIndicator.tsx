'use client'
import { useSessionStore } from '@/lib/store'

export default function ScoreIndicator() {
  const { score, state, phase, enrollmentProgress } = useSessionStore()

  const colors = {
    green:  { dot: 'bg-green-400',  text: 'text-green-400',  bg: 'bg-green-400/10'  },
    yellow: { dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    red:    { dot: 'bg-red-400',    text: 'text-red-400',    bg: 'bg-red-400/10'    },
  }

  const c = colors[state] || colors.green

  if (phase === 'enrolling') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-700/50">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        <span className="text-blue-400 text-xs font-medium">
          Learning... {enrollmentProgress}%
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${c.bg}`}>
      <div className={`w-2 h-2 rounded-full ${c.dot} ${state !== 'green' ? 'animate-pulse' : ''}`} />
      <span className={`${c.text} text-xs font-medium`}>
        {score.toFixed(0)}
      </span>
    </div>
  )
}