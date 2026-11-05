import { describe, expect, it } from 'vitest'
import type { PracticeEvent } from '../../core/types/drumming'
import { buildSessionReviews } from './sessionReview'
describe('session reviews', () => {
  it('pairs sessions, calculates measured results, and ignores synthetic and incomplete sessions', () => {
    const events: PracticeEvent[] = [
      { id: '1', sessionId: 'a', moduleId: 'timing-analyzer', type: 'start', timestamp: '2026-11-04T10:00:00Z' },
      { id: '2', sessionId: 'a', moduleId: 'timing-analyzer', type: 'hit', timestamp: '2026-11-04T10:00:01Z', payload: { quality: 'perfect', deviationMs: 2, hand: 'L' } },
      { id: '3', sessionId: 'a', moduleId: 'timing-analyzer', type: 'hit', timestamp: '2026-11-04T10:00:02Z', payload: { quality: 'late', deviationMs: 10, hand: 'R' } },
      { id: '4', sessionId: 'a', moduleId: 'timing-analyzer', type: 'stop', timestamp: '2026-11-04T10:05:00Z' },
      { id: '5', sessionId: 'b', moduleId: 'reading', type: 'start', timestamp: '2026-11-04T10:06:00Z' },
      { id: '6', sessionId: 'test', moduleId: 'reading', type: 'start', timestamp: '2026-11-04T10:07:00Z', payload: { testTag: 'boost' } },
      { id: '7', sessionId: 'test', moduleId: 'reading', type: 'stop', timestamp: '2026-11-04T10:08:00Z', payload: { testTag: 'boost' } },
    ]
    const result = buildSessionReviews(events.reverse())
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ minutes: 5, hits: 2, accuracy: 50, left: 2, right: 10 })
  })
})
