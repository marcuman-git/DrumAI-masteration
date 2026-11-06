import { useEffect, useRef, useState } from 'react'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { createDrumPlayer } from './independenceAudio'
import { LIMBS, LIMB_LABELS, LIMB_PATTERNS, loadCoordination, patternSteps, presetGrid, stepDuration, STYLE_PRESETS, toggleStep } from './independenceLogic'
import type { Limb, Style } from './independenceLogic'

export function IndependenceTrainerView() {
  const [grid, setGrid] = useState(() => presetGrid('Rock'))
  const [profile, setProfile] = useState<Record<Limb, string>>({ ...STYLE_PRESETS.Rock })
  const [bpm, setBpm] = useState(60)
  const [swing, setSwing] = useState(false)
  const [loop, setLoop] = useState(true)
  const [muted, setMuted] = useState<Record<Limb, boolean>>({ RH: false, LH: false, RF: false, LF: false })
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(-1)
  const [message, setMessage] = useState('Select a preset or edit the grid. Each row is one limb; filled cells play and empty cells rest.')
  const [bars, setBars] = useState(0)
  const generation = useRef(0)
  const resource = useRef<{ context: AudioContext; timer: number; frame: number; sessionId: string; bars: number } | null>(null)
  const config = useRef({ grid, bpm, swing, loop, muted, profile })
  config.current = { grid, bpm, swing, loop, muted, profile }
  const stop = (updateUI = true) => {
    generation.current += 1
    const owned = resource.current
    if (owned) {
      window.clearInterval(owned.timer); cancelAnimationFrame(owned.frame)
      stopPracticeSession('independence', owned.sessionId, { completedBars: owned.bars })
      void owned.context.close(); resource.current = null
    }
    if (updateUI) { setPlaying(false); setActive(-1) }
  }
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) { stop(); setMessage('Playback stopped because this tab was hidden. Session saved.') }
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => { document.removeEventListener('visibilitychange', onHidden); stop(false) }
  }, [])

  const start = async () => {
    stop()
    const token = generation.current
    setPlaying(true); setBars(0); setMessage('Preparing playback...')
    let context: AudioContext | null = null
    try {
      context = new AudioContext(); await context.resume()
      if (token !== generation.current) { void context.close(); return }
      const audio = context
      const playDrum = createDrumPlayer(audio)
      const owned = { context: audio, timer: 0, frame: 0, sessionId: startPracticeSession('independence', { bpm: config.current.bpm, swing: config.current.swing }), bars: 0 }
      resource.current = owned
      let nextTime = audio.currentTime + 0.04
      let step = 0
      let endTime: number | null = null
      const visuals: { step: number; time: number }[] = []
      const schedule = () => {
        if (token !== generation.current) return
        if (endTime !== null && config.current.loop) { endTime = null; step = 0 }
        while (endTime === null && nextTime < audio.currentTime + 0.04) {
          if (step === 16) {
            if (!config.current.loop) { endTime = nextTime; break }
            step = 0
          }
          const current = config.current
          const time = Math.max(nextTime, audio.currentTime)
          for (const limb of LIMBS) if (current.grid[limb][step] && !current.muted[limb]) {
            playDrum(limb, time, current.profile.RH === 'Ride Swing', limb === 'LH' && current.profile.LH === 'Ghost Grid' && step !== 4 && step !== 12)
          }
          visuals.push({ step, time })
          nextTime = time + stepDuration(current.bpm, step, current.swing)
          step += 1
          if (step === 16) visuals.push({ step: 16, time: nextTime })
        }
      }
      const animate = () => {
        if (token !== generation.current) return
        while (visuals.length && visuals[0].time <= audio.currentTime) {
          const item = visuals.shift()!
          if (item.step === 16) {
            owned.bars += 1; setBars(owned.bars)
            void trackPracticeEvent('independence', 'score', { completedBars: owned.bars, bpm: config.current.bpm, measuredTiming: false }, owned.sessionId)
          } else setActive(item.step)
        }
        if (endTime !== null && audio.currentTime >= endTime) {
          if (config.current.loop) schedule()
          else { stop(); setMessage('One bar completed. Session saved.'); return }
        }
        owned.frame = requestAnimationFrame(animate)
      }
      schedule(); owned.timer = window.setInterval(schedule, 20); owned.frame = requestAnimationFrame(animate)
      setMessage('Playing. Tempo, patterns, mutes, and Loop changes apply to upcoming steps.')
    } catch {
      if (context && context.state !== 'closed') void context.close()
      if (token !== generation.current) return
      stop(); setMessage('Audio could not start. Check browser audio permissions and try again.')
    }
  }
  const applyPreset = (style: Style) => { setGrid(presetGrid(style)); setProfile({ ...STYLE_PRESETS[style] }); setSwing(style === 'Jazz') }
  const changePattern = (limb: Limb, value: string) => {
    setProfile((current) => ({ ...current, [limb]: value }))
    if (value !== 'Custom') setGrid((current) => ({ ...current, [limb]: patternSteps(value) }))
    if (limb === 'RH') setSwing(value === 'Ride Swing')
  }
  const density = Math.round(LIMBS.reduce((sum, limb) => sum + grid[limb].filter(Boolean).length, 0) / 64 * 100)
  return <div className="space-y-4">
    <SectionHeader title="Independence Trainer" subtitle="Editable four-limb patterns with instrument playback and live step highlighting." />
    <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
      <GlassCard className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Coordination Matrix</p>
        <div className="grid gap-3 md:grid-cols-2">{LIMBS.map((limb) => <div key={limb} className="rounded-lg border border-white/15 bg-black/20 p-3">
          <p className="text-sm font-semibold text-cyan-100">{LIMB_LABELS[limb]}</p>
          <select aria-label={`${limb} pattern`} value={profile[limb]} onChange={(event) => changePattern(limb, event.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-zinc-900 p-2 text-sm">{[...LIMB_PATTERNS[limb], 'Custom'].map((option) => <option key={option}>{option}</option>)}</select>
          <button aria-pressed={muted[limb]} className="mt-2 rounded border border-white/20 px-3 py-1 text-xs" onClick={() => setMuted((current) => ({ ...current, [limb]: !current[limb] }))}>{muted[limb] ? `Unmute ${limb}` : `Mute ${limb}`}</button>
        </div>)}</div>
        <div className="overflow-x-auto rounded-lg border border-white/15 bg-black/20 p-3">
          <div className="min-w-[650px] space-y-2">
            <div className="grid grid-cols-[50px_repeat(16,minmax(0,1fr))] gap-1 text-center text-xs text-zinc-300"><span>Count</span>{Array.from({ length: 16 }, (_, index) => <span key={index}>{index % 4 === 0 ? index / 4 + 1 : ['e', '&', 'a'][index % 4 - 1]}</span>)}</div>
            {LIMBS.map((limb) => <div key={limb} className="grid grid-cols-[50px_repeat(16,minmax(0,1fr))] gap-1"><span className="self-center text-sm text-cyan-100">{limb}</span>{grid[limb].map((enabled, index) => <button key={index} aria-label={`${limb} step ${index + 1}`} aria-pressed={enabled} title={`${limb}: ${enabled ? 'stroke' : 'rest'} on step ${index + 1}`} onClick={() => { setGrid((current) => toggleStep(current, limb, index)); setProfile((current) => ({ ...current, [limb]: 'Custom' })) }} className={`h-9 rounded border text-sm ${active === index ? 'ring-2 ring-amber-300' : ''} ${muted[limb] ? 'opacity-40' : ''} ${enabled ? 'border-cyan-300/60 bg-cyan-500/35 text-cyan-100' : 'border-white/15 bg-zinc-900 text-zinc-500'}`}>{enabled ? 'x' : '-'}</button>)}</div>)}
          </div>
        </div>
        <p className="text-xs text-zinc-400">Amber outlines mark the playing step, including rests. Scroll horizontally on mobile. Swing shifts the spacing to a 2:1 eighth-note feel; count labels remain a subdivision reference.</p>
        <p className="text-xs text-zinc-400">Latin/Clave and Samba labels here are simplified one-bar coordination studies, not complete traditional multi-bar parts. Playback uses synthesized drum sounds.</p>
      </GlassCard>
      <GlassCard className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Session Setup</p>
        <label className="block text-xs text-zinc-300">Tempo {bpm} BPM<input aria-label="Tempo BPM" type="range" min={40} max={240} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} className="mt-2 w-full accent-cyan-400" /></label>
        <div className="grid grid-cols-2 gap-2">{(Object.keys(STYLE_PRESETS) as Style[]).map((style) => <button key={style} onClick={() => applyPreset(style)} className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs">{style}</button>)}</div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={swing} onChange={(event) => setSwing(event.target.checked)} />Swing feel</label>
        <div className="flex flex-wrap gap-2"><button disabled={playing} onClick={() => void start()} className="rounded-lg bg-cyan-700 px-3 py-2 disabled:opacity-50">{playing ? 'Playing' : 'Play'}</button><button disabled={!playing} onClick={() => { stop(); setMessage('Stopped. Session saved.') }} className="rounded-lg border border-white/30 px-3 py-2 disabled:opacity-40">Stop</button><button aria-pressed={loop} onClick={() => setLoop((current) => !current)} className="rounded-lg border border-white/30 px-3 py-2">Loop {loop ? 'On' : 'Off'}</button></div>
        <p role="status" className="text-sm text-cyan-200">{message}</p>
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3"><p>Completed bars: {bars}</p><p className="mt-1 text-sm text-zinc-300">Grid density: {density}%</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border border-white/20 px-3 py-2 text-xs" onClick={() => { try { localStorage.setItem('drummaster-independence-v1', JSON.stringify({ grid, bpm, swing, profile })); setMessage('Exercise saved on this device.') } catch { setMessage('Unable to save: browser storage is unavailable.') } }}>Save exercise</button>
          <button className="rounded-lg border border-white/20 px-3 py-2 text-xs" onClick={() => { const saved = loadCoordination(); if (!saved) { setMessage('No valid saved exercise found.'); return } setGrid(saved.grid); setBpm(saved.bpm); setSwing(saved.swing); setProfile(saved.profile ?? { RH: 'Custom', LH: 'Custom', RF: 'Custom', LF: 'Custom' }); setMessage('Saved exercise loaded. Mute settings are unchanged.') }}>Load exercise</button>
          <button className="rounded-lg border border-white/20 px-3 py-2 text-xs" onClick={() => { try { localStorage.removeItem('drummaster-independence-v1'); setMessage('Saved exercise deleted. Current grid and practice history are unchanged.') } catch { setMessage('Browser storage is unavailable.') } }}>Delete saved</button>
        </div>
        <p className="text-xs text-zinc-400">Practice time and completed bars are saved to Analytics and AI Coach sources. Playback does not measure your playing accuracy.</p>
      </GlassCard>
    </div>
  </div>
}
