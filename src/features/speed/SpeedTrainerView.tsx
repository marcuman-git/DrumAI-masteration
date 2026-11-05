import { useEffect, useRef, useState } from 'react'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { createSpeedGate, loadSpeedRecords, qualifiesForRecord, SPEED_DRILLS, summarizeSpeed } from './speedLogic'
import type { SpeedDrill, SpeedResult } from './speedLogic'

export function SpeedTrainerView() {
  const [drill, setDrill] = useState<SpeedDrill>('Singles')
  const [seconds, setSeconds] = useState(15)
  const [bpm, setBpm] = useState(60)
  const [cooldown, setCooldown] = useState(60)
  const [click, setClick] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'request' | 'calibrate' | 'run'>('idle')
  const [message, setMessage] = useState('Start a drill to calibrate room noise for 2 seconds, then play when the timer starts.')
  const [remaining, setRemaining] = useState(15)
  const [count, setCount] = useState(0)
  const [result, setResult] = useState<SpeedResult | null>(null)
  const [records, setRecords] = useState(loadSpeedRecords)
  const generation = useRef(0)
  const resource = useRef<{ stream: MediaStream; context: AudioContext; frame: number } | null>(null)
  const session = useRef<{ id: string; started: number; times: number[]; drill: SpeedDrill; seconds: number } | null>(null)

  const finish = (completed: boolean, updateUI = true) => {
    generation.current += 1
    const current = session.current
    if (current) {
      const elapsed = completed ? current.seconds : Math.min(current.seconds, (performance.now() - current.started) / 1000)
      const summary = summarizeSpeed(current.times, elapsed, completed)
      const qualified = qualifiesForRecord(summary)
      void trackPracticeEvent('speed', 'score', { ...summary, qualified, drill: current.drill }, current.id)
      stopPracticeSession('speed', current.id, { completed, drill: current.drill })
      if (qualified) {
        const saved = loadSpeedRecords()
        saved[current.drill] = Math.max(saved[current.drill] ?? 0, summary.bpm)
        try { localStorage.setItem('drummaster-speed-records-v1', JSON.stringify(saved)) } catch { /* Session events remain the primary record. */ }
        if (updateUI) setRecords(saved)
      }
      if (updateUI) {
        setResult(summary)
        setCount(summary.hits)
        setRemaining(Math.max(0, current.seconds - elapsed))
        setMessage(qualified ? 'Completed: a qualifying measured result was saved.' : 'Session saved. Records require completion, at least 12 strokes, and 80% consistency.')
      }
      session.current = null
    }
    const owned = resource.current
    if (owned) {
      cancelAnimationFrame(owned.frame)
      owned.stream.getTracks().forEach((track) => track.stop())
      void owned.context.close()
      resource.current = null
    }
    if (updateUI) setPhase('idle')
  }
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) {
        finish(false)
        setMessage('Drill stopped because this tab was hidden. Incomplete sessions do not qualify for records.')
      }
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => { document.removeEventListener('visibilitychange', onHidden); finish(false, false) }
  }, [])

  const start = async () => {
    finish(false)
    const token = generation.current
    setPhase('request'); setResult(null); setCount(0); setRemaining(seconds)
    setMessage('Requesting microphone access...')
    let stream: MediaStream | null = null
    let context: AudioContext | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: false, echoCancellation: false, noiseSuppression: false } })
      if (token !== generation.current) { stream.getTracks().forEach((track) => track.stop()); return }
      context = new AudioContext(); await context.resume()
      if (token !== generation.current) { stream.getTracks().forEach((track) => track.stop()); void context.close(); return }
      const owned = { stream, context, frame: 0 }
      resource.current = owned
      const analyser = context.createAnalyser(); analyser.fftSize = 256
      context.createMediaStreamSource(stream).connect(analyser)
      const data = new Float32Array(256)
      const noise: number[] = []
      const calibrationStart = performance.now()
      let threshold = 0.002
      const gate = createSpeedGate(cooldown)
      let lastUI = 0
      let nextClick = 0
      setPhase('calibrate'); setMessage('Stay quiet: measuring room noise for 2 seconds.')
      const tick = () => {
        if (token !== generation.current) return
        const now = performance.now()
        analyser.getFloatTimeDomainData(data)
        const amplitude = Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length)
        if (!session.current) {
          noise.push(amplitude)
          if (now - calibrationStart >= 2000) {
            noise.sort((a, b) => a - b)
            threshold = Math.max((noise[Math.floor(noise.length * 0.95)] ?? 0) * 3, 0.001)
            session.current = { id: startPracticeSession('speed', { drill, targetBpm: bpm, durationSeconds: seconds }), started: now, times: [], drill, seconds }
            nextClick = context!.currentTime
            setPhase('run'); setMessage('Play now. Maintain even sixteenth-note strokes. Stop if you feel tension or pain.')
          }
        } else {
          const current = session.current
          const elapsed = now - current.started
          if (elapsed >= seconds * 1000) { finish(true); return }
          if (gate(amplitude, threshold, now)) {
            current.times.push(elapsed)
            void trackPracticeEvent('speed', 'hit', { elapsedMs: Math.round(elapsed), drill }, current.id)
          }
          if (click && context!.currentTime >= nextClick) {
            const oscillator = context!.createOscillator(); const gain = context!.createGain()
            oscillator.frequency.value = 980; gain.gain.setValueAtTime(0.15, context!.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.0001, context!.currentTime + 0.045)
            oscillator.connect(gain); gain.connect(context!.destination); oscillator.start(); oscillator.stop(context!.currentTime + 0.05)
            nextClick = context!.currentTime + 60 / bpm
          }
          if (now - lastUI > 100) { setRemaining(Math.max(0, (seconds * 1000 - elapsed) / 1000)); setCount(current.times.length); lastUI = now }
        }
        owned.frame = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      stream?.getTracks().forEach((track) => track.stop())
      if (context && context.state !== 'closed') void context.close()
      if (token !== generation.current) return
      finish(false); setMessage('Microphone unavailable. Allow microphone access on HTTPS, then retry.')
    }
  }
  const busy = phase !== 'idle'
  const sequence = drill === 'Doubles' ? ['R', 'R', 'L', 'L'] : drill === 'Paradiddles' ? ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'] : drill === 'Double Bass' ? ['RF', 'LF', 'RF', 'LF'] : ['R', 'L', 'R', 'L']
  const panel = 'rounded-2xl border border-white/15 bg-black/30 p-5'
  return <section className="space-y-5">
    <h2 className="text-2xl font-semibold">Speed Trainer</h2>
    <p className="text-sm text-zinc-300">Measured stroke rate, endurance, and interval consistency. BPM assumes four strokes per quarter note. The microphone cannot verify hands, feet, or sticking.</p>
    <div className="grid gap-5 md:grid-cols-2">
      <div className={panel}>
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          <legend className="mb-3 text-lg font-semibold">Drill settings</legend>
          <div className="grid grid-cols-2 gap-2">{SPEED_DRILLS.map((name) => <button key={name} aria-pressed={drill === name} className={`rounded-lg border p-3 ${drill === name ? 'border-cyan-300 bg-cyan-900/60' : 'border-white/20'}`} onClick={() => setDrill(name)}>{name}</button>)}</div>
          <label className="block">Mode <select aria-label="Training mode" value={seconds} onChange={(event) => { setSeconds(Number(event.target.value)); setRemaining(Number(event.target.value)) }} className="ml-3 rounded bg-zinc-800 p-2"><option value={15}>Sprint: 15 seconds</option><option value={60}>Endurance: 60 seconds</option></select></label>
          <label className="block">Target BPM: {bpm}<input aria-label="Target BPM" type="range" min={40} max={240} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} className="mt-2 w-full" /></label>
          <label className="block">Hit cooldown: {cooldown} ms<input aria-label="Hit cooldown" type="range" min={40} max={200} value={cooldown} onChange={(event) => setCooldown(Number(event.target.value))} className="mt-2 w-full" /></label>
          <p className="text-xs text-zinc-400">Start at 60 ms; lower for faster strokes or raise to reject rebounds. Keep cooldown below {Math.round(15000 / bpm)} ms for this target. Browser sampling and room noise may miss fast or quiet hits.</p>
          <label className="flex gap-2"><input type="checkbox" checked={click} onChange={(event) => setClick(event.target.checked)} />Reference click (headphones only)</label>
        </fieldset>
        <div className="mt-5 flex gap-3"><button disabled={busy} className="rounded-lg bg-cyan-700 px-4 py-2 disabled:opacity-40" onClick={() => void start()}>{phase === 'run' ? 'Practicing' : 'Start drill'}</button><button disabled={!busy} className="rounded-lg border border-white/30 px-4 py-2 disabled:opacity-40" onClick={() => { finish(false); setMessage('Stopped. Incomplete sessions do not qualify for records.') }}>Stop</button></div>
        <p role="status" className="mt-3 text-sm text-cyan-200">{message}</p>
      </div>
      <div className={panel}>
        <h3 className="text-lg font-semibold">Session performance</h3>
        <p className="mt-3 text-xs text-zinc-400">Suggested sequence (not verified by microphone)</p>
        <div className="mt-2 flex flex-wrap gap-2">{sequence.map((limb, index) => <span key={index} className={`rounded-lg border px-3 py-2 ${phase === 'run' && count > 0 && (count - 1) % sequence.length === index ? 'border-cyan-300 bg-cyan-900/60' : 'border-white/20'}`}>{limb}</span>)}</div>
        <div className="my-5 grid grid-cols-2 gap-4 text-center"><div className="text-3xl">{remaining.toFixed(1)}<p className="text-sm text-zinc-300">Seconds remaining</p></div><div className="text-3xl">{count}<p className="text-sm text-zinc-300">Detected strokes</p></div></div>
        {result && <div className="space-y-2 rounded-lg border border-white/20 bg-zinc-800/60 p-4"><p>Measured BPM: {result.bpm}</p><p>Stroke rate: {result.strokeRate}/minute</p><p>Consistency: {result.hits >= 4 ? `${result.consistency}%` : 'Not enough strokes'}</p><p>{result.completed ? 'Completed' : 'Stopped early'} · {result.seconds} seconds</p></div>}
        <h3 className="mb-3 mt-5 font-semibold">Personal records</h3>
        {SPEED_DRILLS.map((name) => <p key={name} className="flex justify-between border-b border-white/10 py-2"><span>{name}</span><span>{records[name] ? `${records[name]} BPM` : 'No qualifying record'}</span></p>)}
        <button disabled={busy} className="mt-4 rounded border border-white/30 px-3 py-2 disabled:opacity-40" onClick={() => { if (window.confirm('Clear local speed records? Session history in Analytics will remain.')) { localStorage.removeItem('drummaster-speed-records-v1'); setRecords({}) } }}>Clear personal records</button>
        <p className="mt-3 text-xs text-zinc-400">Records require a complete timed drill, 12 or more strokes, and 80% consistency. Use a quiet room. No audio is stored. Keep this tab visible while practicing.</p>
      </div>
    </div>
  </section>
}
