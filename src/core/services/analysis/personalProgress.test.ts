import { describe, expect, it } from 'vitest'
import type { PracticeEvent } from '../../types/drumming'
import { buildPersonalProgressSnapshot } from './personalProgress'

describe('buildPersonalProgressSnapshot', () => {
  it('returns baseline snapshot for empty history', () => {
    const snapshot = buildPersonalProgressSnapshot([], new Date('2026-10-24T12:00:00.000Z'))
    expect(snapshot.baselineReady).toBe(false)
    expect(snapshot.qualityScore).toBeGreaterThanOrEqual(0)
    expect(snapshot.cadenceScore).toBe(0)
    expect(snapshot.activeDaysLast7).toBe(0)
  })

  it('raises cadence and completion ratio with active sessions', () => {
    const events: PracticeEvent[] = [
      {
        id: '1',
        moduleId: 'metronome',
        type: 'start',
        sessionId: 's1',
        timestamp: '2026-10-23T10:00:00.000Z',
      },
      {
        id: '2',
        moduleId: 'metronome',
        type: 'stop',
        sessionId: 's1',
        timestamp: '2026-10-23T10:20:00.000Z',
      },
      {
        id: '3',
        moduleId: 'timing-analyzer',
        type: 'hit',
        timestamp: '2026-10-24T10:00:00.000Z',
        payload: { quality: 'perfect', deviationMs: 2 },
      },
    ]
    const snapshot = buildPersonalProgressSnapshot(events, new Date('2026-10-24T12:00:00.000Z'))
    expect(snapshot.baselineReady).toBe(false)
    expect(snapshot.activeDaysLast7).toBeGreaterThan(0)
    expect(snapshot.completionRatio).toBe(100)
  })
})
