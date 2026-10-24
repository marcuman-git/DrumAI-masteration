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
  return now.toISOString().slice(0, 10)
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

function buildBlocks(context: AdaptiveSchedulerContext, previousDayCompletion: number): AdaptivePlanBlock[] {
  const targetMinutes = context.profile.dailyMinutes
  const weighted = context.report.focusWeights.length
    ? context.report.focusWeights
    : [
        { focus: 'timing' as SkillKey, percent: 30 },
        { focus: 'coordination' as SkillKey, percent: 25 },
        { focus: 'reading' as SkillKey, percent: 20 },
        { focus: 'dynamics' as SkillKey, percent: 25 },
      ]

  const trendHint =
    previousDayCompletion >= 80
      ? 'Yesterday completion was strong. Add slight intensity (+5% control target).'
      : previousDayCompletion <= 35
        ? 'Yesterday completion was low. Keep tempo conservative and focus on consistency.'
        : 'Maintain steady pace and aim for clean repetitions.'

  const blocks = weighted.map((item, index) => {
    const minutes = Math.max(5, Math.round((targetMinutes * item.percent) / 100))
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

function previousCompletionPercent(state: AdaptivePlanState, date: string): number {
  const keys = Object.keys(state.dailyByDate).filter((key) => key < date).sort()
  const last = keys.at(-1)
  if (!last) return 0
  return state.dailyByDate[last]?.completionPercent ?? 0
}

export function createAdaptiveDayPlan(context: AdaptiveSchedulerContext, date: string, previousDayCompletion: number): AdaptiveDayPlan {
  return recalc({
    date,
    targetMinutes: context.profile.dailyMinutes,
    completedMinutes: 0,
    completionPercent: 0,
    blocks: buildBlocks(context, previousDayCompletion),
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

  const prevCompletion = previousCompletionPercent(base, date)
  const day = createAdaptiveDayPlan(context, date, prevCompletion)
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
  const prevCompletion = previousCompletionPercent(state, date)
  const day = createAdaptiveDayPlan(context, date, prevCompletion)
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
