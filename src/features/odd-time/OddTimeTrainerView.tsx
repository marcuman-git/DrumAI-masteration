import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'
import { createGroovePlayer } from '../groove-library/grooveAudio'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { GROUPINGS, groupingRows, groupingStarts, meterParts, METERS, oddPattern, unitSeconds } from './oddTimeLogic'
import type { OddMeter, OddMode } from './oddTimeLogic'

export function OddTimeTrainerView() {
  const [meter, setMeter] = useState<OddMeter>('7/8')
  const [groupIndex, setGroupIndex] = useState(0)
  const [mode, setMode] = useState<OddMode>('Click')
  const [bpm, setBpm] = useState(60)
  const [volume, setVolume] = useState(0.3)
  const [loop, setLoop] = useState(true)
  const [accents, setAccents] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(-1)
  const [bars, setBars] = useState(0)
  const [message, setMessage] = useState('Count each group separately, then connect the groups into a complete bar.')
  const grouping = GROUPINGS[meter][groupIndex]
  const starts = groupingStarts(grouping)
  const pattern = oddPattern(meter, grouping, mode)
  const generation = useRef(0)
  const resource = useRef<{ context: AudioContext; timer: number; frame: number; session: string; bars: number } | null>(null)
  const config = useRef({ bpm, volume, loop, accents })
  useLayoutEffect(() => { config.current = { bpm, volume, loop, accents } }, [bpm, volume, loop, accents])
  const stop = (updateUI = true) => {
    generation.current += 1
    const owned = resource.current
    if (owned) {
      window.clearInterval(owned.timer); cancelAnimationFrame(owned.frame)
      stopPracticeSession('odd-time', owned.session, { completedBars: owned.bars })
      void owned.context.close(); resource.current = null
    }
    if (updateUI) { setPlaying(false); setActive(-1) }
  }
  useEffect(() => {
    const onHidden = () => { if (document.hidden) { stop(); setMessage('Playback stopped because this tab was hidden. Session saved.') } }
    document.addEventListener('visibilitychange', onHidden)
    return () => { document.removeEventListener('visibilitychange', onHidden); stop(false) }
  }, [])
  const resetPattern = () => { stop(); setBars(0); setMessage('Exercise changed. Press Play to start from the beginning.') }
  const start = async () => {
    stop(); const token = generation.current
    setPlaying(true); setBars(0); setMessage('Preparing audio...')
    let context: AudioContext | null = null
    try {
      context = new AudioContext(); await context.resume()
      if (token !== generation.current) { void context.close(); return }
      const audio = context
      const playDrum = createGroovePlayer(audio)
      const owned = { context: audio, timer: 0, frame: 0, session: startPracticeSession('odd-time', { meter, grouping: grouping.join('+'), mode, bpm: config.current.bpm }), bars: 0 }
      resource.current = owned
      let step = 0
      let next = audio.currentTime + 0.04
      let end: number | null = null
      const visuals: { step: number; time: number }[] = []
      const click = (time: number, accented: boolean, level: number) => {
        if (level <= 0) return
        const oscillator = audio.createOscillator(); const gain = audio.createGain()
        oscillator.frequency.value = accented ? 1540 : 980
        oscillator.type = accented ? 'triangle' : 'sine'
        gain.gain.setValueAtTime(Math.max(0.0001, level * (accented ? 0.65 : 0.4)), time)
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045)
        oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(time); oscillator.stop(time + 0.05)
      }
      const schedule = () => {
        if (token !== generation.current) return
        if (end !== null && config.current.loop) { end = null; step = 0 }
        while (end === null && next < audio.currentTime + 0.04) {
          if (step === pattern.length) {
            if (!config.current.loop) { end = next; break }
            step = 0
          }
          const current = config.current
          const time = Math.max(next, audio.currentTime)
          const note = pattern[step]
          if (mode === 'Click') click(time, current.accents && note.accent, current.volume)
          else if (mode === 'Fill') playDrum('Snare', time, current.accents && !note.accent, current.volume)
          else {
            if (note.hat) playDrum('Hi-hat', time, false, current.volume * 0.6)
            if (note.kick) playDrum('Kick', time, false, current.volume)
            if (note.snare) playDrum('Snare', time, false, current.volume)
          }
          visuals.push({ step, time }); next = time + unitSeconds(meter, current.bpm); step += 1
          if (step === pattern.length) visuals.push({ step, time: next })
        }
      }
      const animate = () => {
        if (token !== generation.current) return
        while (visuals.length && visuals[0].time <= audio.currentTime) {
          const item = visuals.shift()!
          if (item.step === pattern.length) {
            owned.bars += 1; setBars(owned.bars)
            void trackPracticeEvent('odd-time', 'score', { meter, grouping: grouping.join('+'), mode, bpm: config.current.bpm, completedBars: owned.bars, measuredTiming: false }, owned.session)
          } else setActive(item.step)
        }
        if (end !== null && audio.currentTime >= end) {
          if (config.current.loop) schedule()
          else { stop(); setMessage('One complete bar played. Session saved.'); return }
        }
        owned.frame = requestAnimationFrame(animate)
      }
      schedule(); owned.timer = window.setInterval(schedule, 20); owned.frame = requestAnimationFrame(animate)
      setMessage('Playing. BPM, volume, Loop, and accent settings update on upcoming notes.')
    } catch {
      if (context && context.state !== 'closed') void context.close()
      if (token !== generation.current) return
      stop(); setMessage('Audio could not start. Check browser audio permissions and try again.')
    }
  }
  const unit = meterParts(meter).denominator === 4 ? 'quarter' : meterParts(meter).denominator === 8 ? 'eighth' : 'sixteenth'
  const compact = meter.endsWith('/16')
  return <div className="space-y-4">
    <SectionHeader title="Odd Time Trainer" subtitle="Learn odd meters by grouping, counting, and playing complete musical bars." />
    <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
      <GlassCard layout="position" className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-2">{METERS.map((value) => <button key={value} aria-pressed={meter === value} onClick={() => { resetPattern(); setMeter(value); setGroupIndex(0) }} className={`rounded-lg border px-3 py-2 ${meter === value ? 'border-cyan-200 bg-cyan-300/20 text-cyan-100' : 'border-white/15 bg-white/5'}`}>{value}</button>)}</div>
        <h3 className="text-sm font-semibold">Group the bar</h3>
        <div className="flex flex-wrap gap-2">{GROUPINGS[meter].map((value, index) => <button key={value.join('+')} aria-pressed={groupIndex === index} onClick={() => { resetPattern(); setGroupIndex(index) }} className={`rounded-lg border px-3 py-2 text-sm ${groupIndex === index ? 'border-amber-200 bg-amber-300/15 text-amber-100' : 'border-white/15'}`}>{value.join(' + ')}</button>)}</div>
        <div className={`rounded-lg border border-white/15 bg-black/25 p-2 ${compact ? '' : 'overflow-x-auto'}`}>
          {groupingRows(meter, grouping).map((groups, row) => <div key={row} data-testid={`odd-group-row-${row}`} className={compact ? 'mb-3 grid gap-2 p-1 last:mb-0' : 'flex min-w-max gap-3 p-1'} style={compact ? { gridTemplateColumns: groups.map(({ length }) => `${length}fr`).join(' ') } : undefined}>
            {groups.map(({ length, group }) => <div key={group} className={`min-w-0 rounded-lg border border-cyan-300/30 ${compact ? 'p-1' : 'p-2'}`}><p className="mb-2 text-center text-xs text-cyan-200">{compact ? `G${group + 1}: ${length}` : `Group ${group + 1}: ${length}`}</p>
              <div className={compact ? 'grid gap-1' : 'flex gap-2'} style={compact ? { gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` } : undefined}>{Array.from({ length }, (_, offset) => {
                const index = starts[group] + offset; const note = pattern[index]
                const label = mode === 'Fill' ? note.hand : mode === 'Click' ? note.accent && accents ? compact ? '>' : 'Accent' : compact ? 'x' : 'Click' : compact ? note.kick ? 'K+H' : note.snare ? 'S+H' : 'H' : note.kick ? 'Kick' : note.snare ? 'Snare' : 'Hi-hat'
                return <div key={offset} data-testid={`odd-unit-${index}`} className={`flex h-24 min-w-0 flex-col items-center justify-center rounded-lg border ${compact ? 'w-full' : 'w-14'} ${active === index ? 'border-amber-200 bg-amber-300/20 ring-2 ring-amber-300' : 'border-white/15 bg-zinc-900'}`}><p className="text-xl font-semibold">{offset + 1}</p><p className={`mt-1 text-cyan-200 ${compact ? 'text-[10px]' : 'text-xs'}`}>{label}</p>{!compact && mode === 'Groove' && (note.kick || note.snare) && <p className="text-[10px] text-zinc-400">+ Hi-hat</p>}</div>
              })}</div>
            </div>)}
          </div>)}
        </div>
        {compact && <p className="text-xs text-zinc-400">Two-row view: G = group, &gt; = accented click, x = click, K = kick, S = snare, H = hi-hat. The second row continues the same bar.</p>}
        <p className="text-sm text-zinc-300">Count aloud: {grouping.map((length) => Array.from({ length }, (_, index) => index + 1).join('-')).join(' | ')}</p>
        <p className="text-xs text-zinc-400">Each card represents one {unit} note. Group borders show the phrasing. This is a counting grid, not conventional staff notation. Fill mode is a simple alternating-hand grouping study.</p>
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3"><p>{meter} = {grouping.join(' + ')} {unit} notes</p><p className="mt-1 text-sm text-zinc-300">One bar: {(unitSeconds(meter, bpm) * pattern.length).toFixed(2)} seconds at {bpm} BPM. Completed bars: {bars}</p></div>
      </GlassCard>
      <GlassCard layout="position" className="min-w-0 space-y-4">
        <h3 className="font-semibold">Practice Controls</h3>
        <div className="flex flex-wrap gap-2">{(['Click', 'Groove', 'Fill'] as OddMode[]).map((value) => <button key={value} aria-pressed={mode === value} onClick={() => { resetPattern(); setMode(value) }} className={`rounded-lg border px-3 py-2 ${mode === value ? 'border-cyan-200 bg-cyan-300/20' : 'border-white/15'}`}>{value}</button>)}</div>
        <label className="block text-sm">Tempo {bpm} BPM<input aria-label="Tempo BPM" type="range" min={40} max={240} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} className="mt-2 w-full accent-cyan-400" /></label>
        <p className="text-xs text-zinc-400">BPM always refers to quarter notes. In /8, cards play twice per quarter; in /16, four times per quarter.</p>
        <label className="block text-sm">Volume {Math.round(volume * 100)}%<input aria-label="Volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="mt-2 w-full accent-cyan-400" /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" disabled={mode === 'Groove'} checked={accents} onChange={(event) => setAccents(event.target.checked)} />Accent group starts (Click / Fill)</label>
        <div className="flex flex-wrap gap-2"><button disabled={playing} onClick={() => void start()} className="rounded-lg bg-cyan-700 px-3 py-2 disabled:opacity-50">{playing ? 'Playing' : 'Play'}</button><button disabled={!playing} onClick={() => { stop(); setMessage('Stopped. Session saved.') }} className="rounded-lg border border-white/30 px-3 py-2 disabled:opacity-40">Stop</button><button aria-pressed={loop} onClick={() => setLoop((current) => !current)} className="rounded-lg border border-white/30 px-3 py-2">Loop {loop ? 'On' : 'Off'}</button></div>
        <p role="status" className="text-sm text-cyan-200">{message}</p>
        <p className="text-xs text-zinc-400">Changing meter, grouping, or mode stops the previous exercise. Loop Off completes the current bar. Playback records time and completed bars in Analytics and AI Coach sources, not measured playing accuracy.</p>
      </GlassCard>
    </div>
  </div>
}
