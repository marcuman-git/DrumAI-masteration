import { beforeEach, describe, expect, it } from 'vitest'
import { appendPracticeEvents, clearPracticeEvents, listPracticeEvents } from './practiceEvents'
import type { PracticeEvent } from '../../types/drumming'

beforeEach(async () => {
  await clearPracticeEvents()
})

describe('practiceEvents ordering', () => {
  it('keeps events ordered by timestamp when appending historical data', async () => {
    const now = Date.now()
    const recent: PracticeEvent = {
      id: crypto.randomUUID(),
      moduleId: 'metronome',
      type: 'start',
      timestamp: new Date(now).toISOString(),
    }
    const historical: PracticeEvent = {
      id: crypto.randomUUID(),
      moduleId: 'metronome',
      type: 'start',
      timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    }

    await appendPracticeEvents([recent])
    await appendPracticeEvents([historical])

    const events = await listPracticeEvents(10)
    expect(events.length).toBe(2)
    expect(+new Date(events[0].timestamp)).toBeLessThanOrEqual(+new Date(events[1].timestamp))
  })
})
