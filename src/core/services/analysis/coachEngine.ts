import { consistencyFromHits } from './timingMetrics'
import type { PracticeEvent, SkillKey, TimingHit, TrainingModuleId } from '../../types/drumming'

const moduleLabel: Record<TrainingModuleId, string> = {
  dashboard: 'Dashboard',
  metronome: 'Smart Metronome',
  'timing-analyzer': 'Timing Analyzer',
  rudiments: 'Rudiment Trainer',
  'stick-control': 'Stick Control',
  reading: 'Rhythm Reading',
  dictation: 'Rhythm Dictation',
  independence: 'Independence Trainer',
  'groove-library': 'Groove Library',
  fills: 'Fill Generator',
  polyrhythm: 'Polyrhythm Trainer',
  'odd-time': 'Odd Time Trainer',
  dynamics: 'Dynamics Trainer',
  speed: 'Speed Trainer',
  'practice-pad': 'Practice Pad',
  'song-practice': 'Song Practice',
  coach: 'AI Coach',
  analytics: 'Analytics',
  community: 'Community',
}

export interface CoachSourceItem {
  moduleId: TrainingModuleId
  moduleLabel: string
  events: number
}

export interface CoachRecommendation {
  title: string
  text: string
  basedOn: string
}

export interface CoachReport {
  summary: string
  sourceSummary: CoachSourceItem[]
  focusWeights: Array<{ focus: SkillKey; percent: number }>
  recommendations: CoachRecommendation[]
  dailyPlan: string[]
  weeklyPlan: string[]
}

