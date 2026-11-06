import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setMany } from 'idb-keyval'
import { createPracticeBackup, restorePracticeBackup, sessionCsv } from './backupService'
import { clearPracticeEvents, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { loadJournal, saveJournal } from '../journal/journalStorage'
import type { PracticeBackup } from './backupLogic'
const database = vi.hoisted(() => new Map<string, unknown>())
vi.mock('idb-keyval', () => ({ get: vi.fn(async (key: string) => database.get(key)), set: vi.fn(async (key: string, value: unknown) => { database.set(key, value) }), getMany: vi.fn(async (keys: string[]) => keys.map((key) => database.get(key))), setMany: vi.fn(async (pairs: [string, unknown][]) => { for (const [key, value] of pairs) database.set(key, value) }) }))
beforeEach(async () => { await clearPracticeEvents(); database.clear(); localStorage.clear() })
describe('local practice backup storage', () => {
  it('leaves history unchanged when the atomic database commit fails', async () => {
    await trackPracticeEvent('metronome', 'score', { bpm: 60 })
    const current = await createPracticeBackup()
    const incoming = { ...current, events: [{ ...current.events[0], id: 'new-event' }] }
    vi.mocked(setMany).mockRejectedValueOnce(new Error('Storage unavailable'))
    await expect(restorePracticeBackup(incoming)).rejects.toThrow()
    expect((await createPracticeBackup()).events).toEqual(current.events)
  })
  it('waits for pending hits and preserves reflected history on repeat restores', async () => {
    void trackPracticeEvent('practice-pad', 'start', {}, 'original')
    const current = await createPracticeBackup()
    expect(current.events).toHaveLength(1)
    const incoming: PracticeBackup = { ...current, events: [{ ...current.events[0], id: 'imported' }], journal: [{ id: 'j1', sessionId: '', date: current.createdAt, worked: 'Control', improve: '', mood: 'Focused', effort: 3, summary: 'Test' }] }
    const restored = await restorePracticeBackup(incoming)
    expect(restored.events).toHaveLength(2)
    expect(await loadJournal()).toHaveLength(1)
    expect((await restorePracticeBackup(incoming)).events).toHaveLength(2)
    await saveJournal(await loadJournal())
  })
  it('exports completed session duration without inventing timing accuracy', () => {
    const current: PracticeBackup = { app: 'DrumMaster AI', schema: 1, createdAt: '2026-11-06T12:00:00Z', journal: [], events: [
      { id: '1', sessionId: 's', moduleId: 'practice-pad', type: 'start', timestamp: '2026-11-06T12:00:00Z' },
      { id: '2', sessionId: 's', moduleId: 'practice-pad', type: 'stop', timestamp: '2026-11-06T12:01:00Z' },
    ] }
    expect(sessionCsv(current)).toContain('"practice-pad"')
    expect(sessionCsv(current)).toContain('"1","0",,,')
  })
})
