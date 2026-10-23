import { describe, expect, it } from 'vitest'
import type { PracticeEvent, TimingHit } from '../../types/drumming'
import { buildCoachReport, formatSourceSummary } from './coachEngine'

const events: PracticeEvent[] = [
  {
    id: 'e1',
    timestamp: '2026-10-23T10:00:00.000Z',
    moduleId: 'timing-analyzer',
    type: 'hit',
    payload: { quality: 'perfect', deviationMs: 2 },
  },
  {
    id: 'e2',
    timestamp: '2026-10-23T10:00:01.000Z',
    moduleId: 'timing-analyzer',
    type: 'mistake',
    payload: { quality: 'late', deviationMs: 14 },
  },
  {
    id: 'e3',
    timestamp: '2026-10-23T10:02:00.000Z',
    moduleId: 'dictation',
    type: 'mistake',
    payload: { selectedAnswer: 'A', correctAnswer: 'B' },
  },
  {
    id: 'e4',
    timestamp: '2026-10-23T10:03:00.000Z',
    moduleId: 'reading',
    type: 'score',
    payload: { completed: true },
  },
]

const hits: TimingHit[] = [
  { id: 'h1', expectedAt: 0, actualAt: 2, deviationMs: 2, quality: 'perfect' },
  { id: 'h2', expectedAt: 500, actualAt: 516, deviationMs: 16, quality: 'late' },
  { id: 'h3', expectedAt: 1000, actualAt: 993, deviationMs: -7, quality: 'early' },
]

describe('coachEngine', () => {
  it('builds report from events and hits', () => {
    const report = buildCoachReport(events, hits)

    expect(report.summary).toMatch(/Coach generated from 4 events/)
    expect(report.sourceSummary.length).toBeGreaterThan(0)
    expect(report.recommendations.length).toBeGreaterThan(0)
    expect(report.dailyPlan).toHaveLength(4)
    expect(report.weeklyPlan).toHaveLength(5)
  })

  it('formats source summary with percentages', () => {
    const report = buildCoachReport(events, hits)
    const text = formatSourceSummary(report.sourceSummary)
    expect(text).toContain('events')
    expect(text).toContain('%')
  })
})
