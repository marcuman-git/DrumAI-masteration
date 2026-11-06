import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { formatRemaining, PAD_ROUTINES, padCue, padStepSeconds } from './practicePadLogic'

export function PracticePadModeView() {
  const [routineId, setRoutineId] = useState('tech')
  const [bpm, setBpm] = useState(60)
  const [minutes, setMinutes] = useState(10)
  const [subdivision, setSubdivision] = useState(1)
  const [leftLead, setLeftLead] = useState(false)
  const [volume, setVolume] = useState(0.3)
  const [stage, setStage] = useState<'idle' | 'playing' | 'paused' | 'finished'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [cueCount, setCueCount] = useState(0)
  const [active, setActive] = useState(-1)
  const [message, setMessage] = useState('Choose a routine, then start. Follow the large hand cue and keep your strokes relaxed.')
  const routine = PAD_ROUTINES.find((item) => item.id === routineId) ?? PAD_ROUTINES[0]
  const generation = useRef(0)
  const progress = useRef({ elapsedMs: 0, cues: 0 })
  const owned = useRef<{ context: AudioContext; timer: number; frame: number; session: string; started: number; durationMs: number; routine: string } | null>(null)
  const pending = useRef(false)
  const config = useRef({ bpm, subdivision, volume })
  useLayoutEffect(() => { config.current = { bpm, subdivision, volume } }, [bpm, subdivision, volume])
  const finishSegment = (reason: string, updateUI = true) => {
    generation.current += 1
    pending.current = false
    const resource = owned.current
    if (resource) {
      progress.current.elapsedMs = Math.min(resource.durationMs, progress.current.elapsedMs + performance.now() - resource.started)
      window.clearInterval(resource.timer); cancelAnimationFrame(resource.frame)
      void trackPracticeEvent('practice-pad', 'score', { routine: resource.routine, guidedCues: progress.current.cues, activeSeconds: Math.round(progress.current.elapsedMs / 1000), completed: reason === 'completed', measuredTiming: false }, resource.session)
      stopPracticeSession('practice-pad', resource.session, { reason, routine: resource.routine })
      void resource.context.close(); owned.current = null
    }
    if (updateUI) { setElapsed(progress.current.elapsedMs / 1000); setActive(-1) }
  }
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden && (owned.current || pending.current)) { finishSegment('hidden'); setStage('paused'); setMessage('Paused because this tab was hidden. Resume when ready.') }
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => { document.removeEventListener('visibilitychange', onHidden); finishSegment('navigation', false) }
  }, [])
  const start = async (resume: boolean) => {
    finishSegment('restart')
    if (!resume) { progress.current = { elapsedMs: 0, cues: 0 }; setElapsed(0); setCueCount(0) }
    const token = generation.current
    pending.current = true
    setStage('playing'); setMessage('Preparing audio...')
    let context: AudioContext | null = null
    try {
      context = new AudioContext(); await context.resume()
      if (token !== generation.current) { void context.close(); return }
      const audio = context
      const resource = { context: audio, timer: 0, frame: 0, session: startPracticeSession('practice-pad', { routine: routineId, bpm: config.current.bpm, subdivision: config.current.subdivision, leftLead, resumed: resume }), started: performance.now(), durationMs: minutes * 60000, routine: routineId }
      pending.current = false
      owned.current = resource
      let next = audio.currentTime + 0.04
      let index = progress.current.cues
      const queue: { time: number; index: number }[] = []
      let lastUI = 0
      const schedule = () => {
        if (token !== generation.current) return
        while (next < audio.currentTime + 0.04) {
          const current = config.current
          const time = Math.max(next, audio.currentTime)
          if (progress.current.elapsedMs + (time - audio.currentTime) * 1000 + performance.now() - resource.started >= minutes * 60000) break
          const cue = padCue(routineId, index, leftLead)
          if (current.volume > 0) {
            const oscillator = audio.createOscillator(); const gain = audio.createGain()
            oscillator.frequency.value = cue.accent ? 1540 : 980; oscillator.type = cue.accent ? 'triangle' : 'sine'
            const level = current.volume * (cue.accent ? 0.7 : routineId === 'dynamic' ? 0.18 : 0.4)
            gain.gain.setValueAtTime(Math.max(0.0001, level), time)
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045)
            oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(time); oscillator.stop(time + 0.05)
          }
          queue.push({ time, index }); index += 1; next = time + padStepSeconds(current.bpm, current.subdivision)
        }
      }
      const animate = () => {
        if (token !== generation.current) return
        while (queue.length && queue[0].time <= audio.currentTime) {
          const item = queue.shift()!; progress.current.cues = item.index + 1; setCueCount(progress.current.cues); setActive(item.index)
        }
        const now = performance.now()
        if (now - lastUI > 100) { setElapsed((progress.current.elapsedMs + now - resource.started) / 1000); lastUI = now }
        if (progress.current.elapsedMs + now - resource.started >= minutes * 60000) {
          finishSegment('completed'); setStage('finished'); setMessage('Guided session completed and saved. No timing accuracy was measured.'); return
        }
        resource.frame = requestAnimationFrame(animate)
      }
      schedule(); resource.timer = window.setInterval(schedule, 20); resource.frame = requestAnimationFrame(animate)
      setMessage('Playing. Tempo, subdivision, and volume update on upcoming cues. Stop if you feel pain or tension.')
    } catch {
      if (context && context.state !== 'closed') void context.close()
      if (token !== generation.current) return
      finishSegment('audio-error'); setStage(resume ? 'paused' : 'idle'); setMessage('Audio could not start. Check browser audio permissions and retry.')
    }
  }
  const busy = stage === 'playing' || stage === 'paused'
  const remaining = Math.max(0, minutes * 60 - elapsed)
  const currentCue = active < 0 ? null : padCue(routineId, active, leftLead)
  return <div className="space-y-4">
    <SectionHeader title="Practice Pad Mode" subtitle="Large sticking cues and timed, guided technique sessions. No microphone required." />
    <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
      <GlassCard layout={false} className="min-w-0 space-y-4">
        <div className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 p-6 text-center"><p className="text-xs uppercase tracking-wide text-cyan-100">{routine.name}</p><p className="mt-2 text-sm text-zinc-300">{routine.target}</p><p data-testid="pad-hand-cue" className={`my-4 text-8xl font-bold ${currentCue?.accent ? 'text-amber-200' : 'text-cyan-100'}`}>{currentCue?.hand ?? '-'}</p><p className="text-sm text-zinc-300">{currentCue?.accent ? 'Accent stroke' : stage === 'playing' ? 'Relaxed, even stroke' : 'Ready when you are'}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">{routine.sticking.map((_, index) => <span key={index} className={`rounded-lg border px-3 py-2 text-xl ${currentCue?.position === index ? 'border-amber-200 bg-amber-300/20 ring-2 ring-amber-300' : 'border-white/20'}`}>{padCue(routineId, index, leftLead).hand}</span>)}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg border border-white/15 p-3"><p className="text-2xl">{formatRemaining(remaining)}</p><p className="text-xs text-zinc-400">Remaining</p></div><div className="rounded-lg border border-white/15 p-3"><p className="text-2xl">{bpm}</p><p className="text-xs text-zinc-400">BPM</p></div><div className="rounded-lg border border-white/15 p-3"><p className="text-2xl">{cueCount}</p><p className="text-xs text-zinc-400">Guided cues</p></div></div>
        <progress aria-label="Session progress" max={minutes * 60} value={Math.min(minutes * 60, elapsed)} className="h-3 w-full accent-cyan-400" />
        <p className="text-sm text-zinc-300">{routine.advice}</p>
        <p className="text-xs text-zinc-400">Hand letters are instructions, not detected strokes. Use Timing Analyzer, Dynamics, or Speed Trainer for microphone measurements.</p>
      </GlassCard>
      <GlassCard layout={false} className="min-w-0 space-y-4">
        <h3 className="font-semibold">Quick Setup</h3>
        <label className="block text-sm">Routine<select aria-label="Routine" disabled={busy} value={routineId} onChange={(event) => { setRoutineId(event.target.value); setActive(-1) }} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-2 disabled:opacity-40">{PAD_ROUTINES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block text-sm">Tempo {bpm} BPM<input aria-label="Tempo BPM" type="range" min={40} max={240} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} className="mt-2 w-full accent-cyan-400" /></label>
        <label className="block text-sm">Subdivision<select aria-label="Subdivision" value={subdivision} onChange={(event) => setSubdivision(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-2"><option value={1}>Quarter notes</option><option value={2}>Eighth notes</option><option value={4}>Sixteenth notes</option></select></label>
        <label className="block text-sm">Session length: {minutes} min<input aria-label="Session minutes" disabled={busy} type="range" min={1} max={45} value={minutes} onChange={(event) => { setMinutes(Number(event.target.value)); setElapsed(0) }} className="mt-2 w-full accent-cyan-400 disabled:opacity-40" /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" disabled={busy} checked={leftLead} onChange={(event) => setLeftLead(event.target.checked)} />Left-hand lead</label>
        <label className="block text-sm">Volume {Math.round(volume * 100)}%<input aria-label="Volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="mt-2 w-full accent-cyan-400" /></label>
        <div className="flex flex-wrap gap-2"><button disabled={stage === 'playing'} onClick={() => void start(stage === 'paused')} className="rounded-lg bg-cyan-700 px-3 py-2 disabled:opacity-50">{stage === 'playing' ? 'Playing' : stage === 'paused' ? 'Resume' : 'Start session'}</button><button disabled={stage !== 'playing'} onClick={() => { finishSegment('pause'); setStage('paused'); setMessage('Paused. Paused time is excluded; Resume starts a new active practice segment.') }} className="rounded-lg border border-white/30 px-3 py-2 disabled:opacity-40">Pause</button><button disabled={!busy} onClick={() => { finishSegment('stop'); setStage('finished'); setMessage('Stopped. Active practice segments saved.') }} className="rounded-lg border border-white/30 px-3 py-2 disabled:opacity-40">Stop</button></div>
        <p role="status" className="text-sm text-cyan-200">{message}</p><p className="text-xs text-zinc-400">Routine, lead hand, and duration are locked until Stop. Pausing closes the current active segment; Resume starts another so Analytics excludes paused time. Navigation stops audio and saves the active segment.</p>
      </GlassCard>
    </div>
  </div>
}
