import { useMemo, useState } from 'react'
import type { PracticeEvent } from '../../core/types/drumming'
import { GlassCard } from '../../shared/components/GlassCard'
import { buildSessionReviews } from '../journal/sessionReview'
import { MAX_BACKUP_BYTES, mergePracticeBackup, parsePracticeBackup } from './backupLogic'
import type { PracticeBackup } from './backupLogic'
import { createPracticeBackup, downloadLocalFile, restorePracticeBackup, sessionCsv } from './backupService'

export function BackupPanel({ events, onRestored }: { events: PracticeEvent[]; onRestored: (backup: PracticeBackup) => void }) {
  const [sessionId, setSessionId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Downloads stay on your device. Backup files can contain private journal notes; store them securely.')
  const [preview, setPreview] = useState<{ backup: PracticeBackup; events: number; journal: number } | null>(null)
  const sessions = useMemo(() => buildSessionReviews(events), [events])
  const exportFile = async (kind: 'backup' | 'csv' | 'session') => {
    setBusy(true)
    try {
      const backup = await createPracticeBackup()
      if (kind === 'backup') {
        const raw = JSON.stringify(backup, null, 2)
        parsePracticeBackup(raw)
        downloadLocalFile('drummaster-practice-backup.json', raw, 'application/json')
      } else if (kind === 'csv') downloadLocalFile('drummaster-sessions.csv', sessionCsv(backup, sessionId), 'text/csv;charset=utf-8')
      else {
        if (!sessionId) throw new Error('Select a completed session first.')
        downloadLocalFile('drummaster-session.json', JSON.stringify({ app: 'DrumMaster AI Session', schema: 1, sessionId, events: backup.events.filter((event) => event.sessionId === sessionId), journal: backup.journal.filter((entry) => entry.sessionId === sessionId) }, null, 2), 'application/json')
      }
      setMessage('Download created. Session exports are reports; use the practice backup file for restoring.')
    } catch { setMessage('Export failed. Check available storage and backup size, then retry.') }
    finally { setBusy(false) }
  }
  const inspect = async (file: File) => {
    setBusy(true); setPreview(null)
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the 20 MB limit.')
      const incoming = parsePracticeBackup(await file.text())
      const current = await createPracticeBackup()
      const merged = mergePracticeBackup(current, incoming)
      setPreview({ backup: incoming, events: merged.events.length - current.events.length, journal: merged.journal.length - current.journal.length })
      setMessage('Backup validated. Review the additions below before confirming. No data has changed.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to read this backup.') }
    finally { setBusy(false) }
  }
  const restore = async () => {
    if (!preview) return
    setBusy(true)
    try {
      const backup = await restorePracticeBackup(preview.backup)
      onRestored(backup); setPreview(null)
      setMessage('Backup merged. Existing IDs were preserved; duplicates were not added.')
    } catch { setMessage('Restore failed. Storage may be unavailable or full. Keep your backup and retry.') }
    finally { setBusy(false) }
  }
  return <GlassCard layout={false} className="space-y-3">
    <h3 className="text-lg font-semibold">Session Export + Practice Backup</h3>
    <p className="text-xs text-zinc-400">Backup includes practice events and journal reflections, including test events. It does not include profile, preferences, saved exercises, playlists, personal-record caches, or audio/video. No server upload is used.</p>
    <label className="block text-sm">Export session<select aria-label="Export session" disabled={busy} value={sessionId} onChange={(event) => setSessionId(event.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-2"><option value="">All completed sessions (CSV)</option>{sessions.map((session) => <option key={session.id} value={session.id}>{new Date(session.started).toLocaleString()} / {session.module} / {session.minutes} min</option>)}</select></label>
    <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void exportFile('csv')} className="rounded border border-white/25 px-3 py-2 disabled:opacity-40">Export sessions CSV</button><button disabled={busy || !sessionId} onClick={() => void exportFile('session')} className="rounded border border-white/25 px-3 py-2 disabled:opacity-40">Export session JSON</button><button disabled={busy} onClick={() => void exportFile('backup')} className="rounded bg-cyan-700 px-3 py-2 disabled:opacity-40">Download practice backup</button></div>
    <label className="block rounded-lg border-2 border-cyan-200/60 bg-cyan-950/50 p-4 text-sm font-semibold text-cyan-100">Choose local backup (JSON, max 20 MB)<input aria-label="Choose local backup" disabled={busy} type="file" accept=".json,application/json" className="mt-3 block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-cyan-300 file:px-4 file:py-3 file:font-semibold file:text-slate-950 hover:file:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-200 disabled:opacity-40" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void inspect(file) }} /></label>
    {preview && <div className="rounded-lg border border-amber-300/40 bg-amber-300/10 p-3"><p>New events: {preview.events} / New reflections: {preview.journal}</p><p className="mt-1 text-xs text-zinc-300">Existing entries with matching IDs are kept unchanged. Restoring twice does not duplicate them. Saved exercises and settings are untouched.</p><div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => void restore()} className="rounded bg-amber-700 px-3 py-2 disabled:opacity-40">Confirm merge restore</button><button disabled={busy} onClick={() => { setPreview(null); setMessage('Restore cancelled. No data changed.') }} className="rounded border border-white/25 px-3 py-2">Cancel restore</button></div></div>}
    <p role="status" className="text-sm text-cyan-200">{message}</p><p className="text-xs text-zinc-400">CSV timing fields are blank when timing was not measured. Imports merge history only; they never replace existing entries.</p>
  </GlassCard>
}
