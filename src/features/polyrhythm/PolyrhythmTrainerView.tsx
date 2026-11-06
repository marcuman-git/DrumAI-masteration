import { useMemo, useRef, useEffect, useLayoutEffect, useState } from 'react'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { buildPolyrhythm, cycleSeconds, RATIOS } from './polyrhythmLogic'
import type { Ratio } from './polyrhythmLogic'

export function PolyrhythmTrainerView() {
  const [ratio, setRatio] = useState<Ratio>([3, 4])
  const [tempo, setTempo] = useState(60)
  const [viewMode, setViewMode] = useState<'Grid' | 'Circle' | 'Timeline'>('Grid')
  const [loop, setLoop] = useState(true)
  const [volume, setVolume] = useState(0.3)
  const [muted, setMuted] = useState([false, false])
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(-1)
  const [phase, setPhase] = useState(0)
  const [cycles, setCycles] = useState(0)
  const [message, setMessage] = useState('Each cycle spans four reference beats. Both streams meet at the start of each cycle.')
  const pulses = useMemo(() => buildPolyrhythm(ratio), [ratio])
  const generation = useRef(0)
  const owned = useRef<{ context: AudioContext; timer: number; frame: number; session: string; cycles: number } | null>(null)
  const config = useRef({ tempo, loop, volume, muted })
  useLayoutEffect(() => { config.current = { tempo, loop, volume, muted } }, [tempo, loop, volume, muted])
  const stop = (updateUI = true) => {
    generation.current += 1
    const current = owned.current
    if (current) {
      window.clearInterval(current.timer); cancelAnimationFrame(current.frame)
      stopPracticeSession('polyrhythm', current.session, { completedCycles: current.cycles })
      void current.context.close(); owned.current = null
    }
    if (updateUI) { setPlaying(false); setActive(-1); setPhase(0) }
  }
  useEffect(() => {
    const onHidden = () => { if (document.hidden) { stop(); setMessage('Playback stopped because this tab was hidden. Session saved.') } }
    document.addEventListener('visibilitychange', onHidden)
    return () => { document.removeEventListener('visibilitychange', onHidden); stop(false) }
  }, [])
  const start = async () => {
    stop(); const token = generation.current
    setPlaying(true); setCycles(0); setMessage('Preparing audio...')
    let context: AudioContext | null = null
    try {
      context = new AudioContext(); await context.resume()
      if (token !== generation.current) { void context.close(); return }
      const audio = context
      const resource = { context: audio, timer: 0, frame: 0, session: startPracticeSession('polyrhythm', { ratio: `${ratio[0]}:${ratio[1]}`, bpm: tempo }), cycles: 0 }
      owned.current = resource
      const visuals: { index: number; time: number; duration: number }[] = []
      let next = audio.currentTime + 0.04
      let index = 0
      let end: number | null = null
      let shown = { index: 0, time: next, duration: cycleSeconds(tempo) / pulses.total }
      const sound = (frequency: number, time: number, level: number) => {
        const oscillator = audio.createOscillator(); const gain = audio.createGain()
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(Math.max(0.0001, level * 0.5), time)
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045)
        oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(time); oscillator.stop(time + 0.05)
      }
      const schedule = () => {
        if (token !== generation.current) return
        if (end !== null && config.current.loop) { end = null; index = 0 }
        while (end === null && next < audio.currentTime + 0.04) {
          if (index === pulses.total) {
            if (!config.current.loop) { end = next; break }
            index = 0
          }
          const current = config.current
          const time = Math.max(next, audio.currentTime)
          const duration = cycleSeconds(current.tempo) / pulses.total
          if (pulses.first[index] && !current.muted[0]) sound(980, time, current.volume)
          if (pulses.second[index] && !current.muted[1]) sound(330, time, current.volume)
          visuals.push({ index, time, duration }); next = time + duration; index += 1
          if (index === pulses.total) visuals.push({ index, time: next, duration: 0 })
        }
      }
      const animate = () => {
        if (token !== generation.current) return
        while (visuals.length && visuals[0].time <= audio.currentTime) {
          const item = visuals.shift()!
          if (item.index === pulses.total) {
            resource.cycles += 1; setCycles(resource.cycles)
            void trackPracticeEvent('polyrhythm', 'score', { completedCycles: resource.cycles, ratio: `${ratio[0]}:${ratio[1]}`, bpm: config.current.tempo, measuredTiming: false }, resource.session)
          } else { shown = item; setActive(item.index) }
        }
        const fraction = Math.max(0, Math.min(1, (audio.currentTime - shown.time) / shown.duration))
        setPhase(Math.min(1, (shown.index + fraction) / pulses.total))
        if (end !== null && audio.currentTime >= end) {
          if (config.current.loop) schedule()
          else { stop(); setMessage('One cycle completed. Session saved.'); return }
        }
        resource.frame = requestAnimationFrame(animate)
      }
      schedule(); resource.timer = window.setInterval(schedule, 20); resource.frame = requestAnimationFrame(animate)
      setMessage('Playing. Tempo, volume, mutes, and Loop update without restarting. Changing ratio stops playback.')
    } catch {
      if (context && context.state !== 'closed') void context.close()
      if (token !== generation.current) return
      stop(); setMessage('Audio could not start. Check browser audio permissions and retry.')
    }
  }
  const colors = ['#67e8f9', '#fbbf24']
  return <div className="space-y-4">
    <SectionHeader title="Polyrhythm Trainer" subtitle="Two independent pulse streams over a shared four-beat cycle." />
    <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
      <GlassCard className="space-y-3">
        <div className="flex flex-wrap gap-2">{RATIOS.map((item) => { const selected = ratio[0] === item[0] && ratio[1] === item[1]; return <button key={item.join(':')} aria-pressed={selected} onClick={() => { stop(); setRatio(item); setCycles(0); setMessage('Ratio changed. Press Play to start the new cycle.') }} className={`rounded-lg border px-3 py-2 text-xs ${selected ? 'border-cyan-200 bg-cyan-500/30 text-cyan-100 ring-1 ring-cyan-300' : 'border-white/15 bg-white/5 text-zinc-300'}`}>{item.join(':')}</button> })}</div>
        <div className="rounded-xl border border-white/15 bg-black/25 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">{viewMode} View</p>
          {viewMode === 'Grid' && <div className="mt-3 overflow-x-auto"><div style={{ minWidth: Math.max(360, pulses.total * 25) }}>
            {[pulses.first, pulses.second].map((stream, row) => <div key={row} className="mb-3"><p className="mb-2 text-sm" style={{ color: colors[row] }}>{row === 0 ? 'First' : 'Second'} stream: {ratio[row]} pulses</p><div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${pulses.total}, minmax(0, 1fr))` }}>{stream.map((on, step) => <span key={step} aria-label={`${row === 0 ? 'First' : 'Second'} stream step ${step + 1}: ${on ? 'pulse' : 'rest'}`} className={`flex h-8 items-center justify-center rounded border text-xs ${step === active ? 'ring-2 ring-white' : ''}`} style={{ background: on ? colors[row] : '#27272a', color: on ? '#18181b' : '#a1a1aa', opacity: muted[row] ? 0.4 : 1 }}>{on ? 'x' : '-'}</span>)}</div></div>)}
          </div></div>}
          {viewMode === 'Circle' && <svg role="img" aria-label="Two polyrhythm circles with synchronized rotating playhead" viewBox="0 0 320 320" className="mx-auto mt-3 w-full max-w-80">
            {[0, 1].map((row) => { const radius = row === 0 ? 125 : 85; return <g key={row} opacity={muted[row] ? 0.4 : 1}><circle cx={160} cy={160} r={radius} fill="none" stroke={colors[row]} strokeOpacity={0.3} />{Array.from({ length: ratio[row] }, (_, index) => { const angle = index / ratio[row] * Math.PI * 2 - Math.PI / 2; const lit = playing && active >= 0 && Math.floor(active * ratio[row] / pulses.total) === index; return <circle key={index} cx={160 + radius * Math.cos(angle)} cy={160 + radius * Math.sin(angle)} r={lit ? 10 : 6} fill={colors[row]} stroke={lit ? 'white' : 'none'} strokeWidth={2} /> })}</g> })}
            <line x1={160} y1={160} x2={160 + 140 * Math.sin(phase * Math.PI * 2)} y2={160 - 140 * Math.cos(phase * Math.PI * 2)} stroke="white" strokeWidth={2} />
            <circle cx={160} cy={160} r={35} fill="#18181b" /><text x={160} y={165} textAnchor="middle" fill="white" fontSize={22}>{ratio.join(':')}</text>
          </svg>}
          {viewMode === 'Timeline' && <svg role="img" aria-label="Complete polyrhythm timeline with moving playhead" viewBox="0 0 640 180" className="mt-3 w-full">
            {[0, 1].map((row) => <g key={row} opacity={muted[row] ? 0.4 : 1}><line x1={20} y1={60 + row * 70} x2={620} y2={60 + row * 70} stroke={colors[row]} strokeOpacity={0.4} />{Array.from({ length: ratio[row] }, (_, index) => <circle key={index} cx={20 + index / ratio[row] * 600} cy={60 + row * 70} r={8} fill={colors[row]} />)}</g>)}
            <line x1={20 + phase * 600} y1={25} x2={20 + phase * 600} y2={155} stroke="white" strokeWidth={3} />
          </svg>}
          <p className="mt-3 text-xs text-zinc-300">Cyan = first stream (high click). Amber = second stream (low click). {pulses.total} subdivisions per cycle; no pulses are omitted.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">{[0, 1].map((row) => <div key={row} className="rounded-lg border border-white/20 p-3" style={{ color: colors[row] }}><p>{row === 0 ? 'First' : 'Second'} stream: {ratio[row]} pulses</p><p className="mt-1 text-sm">Current pulse: {active < 0 ? '-' : Math.floor(active * ratio[row] / pulses.total) + 1}</p><button aria-pressed={muted[row]} onClick={() => setMuted((current) => current.map((value, index) => index === row ? !value : value))} className="mt-2 rounded border border-white/25 px-3 py-1 text-xs">{muted[row] ? 'Unmute' : 'Mute'} {row === 0 ? 'first' : 'second'}</button></div>)}</div>
      </GlassCard>
      <GlassCard className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Trainer Controls</p>
        <label className="block text-xs text-zinc-300">Tempo {tempo} BPM<input aria-label="Tempo BPM" type="range" min={40} max={240} value={tempo} onChange={(event) => setTempo(Number(event.target.value))} className="mt-2 w-full accent-cyan-400" /></label>
        <p className="text-xs text-zinc-400">BPM sets the reference quarter-note pulse. One full ratio cycle lasts four reference beats ({cycleSeconds(tempo).toFixed(2)} seconds at this tempo), not one beat.</p>
        <label className="block text-xs text-zinc-300">View Mode<select aria-label="View Mode" value={viewMode} onChange={(event) => setViewMode(event.target.value as typeof viewMode)} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-2"><option>Grid</option><option>Circle</option><option>Timeline</option></select></label>
        <label className="block text-xs text-zinc-300">Volume {Math.round(volume * 100)}%<input aria-label="Volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="mt-2 w-full accent-cyan-400" /></label>
        <div className="flex flex-wrap gap-2"><button disabled={playing} onClick={() => void start()} className="rounded-lg bg-cyan-700 px-3 py-2 disabled:opacity-50">{playing ? 'Playing' : 'Play'}</button><button disabled={!playing} onClick={() => { stop(); setMessage('Stopped. Session saved.') }} className="rounded-lg border border-white/30 px-3 py-2 disabled:opacity-40">Stop</button><button aria-pressed={loop} onClick={() => setLoop((current) => !current)} className="rounded-lg border border-white/30 px-3 py-2">Loop {loop ? 'On' : 'Off'}</button></div>
        <p role="status" className="text-sm text-cyan-200">{message}</p><p>Completed cycles: {cycles}</p>
        <p className="text-xs text-zinc-400">Practice time and completed cycles are saved to Analytics and AI Coach sources. Playback does not measure your timing accuracy. Switching ratio stops old audio; switching views keeps playback running.</p>
      </GlassCard>
    </div>
  </div>
}
