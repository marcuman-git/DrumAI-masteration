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
  trendDirection: 'Rising' | 'Stable' | 'Falling'
  recommendedMode: 'Build' | 'Stabilize' | 'Recover'
  anomalyDetected: boolean
  anomalyReason: string
  bestCondition: string
  completionRatio: number
  activeDaysLast7: number
  nextMilestone: string
  weeklyPlan: string[]
  todayFocus: string
  focusReason: string
  next15Minutes: Array<{ title: string; module: string; minutes: number; instruction: string }>
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
  const trendDelta = recent - baselineAvg
  const trendDirection: PersonalProgressSnapshot['trendDirection'] =
    trendDelta >= 6 ? 'Rising' : trendDelta <= -6 ? 'Falling' : 'Stable'
  const recommendedMode: PersonalProgressSnapshot['recommendedMode'] = anomalyDetected
    ? 'Recover'
    : trendDirection === 'Rising'
      ? 'Build'
      : 'Stabilize'

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

  const recentEvents = events.filter((event) => {
    const timestamp = +new Date(event.timestamp)
    return timestamp <= +now && timestamp >= +now - 7 * DAY_MS
  }).sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
  const recentHits = recentEvents.filter((event) => event.moduleId === 'timing-analyzer' && event.type === 'hit').slice(-100)
  const recentAnswers = recentEvents.filter((event) => event.moduleId === 'dictation' && event.type === 'score' && typeof event.payload?.isCorrect === 'boolean').slice(-10)
  const readingNeedsWork = recentAnswers.length >= 3 && recentAnswers.filter((event) => event.payload?.isCorrect === false).length / recentAnswers.length >= 0.4
  const timingNeedsWork = recentHits.length >= 12 && recentHits.filter((event) => event.payload?.quality === 'perfect').length / recentHits.length < 0.9
  const todayFocus = !baselineReady ? 'Build a reliable baseline' : timingNeedsWork ? 'Timing control' : readingNeedsWork ? 'Listening and rhythm recognition' : 'Transfer control into grooves'
  const focusReason = !baselineReady
    ? 'Starter guidance while collecting 7 days and 180 practice minutes.'
    : timingNeedsWork
      ? `Based on the latest ${recentHits.length} timing hits from the last 7 days; perfect-hit accuracy is below 90%.`
      : readingNeedsWork
        ? `Based on the latest ${recentAnswers.length} dictation answers from the last 7 days; at least 40% need correction.`
        : 'No measured timing or listening weakness crossed the focus threshold. Practice musical application at a comfortable tempo.'
  const next15Minutes: PersonalProgressSnapshot['next15Minutes'] = [
    { title: 'Warm up', module: 'Smart Metronome', minutes: 3, instruction: 'Play relaxed alternating singles at 60 BPM. Keep both hands even.' },
    { title: 'Focused drill', module: readingNeedsWork && baselineReady && !timingNeedsWork ? 'Rhythm Dictation' : 'Timing Analyzer', minutes: 8, instruction: readingNeedsWork && baselineReady && !timingNeedsWork ? 'Listen, confirm each answer, and replay any rhythm you missed.' : 'Use Singles (L/R) at 60 BPM. Prioritize clean attacks and compare hand deviations.' },
    { title: 'Musical transfer', module: 'Groove Library', minutes: 4, instruction: 'Preview a comfortable groove and play along. Keep timing steady without adding speed.' },
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
    trendDirection,
    recommendedMode,
    anomalyDetected,
    anomalyReason,
    bestCondition,
    completionRatio: clamp(completionRatio, 0, 100),
    activeDaysLast7,
    nextMilestone,
    weeklyPlan,
    todayFocus,
    focusReason,
    next15Minutes,
  }
}
