import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Play, Plus } from 'lucide-react'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'
import { GROOVES, grooveCount, grooveStepSeconds, loadGroovePlaylist } from './grooveLibraryLogic'
import type { GrooveInstrument, GrooveItem } from './grooveLibraryLogic'
import { createGroovePlayer } from './grooveAudio'

export function GrooveLibraryView() {
  const [styleFilter, setStyleFilter] = useState('All')
  const [playlist, setPlaylist] = useState(loadGroovePlaylist)
  const [selectedId, setSelectedId] = useState('r1')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [bpm, setBpm] = useState(60)
  const [volume, setVolume] = useState(0.3)
  const [loop, setLoop] = useState(true)
  const [active, setActive] = useState(-1)
  const [bars, setBars] = useState(0)
  const [message, setMessage] = useState('Preview a groove to hear its instrument pattern. Highlighted columns follow the audio, including rests.')
  const generation = useRef(0)
  const resource = useRef<{ context: AudioContext; timer: number; frame: number; session: string; bars: number } | null>(null)
  const config = useRef({ bpm, volume, loop })
  useLayoutEffect(() => { config.current = { bpm, volume, loop } }, [bpm, volume, loop])
  const filtered = useMemo(() => GROOVES.filter((groove) => styleFilter === 'All' || groove.style === styleFilter), [styleFilter])
  const selected = GROOVES.find((groove) => groove.id === selectedId) ?? GROOVES[0]
  const stop = (updateUI = true) => {
    generation.current += 1
    const owned = resource.current
    if (owned) {
      window.clearInterval(owned.timer); cancelAnimationFrame(owned.frame)
      stopPracticeSession('groove-library', owned.session, { completedBars: owned.bars })
      void owned.context.close(); resource.current = null
    }
    if (updateUI) { setPlayingId(null); setActive(-1) }
  }
  useEffect(() => {
    const onHidden = () => { if (document.hidden) { stop(); setMessage('Playback stopped because this tab was hidden. Session saved.') } }
    document.addEventListener('visibilitychange', onHidden)
    return () => { document.removeEventListener('visibilitychange', onHidden); stop(false) }
  }, [])
  const preview = async (groove: GrooveItem) => {
    stop(); const token = generation.current
    setSelectedId(groove.id); setPlayingId(groove.id); setBars(0); setMessage('Preparing groove audio...')
    let context: AudioContext | null = null
    try {
      context = new AudioContext(); await context.resume()
      if (token !== generation.current) { void context.close(); return }
      const audio = context
      const play = createGroovePlayer(audio)
      const owned = { context: audio, timer: 0, frame: 0, session: startPracticeSession('groove-library', { grooveId: groove.id, style: groove.style, title: groove.title, bpm: config.current.bpm, meter: groove.meter }), bars: 0 }
      resource.current = owned
      let step = 0
      let next = audio.currentTime + 0.04
      let end: number | null = null
      const visuals: { step: number; time: number }[] = []
      const schedule = () => {
        if (token !== generation.current) return
        if (end !== null && config.current.loop) { end = null; step = 0 }
        while (end === null && next < audio.currentTime + 0.04) {
          if (step === groove.steps) {
            if (!config.current.loop) { end = next; break }
            step = 0
          }
          const current = config.current
          const time = Math.max(next, audio.currentTime)
          for (const [instrument, row] of Object.entries(groove.rows)) if (row[step]) play(instrument as GrooveInstrument, time, row[step] === 1, current.volume)
          visuals.push({ step, time }); next = time + grooveStepSeconds(current.bpm, step, groove.swing); step += 1
          if (step === groove.steps) visuals.push({ step, time: next })
        }
      }
      const animate = () => {
        if (token !== generation.current) return
        while (visuals.length && visuals[0].time <= audio.currentTime) {
          const item = visuals.shift()!
          if (item.step === groove.steps) {
            owned.bars += 1; setBars(owned.bars)
            void trackPracticeEvent('groove-library', 'score', { grooveId: groove.id, completedBars: owned.bars, bpm: config.current.bpm, measuredTiming: false }, owned.session)
          } else setActive(item.step)
        }
        if (end !== null && audio.currentTime >= end) {
          if (config.current.loop) schedule()
          else { stop(); setMessage('One groove bar completed. Session saved.'); return }
        }
        owned.frame = requestAnimationFrame(animate)
      }
      schedule(); owned.timer = window.setInterval(schedule, 20); owned.frame = requestAnimationFrame(animate)
      setMessage('Playing. Tempo, volume, and Loop changes apply to upcoming notes.')
    } catch {
      if (context && context.state !== 'closed') void context.close()
      if (token !== generation.current) return
      stop(); setMessage('Audio could not start. Check browser audio permissions and try again.')
    }
  }
  const updatePlaylist = (next: string[]) => {
    try { localStorage.setItem('drummaster-groove-playlist-v1', JSON.stringify(next)); setPlaylist(next) }
    catch { setMessage('Playlist could not be saved: browser storage is unavailable.') }
  }
  return <div className="space-y-4">
    <SectionHeader title="Groove Library" subtitle="Curated instrument patterns with synchronized playback, loops, and a saved practice playlist." />
    <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
      <GlassCard className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-2">{['All', 'Rock', 'Funk', 'Jazz', 'Latin', 'Metal', 'Progressive'].map((style) => <button key={style} aria-pressed={styleFilter === style} onClick={() => { setStyleFilter(style); if (style !== 'All' && selected.style !== style) { stop(); setSelectedId(GROOVES.find((groove) => groove.style === style)!.id); setBars(0) } }} className={`rounded-lg border px-3 py-2 text-xs ${styleFilter === style ? 'border-cyan-200 bg-cyan-300/20 text-cyan-100' : 'border-white/15 bg-white/5 text-zinc-300'}`}>{style}</button>)}</div>
        <div className="grid gap-2">{filtered.map((groove) => <div key={groove.id} className={`rounded-lg border bg-black/20 p-3 ${selectedId === groove.id ? 'border-cyan-300/60' : 'border-white/10'}`}>
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{groove.title}</p><p className="text-xs text-zinc-400">{groove.style} | {groove.meter} | Suggested BPM {groove.bpmRange}</p></div><span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-[10px] text-cyan-100">{groove.focus}</span></div>
          <p className="mt-2 text-xs text-zinc-300">{groove.notes}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={playingId === groove.id} onClick={() => void preview(groove)} className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100 disabled:opacity-60"><Play size={11} />{playingId === groove.id ? 'Playing' : 'Preview'}</button>
            <button onClick={() => { stop(); setSelectedId(groove.id); setBars(0); setMessage('Groove selected. Preview to hear it.') }} className="rounded-lg border border-white/20 px-2 py-1 text-xs">View groove</button>
            <button disabled={playlist.includes(groove.id)} onClick={() => updatePlaylist([...playlist, groove.id])} className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2 py-1 text-xs disabled:opacity-40"><Plus size={11} />{playlist.includes(groove.id) ? 'Added' : 'Add'}</button>
          </div>
        </div>)}</div>
        <div className="rounded-xl border border-white/15 bg-black/25 p-3">
          <h3 className="font-semibold">Drum Grid: {selected.title}</h3>
          <p className="mt-1 text-xs text-zinc-400">{selected.meter} | {selected.swing ? 'Swing feel (2:1 eighths)' : 'Straight feel'} | Completed bars: {bars}</p>
          <div className="mt-3 overflow-x-auto"><div className="min-w-[540px] space-y-2">
            <div className="grid gap-1 text-center text-xs text-zinc-300" style={{ gridTemplateColumns: `80px repeat(${selected.steps}, minmax(0, 1fr))` }}><span>Count</span>{Array.from({ length: selected.steps }, (_, index) => <span key={index}>{grooveCount(selected, index)}</span>)}</div>
            {Object.entries(selected.rows).map(([instrument, row]) => <div key={instrument} className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${selected.steps}, minmax(0, 1fr))` }}><span className="self-center text-sm text-cyan-100">{instrument}</span>{row.map((strength, index) => <span key={index} aria-label={`${instrument} step ${index + 1}: ${strength === 1 ? 'ghost' : strength ? 'note' : 'rest'}`} className={`flex h-10 items-center justify-center rounded border text-sm ${active === index ? 'ring-2 ring-amber-300' : ''} ${strength === 1 ? 'border-cyan-300/25 bg-cyan-900/25 text-cyan-200' : strength ? 'border-cyan-300/60 bg-cyan-500/30 text-cyan-100' : 'border-white/10 bg-zinc-900 text-zinc-500'}`}>{strength === 1 ? '(x)' : strength ? 'x' : '-'}</span>)}</div>)}
          </div></div>
          <p className="mt-3 text-xs text-zinc-400">x = note, (x) = softer ghost note, - = rest. Amber outlines follow the current column. This is a drum grid, not conventional staff notation. In 7/8, numbers count eighth notes and + marks the halfway sixteenth.</p>
        </div>
      </GlassCard>
      <GlassCard className="min-w-0 space-y-3">
        <h3 className="text-sm font-semibold">Playback Controls</h3>
        <label className="block text-xs text-zinc-300">Tempo {bpm} BPM<input aria-label="Tempo BPM" type="range" min={40} max={240} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} className="mt-2 w-full accent-cyan-400" /></label>
        <label className="block text-xs text-zinc-300">Volume {Math.round(volume * 100)}%<input aria-label="Volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="mt-2 w-full accent-cyan-400" /></label>
        <div className="flex flex-wrap gap-2"><button disabled={!playingId} onClick={() => { stop(); setMessage('Stopped. Session saved.') }} className="rounded-lg border border-white/30 px-3 py-2 disabled:opacity-40">Stop</button><button aria-pressed={loop} onClick={() => setLoop((current) => !current)} className="rounded-lg border border-white/30 px-3 py-2">Loop {loop ? 'On' : 'Off'}</button></div>
        <p role="status" className="text-sm text-cyan-200">{message}</p>
        <p className="text-xs text-zinc-400">Loop Off finishes the current bar. Selecting another groove stops the old audio. Sounds are synthesized. Playback logs time and completed bars, not measured playing accuracy.</p>
        <h3 className="pt-3 text-xs uppercase tracking-wide text-zinc-400">Practice Playlist</h3>
        <div className="space-y-2">{playlist.length ? playlist.map((id, index) => { const groove = GROOVES.find((item) => item.id === id)!; return <div key={id} className="rounded-lg border border-white/15 bg-black/20 p-3"><p className="text-xs">{index + 1}. {groove.title}</p><div className="mt-2 flex flex-wrap gap-2"><button disabled={playingId === groove.id} onClick={() => void preview(groove)} className="rounded border border-cyan-300/30 px-2 py-1 text-xs disabled:opacity-40">{playingId === groove.id ? 'Playing' : 'Play playlist groove'}</button><button aria-label={`Remove ${groove.title}`} onClick={() => updatePlaylist(playlist.filter((item) => item !== id))} className="rounded border border-white/20 px-2 py-1 text-xs">Remove</button></div></div> }) : <p className="text-xs text-zinc-400">No grooves added yet.</p>}</div>
        <p className="text-xs text-zinc-400">Playlist is saved on this device. Select entries individually; it does not auto-advance.</p>
      </GlassCard>
    </div>
  </div>
}
