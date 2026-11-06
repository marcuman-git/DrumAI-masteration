import { get, set } from 'idb-keyval'
import { withPracticeStorageLock } from '../../core/services/storage/practiceEvents'
export interface JournalEntry { id: string; sessionId: string; date: string; worked: string; improve: string; mood: string; effort: number; summary: string }
const KEY = 'drummaster-journal-v1'
export const JOURNAL_STORAGE_KEY = KEY
export async function loadJournal(): Promise<JournalEntry[]> {
  try { return (await get<JournalEntry[]>(KEY)) ?? [] } catch { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as JournalEntry[] }
}
export async function saveJournal(entries: JournalEntry[]): Promise<void> {
  await withPracticeStorageLock(async () => {
    let stored = false
    try { await set(KEY, entries); stored = true } catch { /* Local storage is the fallback. */ }
    try { localStorage.setItem(KEY, JSON.stringify(entries)) } catch {
      if (!stored) throw new Error('Journal storage is unavailable.')
      localStorage.removeItem(KEY)
    }
  })
}