function percent(value: number, total: number): number {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

export function buildCoachReport(events: PracticeEvent[], hits: TimingHit[]): CoachReport {
  const sourceMap = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.moduleId] = (acc[event.moduleId] ?? 0) + 1
    return acc
  }, {})

  const sourceSummary = (Object.entries(sourceMap) as Array<[TrainingModuleId, number]>)
    .sort((a, b) => b[1] - a[1])
    .map(([moduleId, count]) => ({
      moduleId,
      moduleLabel: moduleLabel[moduleId],
      events: count,
    }))

  const mistakeCounts = events
    .filter((event) => event.type === 'mistake')
    .reduce<Record<string, number>>((acc, event) => {
      acc[event.moduleId] = (acc[event.moduleId] ?? 0) + 1
      return acc
    }, {})

  const dictationMistakes = mistakeCounts.dictation ?? 0
  const timingMistakes = mistakeCounts['timing-analyzer'] ?? 0
  const readingEvents = sourceMap.reading ?? 0
  const rudimentEvents = sourceMap.rudiments ?? 0
  const stickEvents = sourceMap['stick-control'] ?? 0

  const positiveHits = hits.filter((hit) => hit.quality !== 'missed')
  const averageDeviation =
    positiveHits.length > 0
      ? Math.round(positiveHits.reduce((acc, hit) => acc + hit.deviationMs, 0) / positiveHits.length)
      : 0
  const consistency = consistencyFromHits(positiveHits)

  const leftSamples = positiveHits.filter((_, index) => index % 2 === 0).map((hit) => hit.deviationMs)
  const rightSamples = positiveHits.filter((_, index) => index % 2 === 1).map((hit) => hit.deviationMs)
  const leftAvg = leftSamples.length
    ? Math.round(leftSamples.reduce((acc, value) => acc + value, 0) / leftSamples.length)
    : 0
  const rightAvg = rightSamples.length
    ? Math.round(rightSamples.reduce((acc, value) => acc + value, 0) / rightSamples.length)
    : 0
  const weakHandLag = Math.max(leftAvg, rightAvg)

  const timingWeight = Math.max(15, 45 - Math.round(consistency / 4))
  const weakHandWeight = Math.max(15, Math.min(35, 18 + Math.round(Math.abs(leftAvg - rightAvg) / 2)))
  const readingWeight = Math.max(10, Math.min(30, 26 - Math.round(readingEvents / 8)))
  const dynamicsWeight = 100 - timingWeight - weakHandWeight - readingWeight

  const focusWeights: Array<{ focus: SkillKey; percent: number }> = [
    { focus: 'timing', percent: timingWeight },
    { focus: 'coordination', percent: weakHandWeight },
    { focus: 'reading', percent: readingWeight },
    { focus: 'dynamics', percent: dynamicsWeight },
  ]

  const recommendations: CoachRecommendation[] = []

  if (positiveHits.length) {
    recommendations.push({
      title: 'Timing Stability Block',
      text: `Average deviation is ${averageDeviation}ms with ${consistency}% consistency. Run 8 minutes at 60-80 BPM in ${averageDeviation >= 0 ? 'laid-back' : 'ahead'} correction mode.`,
      basedOn: `Timing Analyzer hits (${positiveHits.length})`,
    })
  } else {
    recommendations.push({
      title: 'Timing Baseline Needed',
      text: 'No timing samples yet. Record a 3-minute Singles (L/R) drill in Timing Analyzer first.',
      basedOn: 'Timing Analyzer events missing',
    })
  }

  recommendations.push({
    title: 'Weak-Hand Equalization',
    text: `Left avg ${leftAvg}ms vs Right avg ${rightAvg}ms (max lag ${weakHandLag}ms). Run paradiddle inversion and slow doubles for 10 minutes at 60 BPM.`,
    basedOn: 'Timing Analyzer hand-sequenced hit deviations',
  })

  if (dictationMistakes > 0) {
    recommendations.push({
      title: 'Dictation Repair',
      text: `You logged ${dictationMistakes} dictation mistakes. Do 2 rounds of listen-confirm-next with tempo at 60 BPM, then increase by +5 BPM.`,
      basedOn: 'Rhythm Dictation mistake events',
    })
  }

  if (readingEvents < 20) {
    recommendations.push({
      title: 'Reading Volume Increase',
      text: 'Reading volume is low. Complete 3 reading loops (Basic, Syncopation, Triplet) with stop/replay control.',
      basedOn: `Rhythm Reading events (${readingEvents})`,
    })
  }

  if (rudimentEvents + stickEvents < 25) {
    recommendations.push({
      title: 'Technique Foundation Pass',
      text: 'Rudiment + Stick Control usage is low. Add a 12-minute block: 6 min rudiments + 6 min stick control.',
      basedOn: `Rudiment events (${rudimentEvents}) + Stick Control events (${stickEvents})`,
    })
  }

  const dailyPlan = [
    `${timingWeight}% Timing: 8 min calibrated Singles drill + 4 min metronome pocket hold.`,
    `${weakHandWeight}% Weak Hand/Coordination: 10 min paradiddle inversion at 60 BPM.`,
    `${readingWeight}% Reading: 8 min reading chart loop and clean stop/start reps.`,
    `${dynamicsWeight}% Dynamics: 6 min low-to-high accent ladders on practice pad.`,
  ]

  const weeklyPlan = [
    'Day 1-2: timing baseline and weak-hand balancing.',
    'Day 3-4: reading/dictation emphasis with confirm-and-correct loops.',
    'Day 5: groove transfer (metronome + groove library integration).',
    'Day 6: endurance block with rudiments + stick control.',
    'Day 7: performance check and analytics review.',
  ]

  const summary =
    sourceSummary.length > 0
      ? `Coach generated from ${events.length} events across ${sourceSummary.length} modules. Timing mistakes: ${timingMistakes}, Dictation mistakes: ${dictationMistakes}.`
      : 'No recorded practice events yet. Start with Timing Analyzer + Metronome sessions to generate a personalized plan.'

  return {
    summary,
    sourceSummary,
    focusWeights,
    recommendations: recommendations.slice(0, 5),
    dailyPlan,
    weeklyPlan,
  }
}

export function formatSourceSummary(items: CoachSourceItem[]): string {
  if (!items.length) return 'No recorded module events yet.'
  const totalEvents = items.reduce((acc, item) => acc + item.events, 0)
  return items
    .slice(0, 6)
    .map((item) => `${item.moduleLabel}: ${item.events} events (${percent(item.events, totalEvents)}%)`)
    .join(' | ')
}
