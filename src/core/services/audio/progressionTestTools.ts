import type { PracticeEvent, TrainingModuleId } from '../../types/drumming'
import { appendPracticeEvents, listPracticeEvents, replacePracticeEvents } from '../storage/practiceEvents'

const TEST_TAG = 'v049-baseline-boost'
const DAY_MS = 24 * 60 * 60 * 1000

function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function event(
  moduleId: TrainingModuleId,
  type: PracticeEvent['type'],
  timestamp: string,
  sessionId?: string,
  payload?: PracticeEvent['payload'],
): PracticeEvent {
  return {
    id: crypto.randomUUID(),
    moduleId,
    type,
    timestamp,
    sessionId,
    payload: payload ?? { testTag: TEST_TAG },
  }
}

export async function injectBaselineBoost(days = 4): Promise<void> {
  const all = await listPracticeEvents(5000)
  const existingBoostDays = new Set(
    all
      .filter((item) => item.payload?.testTag === TEST_TAG)
      .map((item) => dateKey(new Date(item.timestamp))),
  )
  const dayOffsetBase = existingBoostDays.size
  const now = Date.now()
  const generated: PracticeEvent[] = []

  for (let day = days; day >= 1; day -= 1) {
    const offset = dayOffsetBase + day
    const base = new Date(now - offset * DAY_MS)
    base.setHours(18, 0, 0, 0)

    const sessionA = `boost-metronome-${offset}-${crypto.randomUUID().slice(0, 6)}`
    const startA = new Date(base)
    const stopA = new Date(base.getTime() + 28 * 60 * 1000)

    generated.push(
      event('metronome', 'start', startA.toISOString(), sessionA),
      event('metronome', 'score', new Date(startA.getTime() + 6 * 60 * 1000).toISOString(), sessionA, {
        testTag: TEST_TAG,
        bpm: 78 + ((offset % 9) + 1),
      }),
      event('metronome', 'stop', stopA.toISOString(), sessionA),
    )

    const sessionB = `boost-reading-${offset}-${crypto.randomUUID().slice(0, 6)}`
    const startB = new Date(base.getTime() + 35 * 60 * 1000)
    const stopB = new Date(base.getTime() + 60 * 60 * 1000)

    generated.push(
      event('reading', 'start', startB.toISOString(), sessionB),
      event('reading', 'score', new Date(startB.getTime() + 8 * 60 * 1000).toISOString(), sessionB, {
        testTag: TEST_TAG,
        completed: true,
      }),
      event('reading', 'stop', stopB.toISOString(), sessionB),
    )

    const hitBase = new Date(base.getTime() + 90 * 60 * 1000)
    for (let i = 0; i < 24; i += 1) {
      const hitTime = new Date(hitBase.getTime() + i * 650)
      const deviationMs = i % 2 === 0 ? -4 : 5
      generated.push(
        event('timing-analyzer', 'hit', hitTime.toISOString(), undefined, {
          testTag: TEST_TAG,
          quality: Math.abs(deviationMs) <= 5 ? 'perfect' : 'late',
          deviationMs,
          hand: i % 2 === 0 ? 'L' : 'R',
        }),
      )
    }
  }

  await appendPracticeEvents(generated)
}

export async function clearBaselineBoost(): Promise<void> {
  const all = await listPracticeEvents(5000)
  const filtered = all.filter((item) => item.payload?.testTag !== TEST_TAG)
  await replacePracticeEvents(filtered)
}
