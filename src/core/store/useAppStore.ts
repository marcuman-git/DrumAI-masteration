import { create } from 'zustand'
import type {
  Achievement,
  PracticeSummary,
  SessionInsight,
  SkillRating,
  TimingHit,
  TrainingModuleId,
} from '../types/drumming'
import { loadState, saveState } from '../services/storage/persistence'

interface AppState {
  activeModule: TrainingModuleId
  summary: PracticeSummary
  skills: SkillRating[]
  hits: TimingHit[]
  achievements: Achievement[]
  insights: SessionInsight[]
  micLevel: number
  setActiveModule: (moduleId: TrainingModuleId) => void
  setMicLevel: (value: number) => void
  addHit: (hit: TimingHit) => void
  clearHits: () => void
  addInsight: (insight: SessionInsight) => void
  hydrate: () => Promise<void>
}

type PersistedState = Pick<
  AppState,
  'activeModule' | 'summary' | 'skills' | 'hits' | 'achievements' | 'insights' | 'micLevel'
>

const initialState: Omit<
  AppState,
  'setActiveModule' | 'addHit' | 'clearHits' | 'addInsight' | 'hydrate' | 'setMicLevel'
> = {
  activeModule: 'dashboard',
  summary: {
    todayGoalMinutes: 90,
    todayCompletedMinutes: 62,
    streakDays: 19,
    weeklyProgressPercent: 73,
    totalPracticeHours: 412,
    timingAccuracy: 95,
    bestBpm: 212,
  },
  skills: [
    { key: 'timing', label: 'Timing', value: 95 },
    { key: 'coordination', label: 'Coordination', value: 87 },
    { key: 'dynamics', label: 'Dynamics', value: 81 },
    { key: 'reading', label: 'Reading', value: 78 },
    { key: 'speed', label: 'Speed', value: 90 },
    { key: 'overall', label: 'Overall', value: 86 },
  ],
  hits: [],
  micLevel: 0,
  achievements: [
    {
      id: 'first-practice',
      title: 'First Practice',
      description: 'Completed your first focused session.',
      earnedAt: '2026-10-14',
    },
    {
      id: 'streak-7',
      title: '7-Day Streak',
      description: 'Practiced 7 days in a row.',
      earnedAt: '2026-10-18',
    },
    {
      id: 'timing-wizard',
      title: 'Timing Wizard',
      description: 'Reached 95% timing accuracy.',
      earnedAt: '2026-10-21',
    },
  ],
  insights: [
    {
      id: 'coach-1',
      createdAt: new Date().toISOString(),
      focus: 'timing',
      recommendation:
        'Your left hand trails by an average of 11ms above 135 BPM. Run paradiddle inversion training at 120 BPM for 10 minutes.',
    },
  ],
}

let isHydrated = false

function snapshot(state: AppState): PersistedState {
  return {
    activeModule: state.activeModule,
    summary: state.summary,
    skills: state.skills,
    hits: state.hits,
    achievements: state.achievements,
    insights: state.insights,
    micLevel: state.micLevel,
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,
  setActiveModule: (activeModule) => {
    set({ activeModule })
    void saveState(snapshot(get()))
  },
  setMicLevel: (micLevel) => {
    set({ micLevel })
  },
  addHit: (hit) => {
    const hits = [...get().hits.slice(-149), hit]
    set({ hits })
    void saveState(snapshot(get()))
  },
  clearHits: () => {
    set({ hits: [] })
    void saveState(snapshot(get()))
  },
  addInsight: (insight) => {
    const insights = [insight, ...get().insights].slice(0, 24)
    set({ insights })
    void saveState(snapshot(get()))
  },
  hydrate: async () => {
    if (isHydrated) return
    isHydrated = true

    const stored = await loadState<PersistedState>()
    if (!stored) return

    set({
      activeModule: stored.activeModule,
      summary: stored.summary,
      skills: stored.skills,
      hits: stored.hits,
      achievements: stored.achievements,
      insights: stored.insights,
      micLevel: stored.micLevel,
    })
  },
}))
