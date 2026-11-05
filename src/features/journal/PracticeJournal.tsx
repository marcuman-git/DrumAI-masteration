import { useEffect, useMemo, useState } from 'react'
import type { PracticeEvent } from '../../core/types/drumming'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'
import { buildSessionReviews } from './sessionReview'
import { loadJournal, saveJournal, type JournalEntry } from './journalStorage'
export function PracticeJournal({ events }: { events: PracticeEvent[] }) {
  const sessions = useMemo(() => buildSessionReviews(events), [events])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [sessionId, setSessionId] = useState('')
  const [worked, setWorked] = useState('')
  const [improve, setImprove] = useState('')
  const [mood, setMood] = useState('Focused')
  const [effort, setEffort] = useState(3)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  useEffect(() => { let active = true; void loadJournal().then((items) => { if (active) setEntries(items) }); return () => { active = false } }, [])
  async function save() {
    const session = sessions.find((item) => item.id === sessionId)
    const entry: JournalEntry = { id: crypto.randomUUID(), sessionId, date: new Date().toISOString(), worked: worked.trim(), improve: improve.trim(), mood, effort, summary: `${session ? `${session.module}: ${session.minutes} min. ` : ''}${mood}, effort ${effort}/5. Worked: ${worked.trim() || 'Not recorded'}. Next focus: ${improve.trim() || 'Maintain steady practice'}.` }
    try { const next = [entry, ...entries]; await saveJournal(next); setEntries(next); setWorked(''); setImprove(''); setStatus('Journal saved.') } catch { setStatus('Could not save. Please try again.') }
  }
  return <GlassCard className="space-y-3">
    <SectionHeader title="Session Review + Practice Journal" subtitle="Review completed sessions and save your reflections on this device." />
    <label className="block text-sm">Session<select aria-label="Review session" className="ml-2 rounded bg-zinc-900 p-2" value={sessionId} onChange={(event) => setSessionId(event.target.value)}><option value="">General reflection</option>{sessions.map((item) => <option key={item.id} value={item.id}>{new Date(item.started).toLocaleString()} · {item.module} · {item.minutes} min</option>)}</select></label>
    {sessions.filter((item) => item.id === sessionId).map((item) => <div key={item.id} className="rounded border border-white/10 p-3"><p>{item.module} · {item.minutes} min · {item.hits} measured timing hits</p><p>Accuracy: {item.accuracy === null ? 'Not measured' : `${item.accuracy}%`} · Left: {item.left ?? '-'} ms · Right: {item.right ?? '-'} ms</p><p className="text-cyan-200">Suggested drill: {item.drill}</p><p className="text-xs text-zinc-400">Hand labels follow the selected drill sequence; microphone input does not identify the physical hand.</p></div>)}
    {!sessions.length && <p className="text-sm text-zinc-400">Start and stop a practice module to create a session review.</p>}
    <div className="grid gap-3 md:grid-cols-2">{(['What worked today?', 'What needs improvement?'] as const).map((label, index) => <label key={label} className="text-sm">{label}<textarea className="mt-2 block min-h-28 w-full rounded-lg border-2 border-cyan-200/40 bg-zinc-800 p-3 text-zinc-50 shadow-inner placeholder:text-zinc-400 focus:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/30" placeholder={index ? 'What would you like to improve next?' : 'Write what went well today...'} maxLength={2000} value={index ? improve : worked} onChange={(event) => index ? setImprove(event.target.value) : setWorked(event.target.value)} /></label>)}</div>
    <div className="flex flex-wrap gap-3"><label>Feeling <select className="rounded bg-zinc-900 p-2" value={mood} onChange={(event) => setMood(event.target.value)}>{['Focused','Relaxed','Frustrated','Tired','Energized'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Effort {effort}/5 <input type="range" min={1} max={5} value={effort} onChange={(event) => setEffort(Number(event.target.value))} /></label><button className="rounded bg-cyan-300/20 p-2" disabled={!worked.trim() && !improve.trim()} onClick={() => void save()}>Save reflection</button></div>
    <p role="status">{status}</p>
    <input aria-label="Search journal" placeholder="Search journal" className="w-full rounded-lg border border-cyan-200/40 bg-zinc-800 p-3 text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/30" value={search} onChange={(event) => setSearch(event.target.value)} />
    {entries.filter((item) => item.summary.toLowerCase().includes(search.toLowerCase())).map((item) => <div key={item.id} className="rounded border border-white/10 p-3"><p className="text-xs text-zinc-400">{new Date(item.date).toLocaleString()} · Reflection summary</p><p className="whitespace-pre-wrap text-sm">{item.summary}</p></div>)}
  </GlassCard>
}
