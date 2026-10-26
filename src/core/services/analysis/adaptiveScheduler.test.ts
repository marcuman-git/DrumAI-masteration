import { describe, expect, it } from 'vitest'
import { buildCoachReport } from './coachEngine'
import { buildPracticeMetrics } from './practiceMetrics'
import {
  clearPlanCompletions,
  ensureTodayPlan,
  rebuildTodayPlan,
  togglePlanBlock,
  todayKey,
} from './adaptiveScheduler'
import type { PracticeEvent, UserProfile } from '../../types/drumming'

const profile: UserProfile = {
  id: 'u1',
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
  experienceLevel: 'Intermediate',
  styles: ['Rock'],
  goals: ['Improve timing'],
  dailyMinutes: 40,
  drumSetup: 'Practice Pad',
  hasMidiDevice: false,
}

const events: PracticeEvent[] = [
  {
    id: 'e1',
    timestamp: '2026-10-24T10:00:00.000Z',
    moduleId: 'timing-analyzer',
    type: 'hit',
    payload: { quality: 'perfect', deviationMs: 2 },
  },
  {
    id: 'e2',
    timestamp: '2026-10-24T10:00:10.000Z',
    moduleId: 'timing-analyzer',
    type: 'mistake',
    payload: { quality: 'late', deviationMs: 11 },
  },
]

describe('adaptiveScheduler', () => {
  it('creates today plan and supports toggle + reset', () => {
    const metrics = buildPracticeMetrics(events)
    const report = buildCoachReport(events, [])
    const date = todayKey(new Date('2026-10-24T12:00:00.000Z'))

    const created = ensureTodayPlan(null, { profile, metrics, report }, date)
    const today = created.dailyByDate[date]
    expect(today).toBeDefined()
    expect(today.blocks.length).toBeGreaterThan(0)

    const toggled = togglePlanBlock(created, date, today.blocks[0].id)
    expect(toggled.dailyByDate[date].completedMinutes).toBeGreaterThan(0)

    const cleared = clearPlanCompletions(toggled, date)
    expect(cleared.dailyByDate[date].completedMinutes).toBe(0)
  })

  it('rebuilds today plan from context', () => {
    const metrics = buildPracticeMetrics(events)
    const report = buildCoachReport(events, [])
    const date = todayKey(new Date('2026-10-24T12:00:00.000Z'))
    const first = ensureTodayPlan(null, { profile, metrics, report }, date)
    const rebuilt = rebuildTodayPlan(first, { profile, metrics, report }, date)
    expect(rebuilt.dailyByDate[date].targetMinutes).toBeGreaterThanOrEqual(Math.round(profile.dailyMinutes * 0.75))
    expect(rebuilt.dailyByDate[date].targetMinutes).toBeLessThanOrEqual(Math.round(profile.dailyMinutes * 1.2))
  })
})
