import type { PracticeEvent } from '../../types/drumming'

export interface DailyQuest {
  id: string
  title: string
  moduleHint: string
  progress: number
  target: number
  completed: boolean
  rewardXp: number
}

export interface GamificationSnapshot {
  level: number
  currentLevelXp: number
  xpToNextLevel: number
  totalXp: number
  todayXp: number
  quests: DailyQuest[]
}

const XP_PER_LEVEL = 250
const MAX_LEVEL = 100

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function eventXp(event: PracticeEvent): number {
  if (event.type === 'mistake') return 0
  if (event.type === 'hit') return 2
  if (event.type === 'score') return 5
  if (event.type === 'stop') return 3
  return 1
}

function countSessionMinutes(events: PracticeEvent[], moduleId: string): number {
  const sorted = [...events].sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
  const starts = new Map<string, PracticeEvent>()
  let minutes = 0

  for (const event of sorted) {
    if (event.moduleId !== moduleId || !event.sessionId) continue
    if (event.type === 'start') {
      starts.set(event.sessionId, event)
      continue
    }
    if (event.type !== 'stop') continue
    const start = starts.get(event.sessionId)
    if (!start) continue
    const durationMs = clamp(+new Date(event.timestamp) - +new Date(start.timestamp), 0, 2 * 60 * 60 * 1000)
    minutes += durationMs / 60000
    starts.delete(event.sessionId)
  }

  return Math.round(minutes)
}

export function buildGamificationSnapshot(events: PracticeEvent[], now = new Date()): GamificationSnapshot {
  const today = dateKey(now)
  const todayEvents = events.filter((event) => dateKey(new Date(event.timestamp)) === today)

  const totalXp = events.reduce((sum, event) => sum + eventXp(event), 0)
  const todayXp = todayEvents.reduce((sum, event) => sum + eventXp(event), 0)

  const uncappedLevel = Math.floor(totalXp / XP_PER_LEVEL) + 1
  const level = clamp(uncappedLevel, 1, MAX_LEVEL)
  const currentLevelXp = level >= MAX_LEVEL ? XP_PER_LEVEL : totalXp % XP_PER_LEVEL
  const xpToNextLevel = level >= MAX_LEVEL ? 0 : XP_PER_LEVEL - currentLevelXp

  const metronomeMinutes = countSessionMinutes(todayEvents, 'metronome')
  const timingHits = todayEvents.filter((event) => event.moduleId === 'timing-analyzer' && event.type === 'hit').length
  const readingCompletions = todayEvents.filter(
    (event) => event.moduleId === 'reading' && event.type === 'score' && event.payload?.completed === true,
  ).length

  const quests: DailyQuest[] = [
    {
      id: 'metronome-5m',
      title: 'Warm-up Pulse',
      moduleHint: 'Metronome',
      progress: Math.min(metronomeMinutes, 5),
      target: 5,
      completed: metronomeMinutes >= 5,
      rewardXp: 40,
    },
    {
      id: 'timing-20hits',
      title: 'Timing Lock',
      moduleHint: 'Timing Analyzer',
      progress: Math.min(timingHits, 20),
      target: 20,
      completed: timingHits >= 20,
      rewardXp: 50,
    },
    {
      id: 'reading-1run',
      title: 'Reading Flow',
      moduleHint: 'Rhythm Reading',
      progress: Math.min(readingCompletions, 1),
      target: 1,
      completed: readingCompletions >= 1,
      rewardXp: 35,
    },
  ]

  return {
    level,
    currentLevelXp,
    xpToNextLevel,
    totalXp,
    todayXp,
    quests,
  }
}
