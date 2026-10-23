import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Plus, Square } from 'lucide-react'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

type GrooveItem = {
  id: string
  style: string
  title: string
  notes: string
  bpmRange: string
  focus: string
}

const grooves: GrooveItem[] = [
  { id: 'r1', style: 'Rock', title: 'Basic Rock Pocket', notes: 'Kick 1&3, Snare 2&4, closed hats', bpmRange: '70-130', focus: 'Solid pulse' },
  { id: 'f1', style: 'Funk', title: 'Ghost Grid Funk', notes: 'Ghost-note snare matrix with sync kicks', bpmRange: '80-115', focus: 'Dynamic control' },
  { id: 'j1', style: 'Jazz', title: 'Ride Comping Core', notes: 'Ride swing + snare comping vocabulary', bpmRange: '120-220', focus: 'Comping flow' },
  { id: 'l1', style: 'Latin', title: 'Songo Starter', notes: 'Cascara shell + tumbao-aware kick phrasing', bpmRange: '90-130', focus: 'Clave alignment' },
  { id: 'm1', style: 'Metal', title: 'Double Bass Engine', notes: '16th bass stream with backbeat accents', bpmRange: '140-220', focus: 'Foot endurance' },
  { id: 'p1', style: 'Progressive', title: '7/8 Linear Grid', notes: 'Odd-meter linear phrase blocks', bpmRange: '90-160', focus: 'Odd-time phrasing' },
]

function playGrooveHit(frequency: number) {
  const context = new AudioContext()
  const osc = context.createOscillator()
  const gain = context.createGain()

  osc.frequency.value = frequency
  osc.type = 'triangle'
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.linearRampToValueAtTime(0.18, context.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.09)

  osc.connect(gain)
  gain.connect(context.destination)
  osc.start()
  osc.stop(context.currentTime + 0.1)

  window.setTimeout(() => void context.close(), 130)
}

export function GrooveLibraryView() {
  const [styleFilter, setStyleFilter] = useState<'All' | GrooveItem['style']>('All')
  const [playlist, setPlaylist] = useState<GrooveItem[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const filtered = useMemo(
    () => (styleFilter === 'All' ? grooves : grooves.filter((item) => item.style === styleFilter)),
    [styleFilter],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
      if (sessionIdRef.current) {
        stopPracticeSession('groove-library', sessionIdRef.current, { reason: 'unmount' })
      }
    }
  }, [])

  function addToPlaylist(item: GrooveItem) {
    setPlaylist((current) => {
      if (current.find((entry) => entry.id === item.id)) return current
      return [...current, item]
    })
  }

  function stopPreview() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (playingId && sessionIdRef.current) {
      stopPracticeSession('groove-library', sessionIdRef.current, { grooveId: playingId })
      sessionIdRef.current = null
    }
    setPlayingId(null)
  }

  function previewGroove(item: GrooveItem) {
    if (playingId === item.id) {
      stopPreview()
      return
    }

    stopPreview()
    setPlayingId(item.id)
    const sessionId = startPracticeSession('groove-library', { grooveId: item.id, style: item.style, title: item.title })
    sessionIdRef.current = sessionId
    void trackPracticeEvent('groove-library', 'score', { action: 'preview', grooveId: item.id }, sessionId)

    const stepFreq = [120, 850, 120, 650]
    let step = 0

    timerRef.current = window.setInterval(() => {
      playGrooveHit(stepFreq[step % stepFreq.length])
      step += 1
    }, 170)
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Groove Library"
        subtitle="Playable curated grooves with style filters, focus tags, and practice playlist builder."
      />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {['All', 'Rock', 'Funk', 'Jazz', 'Latin', 'Metal', 'Progressive'].map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setStyleFilter(style as 'All' | GrooveItem['style'])}
                className={`rounded-lg px-3 py-2 text-xs ${styleFilter === style ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/5 text-zinc-300'}`}
              >
                {style}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
                    <p className="text-xs text-zinc-400">{item.style} | BPM {item.bpmRange}</p>
                  </div>
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-[10px] text-cyan-100">
                    {item.focus}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-300">{item.notes}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => previewGroove(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100"
                  >
                    {playingId === item.id ? <Square size={11} /> : <Play size={11} />} {playingId === item.id ? 'Stop' : 'Preview'}
                  </button>
                  <button
                    type="button"
                    onClick={() => addToPlaylist(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-300/35 bg-violet-300/10 px-2 py-1 text-xs text-violet-100"
                  >
                    <Plus size={11} /> Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Practice Playlist</p>
          <div className="mt-3 space-y-2">
            {playlist.length ? (
              playlist.map((item, idx) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-zinc-200">
                  {idx + 1}. {item.title}
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500">No grooves added yet.</p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
