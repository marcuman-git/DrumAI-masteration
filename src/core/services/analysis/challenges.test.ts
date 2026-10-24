import { describe, expect, it } from 'vitest'
import type { PracticeEvent } from '../../types/drumming'
import { buildChallengesSnapshot } from './challenges'

function makeEvent(input: PracticeEvent): PracticeEvent {
  return input
}

describe('buildChallengesSnapshot', () => {
  it('returns pending challenges with no events', () => {
    const snapshot = buildChallengesSnapshot([], new Date('2026-10-24T12:00:00.000Z'))
    expect(snapshot.weeklyChallenges.every((challenge) => !challenge.completed)).toBe(true)
    expect(snapshot.achievements.some((achievement) => achievement.unlocked)).toBe(false)
  })

  it('unlocks first practice and updates challenge progress', () => {
    const events: PracticeEvent[] = [
      makeEvent({
        id: 's1',
        moduleId: 'metronome',
        type: 'start',
        sessionId: 'a',
        timestamp: '2026-10-22T10:00:00.000Z',
      }),
      makeEvent({
        id: 's2',
        moduleId: 'metronome',
        type: 'stop',
        sessionId: 'a',
        timestamp: '2026-10-22T11:00:00.000Z',
      }),
      ...Array.from({ length: 50 }).map((_, index) =>
        makeEvent({
          id: `hit-${index}`,
          moduleId: 'timing-analyzer',
          type: 'hit',
          timestamp: `2026-10-24T09:00:${`${index % 60}`.padStart(2, '0')}.000Z`,
        }),
      ),
    ]

    const snapshot = buildChallengesSnapshot(events, new Date('2026-10-24T12:00:00.000Z'))
    expect(snapshot.achievements.find((achievement) => achievement.id === 'first-practice')?.unlocked).toBe(true)
    expect(snapshot.seasonalChallenges.find((challenge) => challenge.id === 'season-timing')?.progress).toBe(50)
  })
})
