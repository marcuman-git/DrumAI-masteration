import type { PracticeEvent, SkillRating } from '../../types/drumming'

export interface PracticeMetrics {
  todayGoalMinutes: number
  todayCompletedMinutes: number
  streakDays: number
  weeklyProgressPercent: number
  totalPracticeHours: number
  timingAccuracy: number
  bestBpm: number
  recommendedExercise: string
  practiceMinutes: number
  rudimentMastery: number
  dynamicsConsistency: number
  weeklyTrend: Array<{
    period: string
    accuracy: number
    consistency: number
    bpm: number
  }>
  skills: SkillRating[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const TODAY_GOAL_MINUTES = 90

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short' })
}

function num(payload: PracticeEvent['payload'], key: string): number | null {
  const value = payload?.[key]
  return typeof value === 'number' ? value : null
}

function quality(payload: PracticeEvent['payload']): string | null {
  const value = payload?.quality
  return typeof value === 'string' ? value : null
}

export function buildPracticeMetrics(events: PracticeEvent[]): PracticeMetrics {
  const sorted = [...events].sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
  const now = new Date()
  const todayKey = dateKey(now)

  const startsBySession = new Map<string, PracticeEvent>()
  let totalMinutes = 0
  const minutesByDay = new Map<string, number>()
  const activeDays = new Set<string>()

  let timingHitCount = 0
  let timingPerfectCount = 0
  const timingDeviations: number[] = []
  let bestBpm = 60

  let readingEvents = 0
  let dictationMistakes = 0
  let rudimentEvents = 0
  let stickEvents = 0
  let dynamicsEvents = 0

  for (const event of sorted) {
    const ts = new Date(event.timestamp)
    activeDays.add(dateKey(ts))

    if (event.moduleId === 'timing-analyzer' && event.type === 'hit') {
      timingHitCount += 1
      const q = quality(event.payload)
      if (q === 'perfect') timingPerfectCount += 1
      const deviationMs = num(event.payload, 'deviationMs')
      if (deviationMs !== null) timingDeviations.push(deviationMs)
    }

    if (event.moduleId === 'metronome' || event.moduleId === 'timing-analyzer') {
      const bpm = num(event.payload, 'bpm') ?? num(event.payload, 'tempo')
      if (bpm !== null) bestBpm = Math.max(bestBpm, Math.round(bpm))
    }

    if (event.moduleId === 'reading') readingEvents += 1
    if (event.moduleId === 'dictation' && event.type === 'mistake') dictationMistakes += 1
    if (event.moduleId === 'rudiments') rudimentEvents += 1
    if (event.moduleId === 'stick-control') stickEvents += 1
    if (event.moduleId === 'metronome' || event.moduleId === 'groove-library') dynamicsEvents += 1

    if (!event.sessionId) continue

    if (event.type === 'start') {
      startsBySession.set(event.sessionId, event)
      continue
    }

    if (event.type !== 'stop') continue
    const start = startsBySession.get(event.sessionId)
    if (!start) continue

    const startTs = +new Date(start.timestamp)
    const stopTs = +ts
    const durationMs = clamp(stopTs - startTs, 0, 3 * 60 * 60 * 1000)
    const durationMin = durationMs / 60000
    if (durationMin <= 0) continue

    totalMinutes += durationMin
    const key = dateKey(ts)
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + durationMin)
    startsBySession.delete(event.sessionId)
  }

  const todayCompletedMinutes = Math.round(minutesByDay.get(todayKey) ?? 0)

  let streakDays = 0
  for (let i = 0; i < 365; i += 1) {
    const key = dateKey(new Date(+now - i * DAY_MS))
    if (activeDays.has(key)) {
      streakDays += 1
    } else {
      break
    }
  }

  let weeklyMinutes = 0
  const weeklyTrend: PracticeMetrics['weeklyTrend'] = []
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(+now - i * DAY_MS)
    const key = dateKey(day)
    const dayEvents = sorted.filter((event) => dateKey(new Date(event.timestamp)) === key)
    const dayHits = dayEvents.filter((event) => event.moduleId === 'timing-analyzer' && event.type === 'hit')
    const perfect = dayHits.filter((event) => quality(event.payload) === 'perfect').length
    const hitCount = dayHits.length
    const mistakes = dayEvents.filter((event) => event.type === 'mistake').length
    const accuracy = hitCount ? Math.round((perfect / hitCount) * 100) : 0
    const consistency = hitCount ? clamp(100 - mistakes * 3, 0, 100) : 0
    const dayBpm = Math.round(
      dayEvents.reduce((max, event) => {
        const bpm = num(event.payload, 'bpm') ?? num(event.payload, 'tempo')
        return bpm === null ? max : Math.max(max, bpm)
      }, 0),
    )

    const minutes = minutesByDay.get(key) ?? 0
    weeklyMinutes += minutes
    weeklyTrend.push({
      period: dayLabel(day),
      accuracy,
      consistency,
      bpm: dayBpm,
    })
  }

  const weeklyProgressPercent = clamp(Math.round((weeklyMinutes / (TODAY_GOAL_MINUTES * 7)) * 100), 0, 100)
  const totalPracticeHours = Number((totalMinutes / 60).toFixed(1))

  const timingAccuracy = timingHitCount ? Math.round((timingPerfectCount / timingHitCount) * 100) : 0
  const meanDeviation =
    timingDeviations.length > 0
      ? timingDeviations.reduce((acc, value) => acc + Math.abs(value), 0) / timingDeviations.length
      : 0
  const coordination = clamp(100 - Math.round(meanDeviation), 0, 100)
  const reading = clamp(60 + Math.round(readingEvents / 3) - dictationMistakes * 2, 0, 100)
  const dynamics = clamp(55 + Math.round(dynamicsEvents / 4), 0, 100)
  const speed = clamp(40 + Math.round(bestBpm / 3), 0, 100)
  const overall = Math.round((timingAccuracy + coordination + reading + dynamics + speed) / 5)

  const skills: SkillRating[] = [
    { key: 'timing', label: 'Timing', value: timingAccuracy },
    { key: 'coordination', label: 'Coordination', value: coordination },
    { key: 'dynamics', label: 'Dynamics', value: dynamics },
    { key: 'reading', label: 'Reading', value: reading },
    { key: 'speed', label: 'Speed', value: speed },
    { key: 'overall', label: 'Overall', value: overall },
  ]

  return {
    todayGoalMinutes: TODAY_GOAL_MINUTES,
    todayCompletedMinutes,
    streakDays,
    weeklyProgressPercent,
    totalPracticeHours,
    timingAccuracy,
    bestBpm,
    recommendedExercise:
      dictationMistakes > 3
        ? 'Rhythm dictation correction loop @ 60 BPM'
        : meanDeviation > 12
          ? 'Singles timing lock @ 60 BPM for 8 minutes'
          : 'Paradiddle inversion @ 60 BPM for 10 minutes',
    practiceMinutes: Math.round(totalMinutes),
    rudimentMastery: clamp(45 + Math.round((rudimentEvents + stickEvents) / 5), 0, 100),
    dynamicsConsistency: dynamics,
    weeklyTrend,
    skills,
  }
}
