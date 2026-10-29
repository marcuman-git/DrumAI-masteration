import type { PracticeEvent } from '../../types/drumming'
import { buildPracticeMetrics } from './practiceMetrics'

export interface PersonalProgressSnapshot {
  baselineReady: boolean
  baselineRequiredMinutes: number
  baselineRequiredDays: number
  baselineMinutesProgress: number
  baselineDaysProgress: number
  qualityScore: number
  cadenceScore: number
  focusScore: number
  momentumScore: number
  confidenceScore: number
  anomalyDetected: boolean
  anomalyReason: string
  bestCondition: string
  completionRatio: number
  activeDaysLast7: number
  nextMilestone: string
  weeklyPlan: string[]
}

const DAY_MS = 24 * 60 * 60 * 1000
export const BASELINE_REQUIRED_MINUTES = 180
export const BASELINE_REQUIRED_DAYS = 7

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function timeBucket(date: Date): 'Morning' | 'Afternoon' | 'Evening' | 'Night' {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Morning'
  if (hour >= 12 && hour < 17) return 'Afternoon'
  if (hour >= 17 && hour < 22) return 'Evening'
  return 'Night'
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
  const firstTimestamp = events.length
    ? Math.min(...events.map((event) => +new Date(event.timestamp)))
    : null
  const historyDays = firstTimestamp === null ? 0 : Math.max(1, Math.floor((+now - firstTimestamp) / DAY_MS) + 1)
  const baselineReady = metrics.practiceMinutes >= BASELINE_REQUIRED_MINUTES && historyDays >= BASELINE_REQUIRED_DAYS

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
  const confidenceScore = clamp(
    Math.round((Math.min(metrics.practiceMinutes, 360) / 360) * 60 + (Math.min(activeDaysLast7, 7) / 7) * 40),
    0,
    100,
  )

  const weeklyAccuracies = metrics.weeklyTrend.map((item) => item.accuracy)
  const recent = weeklyAccuracies.at(-1) ?? 0
  const baselineSlice = weeklyAccuracies.slice(-4, -1)
  const baselineAvg = baselineSlice.length
    ? baselineSlice.reduce((acc, value) => acc + value, 0) / baselineSlice.length
    : recent
  const anomalyDetected = baselineSlice.length >= 2 && recent + 15 < baselineAvg
  const anomalyReason = anomalyDetected
    ? `Recent accuracy dropped by ${Math.round(baselineAvg - recent)} points vs 3-day baseline. Schedule a lighter recovery block today.`
    : 'No major anomaly detected in the last training window.'

  const bucketStats = new Map<string, { total: number; perfect: number }>()
  for (const event of events) {
    if (event.moduleId !== 'timing-analyzer' || event.type !== 'hit') continue
    const bucket = timeBucket(new Date(event.timestamp))
    const stat = bucketStats.get(bucket) ?? { total: 0, perfect: 0 }
    stat.total += 1
    if (event.payload?.quality === 'perfect') stat.perfect += 1
    bucketStats.set(bucket, stat)
  }

  let bestCondition = 'Not enough timing-hit data to infer best practice window yet.'
  if (bucketStats.size) {
    const ranked = Array.from(bucketStats.entries())
      .map(([bucket, stat]) => ({
        bucket,
        accuracy: stat.total ? Math.round((stat.perfect / stat.total) * 100) : 0,
        samples: stat.total,
      }))
      .sort((a, b) => b.accuracy - a.accuracy || b.samples - a.samples)
    const top = ranked[0]
    bestCondition = `${top.bucket} sessions currently lead (${top.accuracy}% perfect timing over ${top.samples} hits).`
  }

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
    baselineReady,
    baselineRequiredMinutes: BASELINE_REQUIRED_MINUTES,
    baselineRequiredDays: BASELINE_REQUIRED_DAYS,
    baselineMinutesProgress: Math.min(metrics.practiceMinutes, BASELINE_REQUIRED_MINUTES),
    baselineDaysProgress: Math.min(historyDays, BASELINE_REQUIRED_DAYS),
    qualityScore,
    cadenceScore,
    focusScore,
    momentumScore,
    confidenceScore,
    anomalyDetected,
    anomalyReason,
    bestCondition,
    completionRatio: clamp(completionRatio, 0, 100),
    activeDaysLast7,
    nextMilestone,
    weeklyPlan,
  }
}
