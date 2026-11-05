import { useEffect, useMemo, useRef, useState } from 'react'
import { startPracticeSession, stopPracticeSession } from '../../core/services/storage/practiceEvents'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'
import { leadPattern, strokeVolume, loadStickings, type Accent, type Dynamic, type SavedSticking } from './stickControlLogic'
const levels = { Beginner: 4, Intermediate: 8, Advanced: 12, Expert: 16 }
const accents: Accent[] = ['None', 'First Stroke', 'Every Fourth', 'Right Hand', 'Left Hand']
const dynamics: Dynamic[] = ['Soft', 'Medium', 'Loud', 'Crescendo']
export function StickControlView() {
  const [difficulty, setDifficulty] = useState<keyof typeof levels>('Intermediate')
  const [patterns, setPatterns] = useState(['RLRL', 'RRLL', 'RLLR', 'RLRR', 'LLRL'])
  const [selected, setSelected] = useState(0)
  const [lead, setLead] = useState<'R' | 'L'>('R')
  const [accent, setAccent] = useState<Accent>('None')
  const [dynamic, setDynamic] = useState<Dynamic>('Medium')
  const [tempo, setTempo] = useState(60)
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(-1)
  const [saved, setSaved] = useState(loadStickings)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')
  const pattern = useMemo(() => leadPattern(patterns[selected] ?? 'RLRL', lead), [patterns, selected, lead])
  const config = useRef({ pattern, accent, dynamic, tempo })
  config.current = { pattern, accent, dynamic, tempo }
  const timer = useRef<number | null>(null)
  const context = useRef<AudioContext | null>(null)
  const session = useRef<string | null>(null)
  const running = useRef(false)
  const generation = useRef(0)
  function stop() {
    generation.current += 1
    running.current = false
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    if (session.current) stopPracticeSession('stick-control', session.current, { tempo: config.current.tempo, pattern: config.current.pattern })
    session.current = null
    setPlaying(false); setActive(-1)
  }
  useEffect(() => () => {
    running.current = false; generation.current += 1
    if (timer.current !== null) window.clearTimeout(timer.current)
    if (session.current) stopPracticeSession('stick-control', session.current, { reason: 'unmount' })
    void context.current?.close()
  }, [])
  async function play() {
    if (running.current) return
    running.current = true; setPlaying(true)
    const token = ++generation.current
    try {
      context.current ??= new AudioContext()
      await context.current.resume()
      if (!running.current || token !== generation.current) return
      session.current = startPracticeSession('stick-control', { pattern, tempo, lead, accent, dynamic })
      let step = 0
      const tick = () => {
        if (!running.current || !context.current) return
        const cfg = config.current
        const index = step % cfg.pattern.length
        setActive(index)
        const now = context.current.currentTime
        const osc = context.current.createOscillator(); const gain = context.current.createGain()
        osc.type = 'sine'; osc.frequency.value = 980
        gain.gain.setValueAtTime(strokeVolume(cfg.pattern, index, cfg.accent, cfg.dynamic), now)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045)
        osc.connect(gain); gain.connect(context.current.destination)
        osc.start(now); osc.stop(now + 0.05)
        step += 1
        timer.current = window.setTimeout(tick, 60000 / cfg.tempo)
      }
      tick()
    } catch { stop(); setStatus('Audio could not start. Please try Play again.') }
  }
  function regenerate() {
    stop(); setSelected(0)
    setPatterns(Array.from({ length: 8 }, () => Array.from({ length: levels[difficulty] }, () => Math.random() < 0.5 ? 'R' : 'L').join('')))
  }
  function persist(next: SavedSticking[]) {
    try { localStorage.setItem('drummaster-stickings-v1', JSON.stringify(next)); setSaved(next); setStatus('Saved exercises updated.') } catch { setStatus('Could not save: device storage is unavailable or full.') }
  }
  function load(item: SavedSticking) {
    stop(); setPatterns([item.pattern]); setSelected(0); setLead(item.lead); setAccent(item.accent); setDynamic(item.dynamic); setTempo(item.tempo)
  }
  return <div className="space-y-4">
    <SectionHeader title="Stick Control Trainer" subtitle="Choose sticking, lead hand, accents, and dynamics. Playback loops until Stop." />
    <div className="grid gap-3 lg:grid-cols-[1.8fr_1fr]">
      <GlassCard className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">{patterns.map((item, index) => <button key={index} type="button" aria-pressed={index === selected} onClick={() => { stop(); setSelected(index) }} className={`rounded-lg border p-3 font-mono text-xl ${selected === index ? 'border-cyan-300 bg-cyan-300/15' : 'border-white/20 bg-white/5'}`}>{leadPattern(item, lead)}</button>)}</div>
        <div className="flex flex-wrap gap-2" aria-label="Active sticking">{pattern.split('').map((hand, index) => <span key={index} className={`rounded p-2 text-2xl ${active === index ? 'bg-cyan-200 text-zinc-950' : 'bg-white/5'}`}>{hand}{strokeVolume(pattern, index, accent, dynamic) > strokeVolume(pattern, index, 'None', dynamic) ? '>' : ''}</span>)}</div>
        <label className="block">Tempo {tempo} BPM<input aria-label="Tempo" className="block w-full accent-cyan-400" type="range" min={40} max={240} value={tempo} onChange={(event) => setTempo(Number(event.target.value))} /></label>
        <div className="flex gap-2"><button type="button" disabled={playing} onClick={() => void play()} className="rounded border border-cyan-300/40 bg-cyan-300/15 p-2">{playing ? 'Playing...' : 'Play'}</button><button type="button" disabled={!playing} onClick={stop} className="rounded border border-white/20 p-2">Stop</button></div>
        <p className="text-xs text-zinc-400">Each letter is one quarter-note click. Accent marks (&gt;) indicate louder strokes. Crescendo grows over each phrase. Tempo and volume settings update during playback.</p>
      </GlassCard>
      <GlassCard className="space-y-3">
        <label className="block">Difficulty<select className="ml-2 rounded bg-zinc-900 p-2" value={difficulty} onChange={(event) => setDifficulty(event.target.value as keyof typeof levels)}>{Object.keys(levels).map((level) => <option key={level}>{level}</option>)}</select></label>
        <p className="text-xs text-zinc-400">Difficulty controls the length of newly generated patterns.</p>
        <label className="block">Lead hand<select className="ml-2 rounded bg-zinc-900 p-2" value={lead} onChange={(event) => { stop(); setLead(event.target.value as 'R' | 'L') }}><option>R</option><option>L</option></select></label>
        <label className="block">Accent<select className="ml-2 rounded bg-zinc-900 p-2" value={accent} onChange={(event) => setAccent(event.target.value as Accent)}>{accents.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="block">Dynamics<select className="ml-2 rounded bg-zinc-900 p-2" value={dynamic} onChange={(event) => setDynamic(event.target.value as Dynamic)}>{dynamics.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button type="button" className="rounded border border-cyan-300/40 p-2" onClick={regenerate}>Regenerate</button>
        <label className="block">Exercise name<input className="mt-1 block w-full rounded border border-white/30 bg-zinc-800 p-2" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label>
        <button type="button" disabled={!name.trim()} onClick={() => persist([...saved, { id: crypto.randomUUID(), name: name.trim(), pattern, lead, accent, dynamic, tempo }])} className="rounded border border-emerald-300/40 p-2">Save exercise</button>
        <p role="status" className="text-sm text-cyan-100">{status}</p>
        {saved.map((item) => <div key={item.id} className="flex flex-wrap gap-2 rounded border border-white/20 p-2"><button type="button" onClick={() => load(item)}>{item.name} · {item.tempo} BPM</button><button type="button" onClick={() => persist(saved.filter((entry) => entry.id !== item.id))} aria-label={`Delete ${item.name}`} className="text-rose-200">Delete</button></div>)}
      </GlassCard>
    </div>
  </div>
}
