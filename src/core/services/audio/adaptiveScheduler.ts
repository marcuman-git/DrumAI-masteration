import type { CoachReport } from './coachEngine'
import type { PracticeMetrics } from './practiceMetrics'
import type { SkillKey, UserProfile } from '../../types/drumming'

export interface AdaptivePlanBlock {
  id: string
  focus: SkillKey
  title: string
  moduleHint: string
  minutes: number
  completed: boolean
  note: string
}

export interface AdaptiveDayPlan {
  date: string
  targetMinutes: number
  completedMinutes: number
  completionPercent: number
  blocks: AdaptivePlanBlock[]
}

export interface AdaptivePlanState {
  updatedAt: string
  weeklyPlan: string[]
  dailyByDate: Record<string, AdaptiveDayPlan>
}

export interface AdaptiveSchedulerContext {
  profile: UserProfile
  metrics: PracticeMetrics
  report: CoachReport
}

const focusLabel: Record<SkillKey, string> = {
  timing: 'Timing',
  coordination: 'Coordination',
  dynamics: 'Dynamics',
  reading: 'Reading',
  speed: 'Speed',
  overall: 'Overall',
}

const moduleHintByFocus: Record<SkillKey, string> = {
  timing: 'Timing Analyzer + Metronome',
  coordination: 'Rudiment Trainer + Stick Control',
  dynamics: 'Practice Pad + Groove Library',
  reading: 'Rhythm Reading + Dictation',
  speed: 'Stick Control + Practice Pad',
  overall: 'Dashboard + AI Coach',
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function todayKey(now = new Date()): string {
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function recalc(day: AdaptiveDayPlan): AdaptiveDayPlan {
  const completedMinutes = day.blocks.filter((block) => block.completed).reduce((acc, block) => acc + block.minutes, 0)
  const completionPercent = day.targetMinutes ? Math.round((completedMinutes / day.targetMinutes) * 100) : 0
  return {
    ...day,
    completedMinutes,
    completionPercent: clamp(completionPercent, 0, 100),
  }
}

interface DayAdjustments {
  targetMinutes: number
  fatigueMode: boolean
  carryoverByFocus: Partial<Record<SkillKey, number>>
}

function buildDayAdjustments(
  context: AdaptiveSchedulerContext,
  previousDayCompletion: number,
  previousDay: AdaptiveDayPlan | null,
): DayAdjustments {
  const baseTarget = context.profile.dailyMinutes
  const recentConsistency = context.metrics.weeklyTrend.slice(-3).map((item) => item.consistency)
  const avgRecentConsistency = recentConsistency.length
    ? recentConsistency.reduce((acc, value) => acc + value, 0) / recentConsistency.length
    : 0
  const fatigueMode = avgRecentConsistency > 0 && avgRecentConsistency < 45

  let scaledTarget = baseTarget
  if (fatigueMode) {
    scaledTarget = Math.round(baseTarget * 0.85)
  } else if (previousDayCompletion >= 85) {
    scaledTarget = Math.round(baseTarget * 1.05)
  } else if (previousDayCompletion <= 35) {
    scaledTarget = Math.round(baseTarget * 0.9)
  }

  const carryoverByFocus: Partial<Record<SkillKey, number>> = {}
  if (previousDay) {
    const missed = previousDay.blocks.filter((block) => !block.completed)
    const missedTotal = missed.reduce((acc, block) => acc + block.minutes, 0)
    const carryoverTotal = Math.min(Math.round(missedTotal * 0.4), Math.round(baseTarget * 0.25))

    if (carryoverTotal > 0 && missedTotal > 0) {
      missed.forEach((block) => {
        const share = Math.round((block.minutes / missedTotal) * carryoverTotal)
        carryoverByFocus[block.focus] = (carryoverByFocus[block.focus] ?? 0) + share
      })
    }
  }

  return {
    targetMinutes: clamp(scaledTarget, Math.max(15, Math.round(baseTarget * 0.75)), Math.round(baseTarget * 1.2)),
    fatigueMode,
    carryoverByFocus,
  }
}

function buildBlocks(
  context: AdaptiveSchedulerContext,
  previousDayCompletion: number,
  previousDay: AdaptiveDayPlan | null,
): AdaptivePlanBlock[] {
  const adjustments = buildDayAdjustments(context, previousDayCompletion, previousDay)
  const targetMinutes = adjustments.targetMinutes
  const weighted = context.report.focusWeights.length
    ? context.report.focusWeights
    : [
        { focus: 'timing' as SkillKey, percent: 30 },
        { focus: 'coordination' as SkillKey, percent: 25 },
        { focus: 'reading' as SkillKey, percent: 20 },
        { focus: 'dynamics' as SkillKey, percent: 25 },
      ]

  const trendHint = adjustments.fatigueMode
    ? 'Fatigue-aware day active. Lower intensity and prioritize clean timing.'
    : previousDayCompletion >= 80
      ? 'Yesterday completion was strong. Add slight intensity (+5% control target).'
      : previousDayCompletion <= 35
        ? 'Yesterday completion was low. Keep tempo conservative and focus on consistency.'
        : 'Maintain steady pace and aim for clean repetitions.'

  const blocks = weighted.map((item, index) => {
    const baseMinutes = Math.max(5, Math.round((targetMinutes * item.percent) / 100))
    const carryover = adjustments.carryoverByFocus[item.focus] ?? 0
    const minutes = baseMinutes + carryover
    return {
      id: `${item.focus}-${index}`,
      focus: item.focus,
      title: `${focusLabel[item.focus]} Block`,
      moduleHint: moduleHintByFocus[item.focus],
      minutes,
      completed: false,
      note: trendHint,
    }
  })

  const total = blocks.reduce((acc, block) => acc + block.minutes, 0)
  const delta = targetMinutes - total
  if (blocks.length && delta !== 0) {
    blocks[0] = { ...blocks[0], minutes: Math.max(5, blocks[0].minutes + delta) }
  }

  return blocks
}

function previousDayKey(state: AdaptivePlanState, date: string): string | null {
  const keys = Object.keys(state.dailyByDate).filter((key) => key < date).sort()
  return keys.at(-1) ?? null
}

function previousCompletionPercent(state: AdaptivePlanState, date: string): number {
  const last = previousDayKey(state, date)
  if (!last) return 0
  return state.dailyByDate[last]?.completionPercent ?? 0
}

export function createAdaptiveDayPlan(context: AdaptiveSchedulerContext, date: string, previousDayCompletion: number): AdaptiveDayPlan {
  return createAdaptiveDayPlanWithHistory(context, date, previousDayCompletion, null)
}

function createAdaptiveDayPlanWithHistory(
  context: AdaptiveSchedulerContext,
  date: string,
  previousDayCompletion: number,
  previousDay: AdaptiveDayPlan | null,
): AdaptiveDayPlan {
  const targetMinutes = buildDayAdjustments(context, previousDayCompletion, previousDay).targetMinutes
  return recalc({
    date,
    targetMinutes,
    completedMinutes: 0,
    completionPercent: 0,
    blocks: buildBlocks(context, previousDayCompletion, previousDay),
  })
}

export function ensureTodayPlan(
  state: AdaptivePlanState | null,
  context: AdaptiveSchedulerContext,
  date = todayKey(),
): AdaptivePlanState {
  const base: AdaptivePlanState = state ?? {
    updatedAt: new Date().toISOString(),
    weeklyPlan: context.report.weeklyPlan,
    dailyByDate: {},
  }

  if (base.dailyByDate[date]) {
    return {
      ...base,
      weeklyPlan: context.report.weeklyPlan,
      updatedAt: new Date().toISOString(),
    }
  }

  const prevKey = previousDayKey(base, date)
  const prevCompletion = previousCompletionPercent(base, date)
  const prevDay = prevKey ? base.dailyByDate[prevKey] : null
  const day = createAdaptiveDayPlanWithHistory(context, date, prevCompletion, prevDay)
  return {
    ...base,
    weeklyPlan: context.report.weeklyPlan,
    updatedAt: new Date().toISOString(),
    dailyByDate: {
      ...base.dailyByDate,
      [date]: day,
    },
  }
}

export function rebuildTodayPlan(state: AdaptivePlanState, context: AdaptiveSchedulerContext, date = todayKey()): AdaptivePlanState {
  const prevKey = previousDayKey(state, date)
  const prevCompletion = previousCompletionPercent(state, date)
  const prevDay = prevKey ? state.dailyByDate[prevKey] : null
  const day = createAdaptiveDayPlanWithHistory(context, date, prevCompletion, prevDay)
  return {
    ...state,
    updatedAt: new Date().toISOString(),
    weeklyPlan: context.report.weeklyPlan,
    dailyByDate: {
      ...state.dailyByDate,
      [date]: day,
    },
  }
}

export function togglePlanBlock(state: AdaptivePlanState, date: string, blockId: string): AdaptivePlanState {
  const day = state.dailyByDate[date]
  if (!day) return state

  const next = {
    ...day,
    blocks: day.blocks.map((block) =>
      block.id === blockId
        ? {
            ...block,
            completed: !block.completed,
          }
        : block,
    ),
  }

  return {
    ...state,
    updatedAt: new Date().toISOString(),
    dailyByDate: {
      ...state.dailyByDate,
      [date]: recalc(next),
    },
  }
}

export function clearPlanCompletions(state: AdaptivePlanState, date: string): AdaptivePlanState {
  const day = state.dailyByDate[date]
  if (!day) return state
  return {
    ...state,
    updatedAt: new Date().toISOString(),
    dailyByDate: {
      ...state.dailyByDate,
      [date]: recalc({
        ...day,
        blocks: day.blocks.map((block) => ({ ...block, completed: false })),
      }),
    },
  }
}
