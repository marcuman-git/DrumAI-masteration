import type { PracticeEvent } from '../../types/drumming'

export interface ChallengeItem {
  id: string
  title: string
  moduleHint: string
  progress: number
  target: number
  completed: boolean
}

export interface AchievementV2 {
  id: string
  title: string
  description: string
  unlocked: boolean
}

export interface ChallengesSnapshot {
  weeklyChallenges: ChallengeItem[]
  seasonalChallenges: ChallengeItem[]
  achievements: AchievementV2[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dayDistance(from: Date, to: Date): number {
  const fromDate = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const toDate = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.floor((+fromDate - +toDate) / (24 * 60 * 60 * 1000))
}

function countSessionMinutes(events: PracticeEvent[]): number {
  const sorted = [...events].sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
  const starts = new Map<string, PracticeEvent>()
  let minutes = 0

  for (const event of sorted) {
    if (!event.sessionId) continue
    if (event.type === 'start') {
      starts.set(event.sessionId, event)
      continue
    }
    if (event.type !== 'stop') continue
    const start = starts.get(event.sessionId)
    if (!start) continue
    const durationMs = clamp(+new Date(event.timestamp) - +new Date(start.timestamp), 0, 3 * 60 * 60 * 1000)
    minutes += durationMs / 60000
    starts.delete(event.sessionId)
  }

  return Math.round(minutes)
}

export function buildChallengesSnapshot(events: PracticeEvent[], now = new Date()): ChallengesSnapshot {
  const last7 = events.filter((event) => dayDistance(now, new Date(event.timestamp)) <= 6)
  const currentMonth = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`
  const monthEvents = events.filter((event) => {
    const ts = new Date(event.timestamp)
    const key = `${ts.getFullYear()}-${`${ts.getMonth() + 1}`.padStart(2, '0')}`
    return key === currentMonth
  })

  const uniqueDays = new Set(last7.map((event) => dateKey(new Date(event.timestamp)))).size
  const weeklyMinutes = countSessionMinutes(last7)
  const readingCompletions = last7.filter(
    (event) => event.moduleId === 'reading' && event.type === 'score' && event.payload?.completed === true,
  ).length
  const timingHits = last7.filter((event) => event.moduleId === 'timing-analyzer' && event.type === 'hit').length

  const monthlyMinutes = countSessionMinutes(monthEvents)
  const monthlyRudimentScores = monthEvents.filter((event) => event.moduleId === 'rudiments' && event.type === 'score').length
  const monthlyFillPlays = monthEvents.filter((event) => event.moduleId === 'fills' && event.type === 'score').length

  const weeklyChallenges: ChallengeItem[] = [
    {
      id: 'weekly-consistency',
      title: 'Consistency Week',
      moduleHint: 'Any module',
      progress: Math.min(uniqueDays, 5),
      target: 5,
      completed: uniqueDays >= 5,
    },
    {
      id: 'weekly-minutes',
      title: '120-Minute Push',
      moduleHint: 'Mixed practice',
      progress: Math.min(weeklyMinutes, 120),
      target: 120,
      completed: weeklyMinutes >= 120,
    },
    {
      id: 'weekly-reading',
      title: 'Reading Focus',
      moduleHint: 'Rhythm Reading',
      progress: Math.min(readingCompletions, 3),
      target: 3,
      completed: readingCompletions >= 3,
    },
  ]

  const seasonalChallenges: ChallengeItem[] = [
    {
      id: 'season-timing',
      title: 'Timing Marathon',
      moduleHint: 'Timing Analyzer',
      progress: Math.min(timingHits, 300),
      target: 300,
      completed: timingHits >= 300,
    },
    {
      id: 'season-rudiments',
      title: 'Rudiment Builder',
      moduleHint: 'Rudiment Trainer',
      progress: Math.min(monthlyRudimentScores, 40),
      target: 40,
      completed: monthlyRudimentScores >= 40,
    },
    {
      id: 'season-fills',
      title: 'Fill Crafter',
      moduleHint: 'Fill Generator',
      progress: Math.min(monthlyFillPlays, 30),
      target: 30,
      completed: monthlyFillPlays >= 30,
    },
    {
      id: 'season-hours',
      title: '10-Hour Month',
      moduleHint: 'Any module',
      progress: Math.min(monthlyMinutes, 600),
      target: 600,
      completed: monthlyMinutes >= 600,
    },
  ]

  const achievements: AchievementV2[] = [
    {
      id: 'first-practice',
      title: 'First Practice',
      description: 'Complete your first tracked session.',
      unlocked: events.some((event) => event.type === 'stop'),
    },
    {
      id: 'timing-wizard-v2',
      title: 'Timing Wizard',
      description: 'Log 200 timing hits.',
      unlocked: events.filter((event) => event.moduleId === 'timing-analyzer' && event.type === 'hit').length >= 200,
    },
    {
      id: 'reading-driver',
      title: 'Reading Driver',
      description: 'Complete 20 reading runs.',
      unlocked: events.filter((event) => event.moduleId === 'reading' && event.type === 'score').length >= 20,
    },
    {
      id: 'fill-forge',
      title: 'Fill Forge',
      description: 'Play 50 generated fills.',
      unlocked: events.filter((event) => event.moduleId === 'fills' && event.type === 'score').length >= 50,
    },
    {
      id: 'hundred-hour-club',
      title: '100-Hour Club',
      description: 'Accumulate 100 practice hours.',
      unlocked: countSessionMinutes(events) >= 6000,
    },
  ]

  return { weeklyChallenges, seasonalChallenges, achievements }
}
