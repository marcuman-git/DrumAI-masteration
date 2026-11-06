import { getMany, setMany } from 'idb-keyval'
import { MAX_STORED_EVENTS, PRACTICE_EVENTS_FALLBACK_KEY, PRACTICE_EVENTS_KEY, readPracticeEventsSnapshot, withPracticeStorageLock } from '../../core/services/storage/practiceEvents'
import { JOURNAL_STORAGE_KEY, loadJournal } from '../journal/journalStorage'
import { buildSessionReviews } from '../journal/sessionReview'
import { csvCell, mergePracticeBackup } from './backupLogic'
import type { PracticeBackup } from './backupLogic'
async function snapshot(): Promise<PracticeBackup> {
  return { app: 'DrumMaster AI', schema: 1, createdAt: new Date().toISOString(), events: await readPracticeEventsSnapshot(), journal: await loadJournal() }
}
export function createPracticeBackup(): Promise<PracticeBackup> { return withPracticeStorageLock(snapshot) }
export function restorePracticeBackup(incoming: PracticeBackup): Promise<PracticeBackup> {
  return withPracticeStorageLock(async () => {
    const merged = mergePracticeBackup(await snapshot(), incoming)
    if (merged.events.length > MAX_STORED_EVENTS) throw new Error('History capacity exceeded.')
    const pairs: [string, unknown][] = [[PRACTICE_EVENTS_KEY, merged.events], [JOURNAL_STORAGE_KEY, merged.journal]]
    let databaseReadable = false
    try { await getMany([PRACTICE_EVENTS_KEY, JOURNAL_STORAGE_KEY]); databaseReadable = true } catch { /* Use local fallback only when IndexedDB is inaccessible. */ }
    if (databaseReadable) {
      // One IndexedDB transaction commits events and reflections together.
      await setMany(pairs)
      try {
        localStorage.setItem(PRACTICE_EVENTS_FALLBACK_KEY, JSON.stringify(merged.events))
        localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(merged.journal))
      } catch {
        localStorage.removeItem(PRACTICE_EVENTS_FALLBACK_KEY)
        localStorage.removeItem(JOURNAL_STORAGE_KEY)
      }
    } else {
      const keys = [PRACTICE_EVENTS_FALLBACK_KEY, JOURNAL_STORAGE_KEY]
      const previous = keys.map((key) => localStorage.getItem(key))
      try {
        localStorage.setItem(keys[0], JSON.stringify(merged.events))
        localStorage.setItem(keys[1], JSON.stringify(merged.journal))
      } catch {
        keys.forEach((key, index) => previous[index] === null ? localStorage.removeItem(key) : localStorage.setItem(key, previous[index]!))
        throw new Error('Storage is full or unavailable. Restore was not completed.')
      }
    }
    return merged
  })
}
export function sessionCsv(backup: PracticeBackup, sessionId = ''): string {
  const rows = buildSessionReviews(backup.events).filter((review) => !sessionId || review.id === sessionId)
  const headers = ['Session ID', 'Module', 'Started', 'Minutes', 'Timing hits', 'Timing accuracy %', 'Left deviation ms', 'Right deviation ms']
  return '\uFEFF' + [headers.map(csvCell).join(','), ...rows.map((row) => [row.id, row.module, row.started, row.minutes, row.hits, row.accuracy, row.left, row.right].map(csvCell).join(','))].join('\r\n')
}
export function downloadLocalFile(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
