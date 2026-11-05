import { get, set } from 'idb-keyval'
export interface JournalEntry { id: string; sessionId: string; date: string; worked: string; improve: string; mood: string; effort: number; summary: string }
const KEY = 'drummaster-journal-v1'
export async function loadJournal(): Promise<JournalEntry[]> {
  try { return (await get<JournalEntry[]>(KEY)) ?? [] } catch { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as JournalEntry[] }
}
export async function saveJournal(entries: JournalEntry[]): Promise<void> {
  try { await set(KEY, entries) } catch { localStorage.setItem(KEY, JSON.stringify(entries)) }
}
