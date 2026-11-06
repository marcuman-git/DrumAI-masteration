import { describe, expect, it } from 'vitest'
import { csvCell, mergePracticeBackup, parsePracticeBackup } from './backupLogic'
import type { PracticeBackup } from './backupLogic'
const backup = (): PracticeBackup => ({ app: 'DrumMaster AI', schema: 1, createdAt: '2026-11-06T12:00:00Z', events: [{ id: 'e1', timestamp: '2026-11-06T12:00:00Z', moduleId: 'practice-pad', type: 'start', sessionId: 's1' }], journal: [{ id: 'j1', sessionId: '', date: '2026-11-06T12:00:00Z', worked: 'Even strokes', improve: 'Relax', mood: 'Focused', effort: 3, summary: 'General reflection' }] })
describe('backup validation and merge', () => {
  it('round-trips events and general reflections', () => {
    expect(parsePracticeBackup(JSON.stringify(backup()))).toEqual(backup())
  })
  it('rejects bad schemas, invalid payloads and duplicate IDs', () => {
    expect(() => parsePracticeBackup('{')).toThrow()
    expect(() => parsePracticeBackup(JSON.stringify({ ...backup(), schema: 2 }))).toThrow()
    expect(() => parsePracticeBackup(JSON.stringify({ ...backup(), events: [backup().events[0], backup().events[0]] }))).toThrow(/duplicate/)
    expect(() => parsePracticeBackup(JSON.stringify({ ...backup(), events: [{ ...backup().events[0], payload: { bad: [] } }] }))).toThrow()
  })
  it('merges new IDs but preserves existing entries on repeat restores', () => {
    const current = backup()
    const incoming = backup()
    incoming.events[0] = { ...incoming.events[0], payload: { changed: true } }
    incoming.events.push({ ...incoming.events[0], id: 'e2' })
    const merged = mergePracticeBackup(current, incoming)
    expect(merged.events).toHaveLength(2)
    expect(merged.events[0].payload).toBeUndefined()
    expect(mergePracticeBackup(merged, incoming).events).toHaveLength(2)
    expect(current.events).toHaveLength(1)
  })
  it('quotes CSV safely and prevents spreadsheet formulas', () => {
    expect(csvCell('=1+1')).toBe('"\'=1+1"')
    expect(csvCell('say "hello"')).toBe('"say ""hello"""')
    expect(csvCell(-8)).toBe('"-8"')
    expect(csvCell(null)).toBe('')
  })
})
