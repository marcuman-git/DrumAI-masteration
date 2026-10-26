export type SkillKey =
  | 'timing'
  | 'coordination'
  | 'dynamics'
  | 'reading'
  | 'speed'
  | 'overall'

export type TrainingModuleId =
  | 'dashboard'
  | 'metronome'
  | 'timing-analyzer'
  | 'rudiments'
  | 'stick-control'
  | 'reading'
  | 'dictation'
  | 'independence'
  | 'groove-library'
  | 'fills'
  | 'polyrhythm'
  | 'odd-time'
  | 'dynamics'
  | 'speed'
  | 'practice-pad'
  | 'song-practice'
  | 'coach'
  | 'analytics'
  | 'community'

export interface SkillRating {
  label: string
  value: number
  key: SkillKey
}

export interface PracticeSummary {
  todayGoalMinutes: number
  todayCompletedMinutes: number
  streakDays: number
  weeklyProgressPercent: number
  totalPracticeHours: number
  timingAccuracy: number
  bestBpm: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  earnedAt: string
}

export interface TimingHit {
  id: string
  expectedAt: number
  actualAt: number
  deviationMs: number
  quality: 'perfect' | 'early' | 'late' | 'missed'
  hand?: 'L' | 'R'
}

export interface SessionInsight {
  id: string
  createdAt: string
  recommendation: string
  focus: SkillKey
}

export type PracticeEventType = 'start' | 'hit' | 'mistake' | 'stop' | 'score'

export interface PracticeEvent {
  id: string
  timestamp: string
  moduleId: TrainingModuleId
  type: PracticeEventType
  sessionId?: string
  payload?: Record<string, number | string | boolean | null>
}

export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional'

export interface UserProfile {
  id: string
  createdAt: string
  updatedAt: string
  experienceLevel: ExperienceLevel
  styles: string[]
  goals: string[]
  dailyMinutes: number
  drumSetup: 'Acoustic Kit' | 'Electronic Kit' | 'Practice Pad' | 'Hybrid'
  hasMidiDevice: boolean
}

export interface DrumPlugin {
  id: string
  name: string
  version: string
  initialize: () => void
}
