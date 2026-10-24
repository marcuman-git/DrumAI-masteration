import { describe, expect, it } from 'vitest'
import { buildGamificationSnapshot } from './gamification'
import type { PracticeEvent } from '../../types/drumming'

function event(input: Partial<PracticeEvent> & Pick<PracticeEvent, 'id' | 'timestamp' | 'moduleId' | 'type'>): PracticeEvent {
  return {
    sessionId: input.sessionId,
    payload: input.payload,
    ...input,
  }
}

describe('buildGamificationSnapshot', () => {
  it('returns zeroed progression for empty history', () => {
    const snapshot = buildGamificationSnapshot([], new Date('2026-10-24T12:00:00Z'))
    expect(snapshot.level).toBe(1)
    expect(snapshot.totalXp).toBe(0)
    expect(snapshot.todayXp).toBe(0)
    expect(snapshot.quests.every((quest) => !quest.completed)).toBe(true)
  })

  it('computes quests and xp from today events', () => {
    const events: PracticeEvent[] = [
      event({
        id: 'm-start',
        moduleId: 'metronome',
        type: 'start',
        sessionId: 'm1',
        timestamp: '2026-10-24T10:00:00.000Z',
      }),
      event({
        id: 'm-stop',
        moduleId: 'metronome',
        type: 'stop',
        sessionId: 'm1',
        timestamp: '2026-10-24T10:06:00.000Z',
      }),
      ...Array.from({ length: 20 }).map((_, index) =>
        event({
          id: `t-${index}`,
          moduleId: 'timing-analyzer',
          type: 'hit',
          timestamp: `2026-10-24T11:00:${`${index}`.padStart(2, '0')}.000Z`,
        }),
      ),
      event({
        id: 'r-start',
        moduleId: 'reading',
        type: 'start',
        sessionId: 'r1',
        timestamp: '2026-10-24T12:00:00.000Z',
      }),
      event({
        id: 'r-score',
        moduleId: 'reading',
        type: 'score',
        sessionId: 'r1',
        timestamp: '2026-10-24T12:03:00.000Z',
        payload: { completed: true },
      }),
      event({
        id: 'r-stop',
        moduleId: 'reading',
        type: 'stop',
        sessionId: 'r1',
        timestamp: '2026-10-24T12:03:20.000Z',
      }),
    ]

    const snapshot = buildGamificationSnapshot(events, new Date('2026-10-24T14:00:00Z'))

    expect(snapshot.todayXp).toBeGreaterThan(0)
    expect(snapshot.level).toBeGreaterThanOrEqual(1)
    expect(snapshot.quests.map((quest) => quest.completed)).toEqual([true, true, true])
  })
})
