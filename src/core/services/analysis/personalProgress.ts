import type { PracticeEvent } from '../../types/drumming'
import { buildPracticeMetrics } from './practiceMetrics'

export interface PersonalProgressSnapshot {
  qualityScore: number
  cadenceScore: number
  focusScore: number
  momentumScore: number
  completionRatio: number
  activeDaysLast7: number
  nextMilestone: string
  weeklyPlan: string[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildPersonalProgressSnapshot(events: PracticeEvent[], now = new Date()): PersonalProgressSnapshot {
  const metrics = buildPracticeMetrics(events)
  const starts = events.filter((event) => event.type === 'start').length
  const stops = events.filter((event) => event.type === 'stop').length
  const completionRatio = starts ? Math.round((stops / starts) * 100) : 0

  const last7Keys = Array.from({ length: 7 }).map((_, index) => dateKey(new Date(+now - index * DAY_MS)))
  const eventDaySet = new Set(events.map((event) => dateKey(new Date(event.timestamp))))
  const activeDaysLast7 = last7Keys.filter((key) => eventDaySet.has(key)).length
  const cadenceScore = Math.round((activeDaysLast7 / 7) * 100)

  const focusScore = metrics.moduleUsage.length ? metrics.moduleUsage[0].percent : 0
  const weekly = metrics.weeklyTrend
  const first = weekly[0] ?? { accuracy: 0, bpm: 0 }
  const last = weekly[weekly.length - 1] ?? { accuracy: 0, bpm: 0 }
  const accuracyDelta = last.accuracy - first.accuracy
  const bpmDelta = last.bpm - first.bpm
  const momentumScore = clamp(50 + accuracyDelta * 2 + bpmDelta, 0, 100)
  const qualityScore = clamp(
    Math.round((metrics.timingAccuracy * 0.45 + metrics.dynamicsConsistency * 0.25 + cadenceScore * 0.2 + completionRatio * 0.1)),
    0,
    100,
  )

  const nextMilestone =
    metrics.timingAccuracy < 90
      ? 'Reach 90% timing accuracy with 60 BPM control loops.'
      : metrics.bestBpm < 160
        ? 'Push max clean tempo to 160 BPM with +2 BPM ladders.'
        : 'Stabilize advanced consistency above 92% over 7 days.'

  const weeklyPlan = [
    `Day 1-2: Timing lock (10 min) + Reading pass (8 min).`,
    `Day 3-4: Coordination focus with rudiments/stick control (12 min).`,
    `Day 5: Groove transfer + fill control (10 min).`,
    `Day 6-7: Performance simulation + analytics review.`,
  ]

  return {
    qualityScore,
    cadenceScore,
    focusScore,
    momentumScore,
    completionRatio: clamp(completionRatio, 0, 100),
    activeDaysLast7,
    nextMilestone,
    weeklyPlan,
  }
}
