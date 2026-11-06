import type { PracticeEvent, TrainingModuleId } from '../../core/types/drumming'
import type { JournalEntry } from '../journal/journalStorage'
export interface PracticeBackup { app: 'DrumMaster AI'; schema: 1; createdAt: string; events: PracticeEvent[]; journal: JournalEntry[] }
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024
const MODULE_IDS: TrainingModuleId[] = ['dashboard', 'metronome', 'practice-pad', 'timing-analyzer', 'rudiments', 'stick-control', 'reading', 'dictation', 'independence', 'groove-library', 'fills', 'polyrhythm', 'odd-time', 'dynamics', 'speed', 'song-practice', 'coach', 'analytics', 'community']
const text = (value: unknown, max = 20000): value is string => typeof value === 'string' && value.length <= max
const date = (value: unknown) => text(value, 40) && Number.isFinite(Date.parse(value))
function validEvent(value: unknown): value is PracticeEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as PracticeEvent
  if (!text(event.id, 120) || !event.id || !date(event.timestamp) || !MODULE_IDS.includes(event.moduleId) || !['start', 'hit', 'mistake', 'stop', 'score'].includes(event.type)) return false
  if (event.sessionId !== undefined && (!text(event.sessionId, 120) || !event.sessionId)) return false
  return event.payload === undefined || (event.payload !== null && typeof event.payload === 'object' && !Array.isArray(event.payload) && Object.entries(event.payload).every(([key, item]) => text(key, 100) && (item === null || typeof item === 'boolean' || text(item) || typeof item === 'number' && Number.isFinite(item))))
}
function validJournal(value: unknown): value is JournalEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as JournalEntry
  return text(entry.id, 120) && !!entry.id && text(entry.sessionId, 120) && date(entry.date)
    && text(entry.worked) && text(entry.improve) && text(entry.mood, 80) && text(entry.summary)
    && Number.isInteger(entry.effort) && entry.effort >= 1 && entry.effort <= 5
}
export function parsePracticeBackup(raw: string): PracticeBackup {
  if (new Blob([raw]).size > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the 20 MB limit.')
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new Error('This file is not valid JSON.') }
  if (!value || typeof value !== 'object') throw new Error('Invalid practice backup.')
  const backup = value as PracticeBackup
  if (backup.app !== 'DrumMaster AI' || backup.schema !== 1 || !date(backup.createdAt)) throw new Error('Unsupported backup format or schema.')
  if (!Array.isArray(backup.events) || backup.events.length > 50000 || !backup.events.every(validEvent)) throw new Error('Invalid practice events in backup.')
  if (!Array.isArray(backup.journal) || backup.journal.length > 10000 || !backup.journal.every(validJournal)) throw new Error('Invalid journal entries in backup.')
  if (new Set(backup.events.map((event) => event.id)).size !== backup.events.length || new Set(backup.journal.map((entry) => entry.id)).size !== backup.journal.length) throw new Error('Backup contains duplicate IDs.')
  return backup
}
export function mergePracticeBackup(current: PracticeBackup, incoming: PracticeBackup): PracticeBackup {
  const events = new Map(current.events.map((event) => [event.id, event]))
  const journal = new Map(current.journal.map((entry) => [entry.id, entry]))
  for (const event of incoming.events) if (!events.has(event.id)) events.set(event.id, event)
  for (const entry of incoming.journal) if (!journal.has(entry.id)) journal.set(entry.id, entry)
  if (events.size > 50000 || journal.size > 10000) throw new Error('Merge exceeds the supported history limit. Existing data was not changed.')
  return { ...current, createdAt: new Date().toISOString(), events: [...events.values()].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)), journal: [...journal.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)) }
}
export function csvCell(value: string | number | null): string {
  if (value === null) return ''
  const raw = String(value)
  const safe = typeof value === 'string' && /^[=+\-@\t\r\n]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replaceAll('"', '""')}"`
}
