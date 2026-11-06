import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GlassCard } from '../../shared/components/GlassCard'
import { createGroovePlayer } from '../groove-library/grooveAudio'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { blankBar, CHART_INSTRUMENTS, cycleChartNote, loadSongCharts, newSongChart, parseSongChart, saveSongCharts } from './songChartLogic'
import type { SongChart } from './songChartLogic'

export function SongChartEditor() {
  const [chart, setChart] = useState(newSongChart)
  const [saved, setSaved] = useState(loadSongCharts)
  const [selectedSave, setSelectedSave] = useState('')
  const [selectedBar, setSelectedBar] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(-1)
  const [activeBar, setActiveBar] = useState(0)
  const [loop, setLoop] = useState(false)
  const [volume, setVolume] = useState(0.3)
  const [message, setMessage] = useState('Click cells to cycle: rest  to  note  to  ghost  to  accent  to  rest. Each bar is 4/4 with sixteen slots.')
  const generation = useRef(0)
  const owned = useRef<{ context: AudioContext; timer: number; frame: number; session: string; bars: number } | null>(null)
  const config = useRef({ chart, loop, volume })
  useLayoutEffect(() => { config.current = { chart, loop, volume } }, [chart, loop, volume])
  const stop = (updateUI = true) => {
    generation.current += 1
    const resource = owned.current
    if (resource) {
      window.clearInterval(resource.timer); cancelAnimationFrame(resource.frame)
      stopPracticeSession('song-practice', resource.session, { source: 'chart', completedBars: resource.bars })
      void resource.context.close(); owned.current = null
    }
    if (updateUI) { setPlaying(false); setActive(-1) }
  }
  useEffect(() => {
    const onHidden = () => { if (document.hidden) { stop(); setMessage('Chart stopped because this tab was hidden. Session saved.') } }
    document.addEventListener('visibilitychange', onHidden)
    return () => { document.removeEventListener('visibilitychange', onHidden); stop(false) }
  }, [])
  const start = async () => {
    stop(); const token = generation.current
    setPlaying(true); setActiveBar(0); setMessage('Preparing chart audio...')
    let context: AudioContext | null = null
    try {
      context = new AudioContext(); await context.resume()
      if (token !== generation.current) { void context.close(); return }
      const audio = context; const play = createGroovePlayer(audio)
      const resource = { context: audio, timer: 0, frame: 0, session: startPracticeSession('song-practice', { source: 'chart', chartTitle: chart.title, bpm: chart.bpm, chartBars: chart.bars.length }), bars: 0 }
      owned.current = resource
      let index = 0; let next = audio.currentTime + 0.04; let end: number | null = null
      const visuals: { index: number; time: number; boundary: boolean }[] = []
      const schedule = () => {
        if (token !== generation.current) return
        if (end !== null && config.current.loop) { end = null; index = 0 }
        while (end === null && next < audio.currentTime + 0.04) {
          const current = config.current
          if (index === current.chart.bars.length * 16) {
            if (!current.loop) { end = next; break }
            index = 0
          }
          const time = Math.max(next, audio.currentTime)
          const bar = current.chart.bars[Math.floor(index / 16)]
          for (const instrument of CHART_INSTRUMENTS) {
            const note = bar[instrument][index % 16]
            if (note) play(instrument, time, note === 1, current.volume * (note === 3 ? 1.35 : 0.8))
          }
          visuals.push({ index, time, boundary: false })
          next = time + 60 / current.chart.bpm / 4; index += 1
          if (index % 16 === 0) visuals.push({ index, time: next, boundary: true })
        }
      }
      const animate = () => {
        if (token !== generation.current) return
        while (visuals.length && visuals[0].time <= audio.currentTime) {
          const item = visuals.shift()!
          if (item.boundary) {
            resource.bars += 1
            void trackPracticeEvent('song-practice', 'score', { source: 'chart', completedBars: resource.bars, bpm: config.current.chart.bpm, measuredTiming: false }, resource.session)
          } else { setActiveBar(Math.floor(item.index / 16)); setActive(item.index % 16) }
        }
        if (end !== null && audio.currentTime >= end) {
          if (config.current.loop) schedule()
          else { stop(); setMessage('Chart completed. Session saved.'); return }
        }
        resource.frame = requestAnimationFrame(animate)
      }
      schedule(); resource.timer = window.setInterval(schedule, 20); resource.frame = requestAnimationFrame(animate)
      setMessage('Playing all bars. Tempo, volume, and note edits affect upcoming notes. Loop repeats the complete chart.')
    } catch {
      if (context && context.state !== 'closed') void context.close()
      if (token !== generation.current) return
      stop(); setMessage('Chart audio could not start. Check browser audio permissions and retry.')
    }
  }
  const persist = (update: boolean) => {
    try {
      const entry: SongChart = { ...chart, id: update ? selectedSave : crypto.randomUUID(), title: chart.title.trim() }
      const next = update ? saved.map((item) => item.id === selectedSave ? entry : item) : [...saved, entry]
      saveSongCharts(next); setSaved(next); setChart(entry); setSelectedSave(entry.id); setMessage(update ? 'Selected chart updated.' : 'New chart saved on this device.')
    } catch { setMessage('Could not save. Enter a title and check browser storage.') }
  }
  const importFile = async (file: File) => {
    try {
      if (file.size > 512 * 1024) throw new Error('Too large')
      const imported = parseSongChart(await file.text())
      stop(); setChart(imported); setSelectedBar(0); setSelectedSave(''); setMessage('Chart imported into the editor. Save as new to retain it.')
    } catch { setMessage('Invalid chart JSON. Expected a DrumMaster AI Chart file, maximum 512 KB.') }
  }
  const shownBar = playing ? activeBar : selectedBar
  return <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
    <GlassCard layout={false} className="min-w-0 space-y-3">
      <h3 className="text-lg font-semibold">Editable Drum Chart</h3>
      <p className="text-xs text-zinc-400">4/4 grid editor, not conventional staff notation. PDF recognition is not available yet. Chart playback is separate from uploaded song audio.</p>
      <label className="block text-sm">Chart title<input aria-label="Chart title" disabled={playing} maxLength={80} value={chart.title} onChange={(event) => setChart((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-lg border border-cyan-300/40 bg-zinc-800 p-2" /></label>
      <div className="flex flex-wrap gap-2">{chart.bars.map((_, index) => <button key={index} disabled={playing} aria-pressed={shownBar === index} onClick={() => setSelectedBar(index)} className={`rounded border px-3 py-2 ${shownBar === index ? 'border-amber-200 bg-amber-300/15' : 'border-white/20'}`}>Bar {index + 1}</button>)}</div>
      <div className="overflow-x-auto rounded-lg border border-white/15 bg-black/25 p-2"><div className="min-w-[580px] space-y-3 p-1">
        <div className="grid grid-cols-[80px_repeat(16,minmax(0,1fr))] gap-1 text-center text-xs text-zinc-300"><span>Count</span>{Array.from({ length: 16 }, (_, index) => <span key={index}>{index % 4 === 0 ? index / 4 + 1 : ['e', '&', 'a'][index % 4 - 1]}</span>)}</div>
        {CHART_INSTRUMENTS.map((instrument) => <div key={instrument} className="grid grid-cols-[80px_repeat(16,minmax(0,1fr))] gap-1"><span className="self-center text-sm text-cyan-100">{instrument}</span>{chart.bars[shownBar][instrument].map((note, index) => <button key={index} aria-label={`${instrument} step ${index + 1}: ${['rest', 'ghost', 'note', 'accent'][note]}`} onClick={() => setChart((current) => cycleChartNote(current, shownBar, instrument, index))} className={`flex h-12 items-center justify-center rounded border text-sm ${playing && active === index ? 'ring-2 ring-amber-300' : ''} ${note === 3 ? 'border-amber-300 bg-amber-300/20 text-amber-100' : note ? 'border-cyan-300/40 bg-cyan-500/20 text-cyan-100' : 'border-white/15 bg-zinc-900 text-zinc-500'}`}>{note === 3 ? '>x' : note === 2 ? 'x' : note === 1 ? '(x)' : '-'}</button>)}</div>)}
      </div></div>
      <p className="text-xs text-zinc-400">- rest / x normal / (x) ghost / accented x. Each occupied slot is a sixteenth-note strike; empty slots are rests.</p>
      <div className="flex flex-wrap gap-2"><button disabled={playing || chart.bars.length >= 16} onClick={() => { setChart((current) => ({ ...current, bars: [...current.bars, blankBar()] })); setSelectedBar(chart.bars.length) }} className="rounded border border-white/20 px-3 py-2 disabled:opacity-40">Add blank bar</button><button disabled={playing || chart.bars.length >= 16} onClick={() => { const copy = structuredClone(chart.bars[selectedBar]); setChart((current) => ({ ...current, bars: [...current.bars, copy] })); setSelectedBar(chart.bars.length) }} className="rounded border border-white/20 px-3 py-2 disabled:opacity-40">Duplicate bar</button><button disabled={playing || chart.bars.length === 1} onClick={() => { setChart((current) => ({ ...current, bars: current.bars.filter((_, index) => index !== selectedBar) })); setSelectedBar(0) }} className="rounded border border-white/20 px-3 py-2 disabled:opacity-40">Remove bar</button></div>
      <p role="status" className="text-sm text-cyan-200">{message}</p>
    </GlassCard>
    <GlassCard layout={false} className="min-w-0 space-y-3">
      <h3 className="font-semibold">Chart Controls</h3>
      <label className="block text-sm">Tempo {chart.bpm} BPM<input aria-label="Chart BPM" type="range" min={40} max={240} value={chart.bpm} onChange={(event) => setChart((current) => ({ ...current, bpm: Number(event.target.value) }))} className="mt-2 w-full accent-cyan-400" /></label>
      <label className="block text-sm">Volume {Math.round(volume * 100)}%<input aria-label="Chart volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="mt-2 w-full accent-cyan-400" /></label>
      <div className="flex flex-wrap gap-2"><button disabled={playing} onClick={() => void start()} className="rounded bg-cyan-700 px-3 py-2 disabled:opacity-40">{playing ? 'Playing' : 'Play chart'}</button><button disabled={!playing} onClick={() => { stop(); setMessage('Chart stopped. Session saved.') }} className="rounded border border-white/30 px-3 py-2 disabled:opacity-40">Stop chart</button><button aria-pressed={loop} onClick={() => setLoop((current) => !current)} className="rounded border border-white/30 px-3 py-2">Loop {loop ? 'On' : 'Off'}</button></div>
      <label className="block text-sm">Saved charts<select aria-label="Saved charts" disabled={playing} value={selectedSave} onChange={(event) => setSelectedSave(event.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-2"><option value="">Select chart</option>{saved.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <div className="flex flex-wrap gap-2"><button disabled={playing} onClick={() => persist(false)} className="rounded border border-white/20 px-3 py-2 disabled:opacity-40">Save as new</button><button disabled={playing || !selectedSave} onClick={() => persist(true)} className="rounded border border-white/20 px-3 py-2 disabled:opacity-40">Update selected chart</button><button disabled={playing || !selectedSave} onClick={() => { const loaded = saved.find((item) => item.id === selectedSave); if (loaded) { setChart(structuredClone(loaded)); setSelectedBar(0); setMessage('Saved chart loaded.') } }} className="rounded border border-white/20 px-3 py-2 disabled:opacity-40">Load chart</button><button disabled={playing || !selectedSave} onClick={() => { try { const next = saved.filter((item) => item.id !== selectedSave); saveSongCharts(next); setSaved(next); setSelectedSave(''); setMessage('Selected save deleted. Editor and practice history are unchanged.') } catch { setMessage('Could not delete saved chart.') } }} className="rounded border border-white/20 px-3 py-2 disabled:opacity-40">Delete saved chart</button></div>
      <button onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify({ app: 'DrumMaster AI Chart', schema: 1, chart }, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'drummaster-chart.json'; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000) }} className="rounded border border-white/20 px-3 py-2">Export chart JSON</button>
      <label className="block text-sm">Import chart JSON<input aria-label="Import chart JSON" disabled={playing} type="file" accept=".json,application/json" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importFile(file) }} className="mt-2 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-cyan-300 file:p-2 file:text-slate-950" /></label>
      <p className="text-xs text-zinc-400">Up to 16 bars. Structural edits stop while playing; note edits stay live. Chart saves are local and are not included in practice-history backups. Export chart JSON to back them up. Playback records practice time, not measured accuracy.</p>
    </GlassCard>
  </div>
}
