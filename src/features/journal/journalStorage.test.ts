import { describe, expect, it } from 'vitest'
import { loadJournal, saveJournal, type JournalEntry } from './journalStorage'
describe('journal persistence', () => {
  it('round trips reflections separately from practice events', async () => {
    const entry: JournalEntry = { id: 'one', sessionId: 'session', date: '2026-11-04T10:00:00Z', worked: 'Relaxed strokes', improve: 'Left hand', mood: 'Focused', effort: 3, summary: 'Focus on left hand.' }
    await saveJournal([entry])
    expect(await loadJournal()).toEqual([entry])
    await saveJournal([])
  })
})
