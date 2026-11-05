import { useEffect, useRef, useState } from 'react'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { createStrokeGate, DYNAMIC_LEVELS, dynamicsSummary, relativeLevel, targetLevel } from './dynamicsLogic'
import type { DynamicLevel, DynamicsHit } from './dynamicsLogic'

type Phase = 'idle' | 'noise' | 'reference' | 'ready' | 'practice'
export function DynamicsTrainerView() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [dynamic, setDynamic] = useState<DynamicLevel>('MF')
  const [meter, setMeter] = useState(0)
  const [hits, setHits] = useState<DynamicsHit[]>([])
  const [message, setMessage] = useState('Calibrate your microphone before practicing.')
  const [clipped, setClipped] = useState(false)
  const state = useRef({ phase: 'idle' as Phase, noise: 0, reference: 0, target: targetLevel('MF'), hits: [] as DynamicsHit[], session: '', generation: 0 })
  const resources = useRef<{ stream: MediaStream; context: AudioContext; frame: number } | null>(null)
  const gate = useRef(createStrokeGate())
  const finish = () => {
    const current = state.current
    if (current.session) {
      const summary = dynamicsSummary(current.hits)
      if (summary.sampleCount >= 3) void trackPracticeEvent('dynamics', 'score', summary, current.session)
      stopPracticeSession('dynamics', current.session, { sampleCount: summary.sampleCount })
      current.session = ''
    }
  }
  const release = () => {
    state.current.generation += 1
    finish()
    const resource = resources.current
    if (resource) {
      cancelAnimationFrame(resource.frame)
      resource.stream.getTracks().forEach((track) => track.stop())
      void resource.context.close()
      resources.current = null
    }
  }
  useEffect(() => () => release(), []) // Release microphone and close any active session on navigation.

  const calibrate = async () => {
    release()
    state.current.phase = 'idle'
    setPhase('idle')
    setClipped(false)
    setMessage('Requesting microphone access...')
    const generation = state.current.generation
    let stream: MediaStream | null = null
    let context: AudioContext | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: false, echoCancellation: false, noiseSuppression: false } })
      if (generation !== state.current.generation) { stream.getTracks().forEach((track) => track.stop()); return }
      context = new AudioContext()
      await context.resume()
      if (generation !== state.current.generation) { stream.getTracks().forEach((track) => track.stop()); void context.close(); return }
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      context.createMediaStreamSource(stream).connect(analyser)
      const data = new Float32Array(analyser.fftSize)
      const noiseSamples: number[] = []
      const referencePeaks: number[] = []
      let started = performance.now()
      let lastUI = 0
      let pending: { peak: number; until: number; target: number } | null = null
      state.current.phase = 'noise'
      setPhase('noise')
      setMessage('Stay quiet for 2 seconds: measuring room noise.')
      resources.current = { stream, context, frame: 0 }
      const tick = () => {
        if (generation !== state.current.generation || !resources.current) return
        analyser.getFloatTimeDomainData(data)
        const amplitude = Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length)
        const now = performance.now()
        const current = state.current
        if (current.phase === 'noise') {
          noiseSamples.push(amplitude)
          if (now - started >= 2000) {
            noiseSamples.sort((a, b) => a - b)
            current.noise = noiseSamples[Math.floor(noiseSamples.length * 0.95)] ?? 0.001
            current.phase = 'reference'; setPhase('reference'); started = now
            setMessage('For 5 seconds, play spaced, comfortable strong strokes. Do not strike harder than feels safe.')
          }
        } else if (current.phase === 'reference') {
          if (gate.current(amplitude, Math.max(current.noise * 3, 0.002), now)) referencePeaks.push(amplitude)
          if (referencePeaks.length) referencePeaks[referencePeaks.length - 1] = Math.max(referencePeaks[referencePeaks.length - 1], amplitude)
          if (now - started >= 5000) {
            referencePeaks.sort((a, b) => a - b)
            current.reference = referencePeaks[Math.floor(referencePeaks.length * 0.75)] ?? 0
            if (referencePeaks.length < 3 || current.reference < Math.max(current.noise * 4, 0.004)) {
              current.phase = 'idle'; setPhase('idle'); setMessage('Calibration needs at least 3 clear strokes above room noise. Move the microphone closer and recalibrate.')
              release(); return
            }
            current.phase = 'ready'; setPhase('ready'); setMessage('Calibrated. Select a target and start practice. Recalibrate if microphone position changes.')
            gate.current = createStrokeGate()
          }
        } else if (current.phase === 'practice') {
          if (pending) {
            pending.peak = Math.max(pending.peak, amplitude)
            if (now >= pending.until) {
              const hit = { level: Math.round(relativeLevel(pending.peak, current.noise, current.reference)), target: pending.target }
              current.hits.push(hit)
              setHits([...current.hits])
              void trackPracticeEvent('dynamics', 'hit', { level: hit.level, target: hit.target, inRange: Math.abs(hit.level - hit.target) <= 8 }, current.session)
              pending = null
            }
          }
          if (!pending && gate.current(amplitude, Math.max(current.noise * 2.5, 0.001), now)) pending = { peak: amplitude, until: now + 55, target: current.target }
        } else pending = null
        if (now - lastUI > 70) {
          setMeter(Math.round(relativeLevel(amplitude, current.noise, current.reference)))
          setClipped(data.some((value) => Math.abs(value) >= 0.98))
          lastUI = now
        }
        resources.current.frame = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      stream?.getTracks().forEach((track) => track.stop())
      if (context && context.state !== 'closed') void context.close()
      if (generation !== state.current.generation) return
      release(); state.current.phase = 'idle'; setPhase('idle')
      setMessage('Microphone unavailable. Allow microphone access and use HTTPS. Close other microphone applications, then retry.')
    }
  }
  const start = () => {
    state.current.hits = []; setHits([])
    gate.current = createStrokeGate()
    state.current.session = startPracticeSession('dynamics', { target: state.current.target, dynamic })
    state.current.phase = 'practice'; setPhase('practice')
  }
  const stop = () => { finish(); state.current.phase = 'ready'; setPhase('ready') }
  const summary = dynamicsSummary(hits)
  const target = targetLevel(dynamic)
  const panel = 'rounded-2xl border border-white/15 bg-black/30 p-5'
  return <section className="space-y-5">
    <h2 className="text-2xl font-semibold">Dynamics Trainer</h2>
    <p className="text-sm text-zinc-300">Control stroke volume with a calibrated microphone. Relative levels, not absolute loudness or MIDI velocity. Voices and claps may also trigger hits.</p>
    <div className={panel}>
      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg bg-cyan-600 px-4 py-2 disabled:opacity-40" disabled={phase === 'noise' || phase === 'reference' || phase === 'practice'} onClick={() => void calibrate()}>Calibrate microphone</button>
        <button className="rounded-lg bg-emerald-700 px-4 py-2 disabled:opacity-40" disabled={phase !== 'ready'} onClick={start}>{phase === 'practice' ? 'Practicing' : 'Start practice'}</button>
        <button className="rounded-lg border border-white/30 px-4 py-2 disabled:opacity-40" disabled={phase !== 'practice'} onClick={stop}>Stop</button>
        <button className="rounded-lg border border-white/30 px-4 py-2" onClick={() => { release(); state.current.phase = 'idle'; setPhase('idle'); setMeter(0); setMessage('Microphone disconnected. Calibrate to reconnect.') }}>Disconnect microphone</button>
      </div>
      <p role="status" className="mt-3 text-sm text-cyan-200">{message}</p>
      <p className="mt-2 text-xs text-zinc-400">Use headphones, keep microphone placement fixed, and leave at least 160 ms between strokes. Very soft hits near room noise may be missed. No audio is saved.</p>
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      <div className={panel}>
        <h3 className="mb-3 text-lg font-semibold">Target dynamic</h3>
        <div className="grid grid-cols-4 gap-2">{DYNAMIC_LEVELS.map((level) => <button key={level} aria-pressed={dynamic === level} className={`rounded-lg border px-3 py-3 ${dynamic === level ? 'border-cyan-300 bg-cyan-900/60' : 'border-white/20 bg-zinc-800'}`} onClick={() => { setDynamic(level); state.current.target = targetLevel(level) }}>{level}</button>)}</div>
        <p className="mt-3 text-sm text-zinc-300">Target: {target}% ± 8 relative-level points. Target changes apply to the next stroke.</p>
        <h3 className="mb-2 mt-5 font-semibold">Live volume</h3>
        <div role="meter" aria-label="Relative microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={meter} className="relative h-8 overflow-hidden rounded bg-zinc-800">
          <div className="absolute inset-y-0 border-x-2 border-cyan-200 bg-cyan-300/20" style={{ left: `${target - 8}%`, width: '16%' }} />
          <div className="h-full bg-emerald-400/70 transition-[width] duration-75" style={{ width: `${meter}%` }} />
        </div>
        <p className="mt-2 text-sm">{meter}% {clipped && <span className="text-amber-300">Clipping: lower microphone gain or move it farther away.</span>}</p>
      </div>
      <div className={panel}>
        <h3 className="text-lg font-semibold">Session results</h3>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div><p className="text-2xl">{summary.sampleCount}</p><p className="text-sm text-zinc-300">Strokes</p></div>
          <div><p className="text-2xl">{summary.sampleCount ? `${summary.accuracy}%` : '-'}</p><p className="text-sm text-zinc-300">In target range</p></div>
          <div><p className="text-2xl">{summary.sampleCount >= 3 ? `${summary.consistency}%` : '-'}</p><p className="text-sm text-zinc-300">Consistency</p></div>
        </div>
        <p className="mt-4 text-xs text-zinc-400">Consistency measures repeatability of target-relative stroke levels (at least 3 strokes). You can be consistent but outside the target range. Stop saves results to Analytics and the AI Coach source list.</p>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Recent strokes">{hits.slice(-24).map((hit, index) => <span key={index} className={`rounded border px-2 py-2 text-sm ${Math.abs(hit.level - hit.target) <= 8 ? 'border-emerald-300 text-emerald-200' : 'border-amber-300 text-amber-200'}`}>{hit.level}%</span>)}</div>
      </div>
    </div>
  </section>
}
