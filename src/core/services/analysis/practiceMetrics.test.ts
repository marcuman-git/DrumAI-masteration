import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PracticeEvent } from '../../types/drumming'
import { buildPracticeMetrics } from './practiceMetrics'

function event(
  timestamp: string,
  moduleId: PracticeEvent['moduleId'],
  type: PracticeEvent['type'],
  payload?: PracticeEvent['payload'],
  sessionId?: string,
): PracticeEvent {
  return {
    id: crypto.randomUUID(),
    timestamp,
    moduleId,
    type,
    payload,
    sessionId,
  }
}

describe('buildPracticeMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-23T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('computes timing, sessions, best bpm and weekly trend from events', () => {
    const events: PracticeEvent[] = [
      event('2026-10-23T10:00:00.000Z', 'metronome', 'start', { bpm: 60 }, 's1'),
      event('2026-10-23T10:30:00.000Z', 'metronome', 'stop', { bpm: 120 }, 's1'),
      event('2026-10-23T11:00:00.000Z', 'timing-analyzer', 'hit', { quality: 'perfect', deviationMs: 2 }),
      event('2026-10-23T11:00:01.000Z', 'timing-analyzer', 'hit', { quality: 'late', deviationMs: 10 }),
      event('2026-10-23T11:00:02.000Z', 'timing-analyzer', 'hit', { quality: 'perfect', deviationMs: -1 }),
      event('2026-10-22T09:00:00.000Z', 'reading', 'score', { tempo: 60 }),
      event('2026-10-22T09:05:00.000Z', 'dictation', 'mistake', { selectedAnswer: 'A' }),
      event('2026-10-21T10:00:00.000Z', 'rudiments', 'score', { tempo: 60 }),
    ]

    const result = buildPracticeMetrics(events)

    expect(result.practiceMinutes).toBe(30)
    expect(result.totalPracticeHours).toBe(0.5)
    expect(result.bestBpm).toBe(120)
    expect(result.timingAccuracy).toBe(67)
    expect(result.weeklyTrend).toHaveLength(7)
    expect(result.todayCompletedMinutes).toBe(30)
    expect(result.streakDays).toBeGreaterThanOrEqual(3)
  })

  it('returns safe defaults when no events are present', () => {
    const result = buildPracticeMetrics([])

    expect(result.practiceMinutes).toBe(0)
    expect(result.totalPracticeHours).toBe(0)
    expect(result.bestBpm).toBe(60)
    expect(result.timingAccuracy).toBe(0)
    expect(result.weeklyTrend).toHaveLength(7)
  })
})
