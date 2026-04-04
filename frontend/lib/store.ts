import { create } from 'zustand'

import type { CreateSessionResponse, EventsExplanation } from '@/lib/api'

/** Shown once after login / signup from `createSession` + local fingerprint state. */
export type DeviceTrustNotice =
  | null
  | 'unknown_device'
  | 'recognized_device'
  | 'new_account_device'
  | 'fingerprint_off'

export interface Signal {
  key:     string
  label:   string
  value:   number | null
  unit:    string
  baseline: number | null
  status:  'normal' | 'elevated' | 'critical' | 'learning'
}

/** Raw 0–1 scores from backend (population SVM, cohort GMM, individual IF). */
export interface TierScores {
  population:  number
  cohort:      number | null
  individual:  number | null
  trust_day:   number
  cohort_id:   string | null
}

interface SessionState {
  sessionId:           string | null
  userId:              string | null
  score:               number
  state:               'green' | 'yellow' | 'red'
  phase:               'enrolling' | 'active'
  enrollmentProgress:  number
  windowCount:         number
  scoreHistory:        number[]
  showOverlay:         boolean
  explanation:         EventsExplanation | null
  action:              string

  cohortId:   string | null
  tierScores: TierScores | null

  /** Banner after login: device verified / unknown / fingerprint disabled */
  deviceTrustNotice: DeviceTrustNotice

  // Live signals — updated client-side every keystroke batch
  signals: Signal[]

  setSession:   (id: string, userId: string) => void
  updateScore:  (data: Partial<SessionState>) => void
  updateSignals:(signals: Signal[]) => void
  setOverlay:   (show: boolean, explanation?: EventsExplanation | null) => void
  /** Call after `createSession` with the fingerprint sent (or null if disabled / failed). */
  setDeviceTrustFromSession: (fingerprintSent: string | null, res: CreateSessionResponse) => void
  dismissDeviceTrustNotice: () => void
  clearSession: () => void
}

const DEFAULT_SIGNALS: Signal[] = [
  { key: 'mean_DT',    label: 'Dwell Time',     value: null, unit: 'ms',   baseline: null, status: 'learning' },
  { key: 'mean_FT',    label: 'Flight Time',    value: null, unit: 'ms',   baseline: null, status: 'learning' },
  { key: 'mean_DL',    label: 'Key Rhythm',     value: null, unit: 'ms',   baseline: null, status: 'learning' },
  { key: 'entropy',    label: 'Type Entropy',   value: null, unit: 'bits', baseline: null, status: 'learning' },
  { key: 'error_rate', label: 'Error Rate',     value: null, unit: '%',    baseline: null, status: 'learning' },
  { key: 'mouse_vel',  label: 'Mouse Velocity', value: null, unit: 'px/s', baseline: null, status: 'learning' },
]

export const useSessionStore = create<SessionState>((set) => ({
  sessionId:          null,
  userId:             null,
  score:              100,
  state:              'green',
  phase:              'enrolling',
  enrollmentProgress: 0,
  windowCount:        0,
  scoreHistory:       [],
  showOverlay:        false,
  explanation:        null,
  action:             'none',
  cohortId:           null,
  tierScores:         null,
  signals:            DEFAULT_SIGNALS,
  deviceTrustNotice:  null,

  setSession: (id, userId) => set({ sessionId: id, userId }),

  setDeviceTrustFromSession: (fingerprintSent, res) => {
    let notice: DeviceTrustNotice = null
    if (!fingerprintSent) {
      notice = 'fingerprint_off'
    } else if (res.device_known === false) {
      notice = 'unknown_device'
    } else if (res.profile_loaded) {
      notice = 'recognized_device'
    } else {
      notice = 'new_account_device'
    }
    set({ deviceTrustNotice: notice })
  },

  dismissDeviceTrustNotice: () => set({ deviceTrustNotice: null }),

  updateScore: (data) => set((prev) => ({
    ...data,
    scoreHistory: data.score !== undefined
      ? [...prev.scoreHistory.slice(-49), data.score]
      : prev.scoreHistory,
  })),

  updateSignals: (signals) => set({ signals }),

  setOverlay: (show, explanation = null) =>
    set({ showOverlay: show, explanation }),

  clearSession: () => set({
    sessionId: null,
    userId: null,
    score: 100,
    state: 'green',
    phase: 'enrolling',
    scoreHistory: [],
    showOverlay: false,
    signals: DEFAULT_SIGNALS,
    cohortId: null,
    tierScores: null,
    deviceTrustNotice: null,
  }),
}))