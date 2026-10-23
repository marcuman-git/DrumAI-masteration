import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Shuffle, Square } from 'lucide-react'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const rudiments = {
  Singles: ['Single Stroke Roll', 'Single Stroke Four', 'Single Stroke Seven'],
  Doubles: ['Double Stroke Roll', 'Five Stroke Roll', 'Nine Stroke Roll'],
  Paradiddles: ['Single Paradiddle', 'Double Paradiddle', 'Paradiddle-Diddle'],
  Flams: ['Flam', 'Flam Accent', 'Flamacue'],
  Drags: ['Drag', 'Single Drag Tap', 'Double Drag Tap'],
  Ratamacues: ['Single Ratamacue', 'Double Ratamacue', 'Triple Ratamacue'],
}

const stickingExamples = ['R L R R L R L L', 'R L R L R R L L', 'R R L R L L R L']

function playTick(frequency: number) {
  const context = new AudioContext()
  const osc = context.createOscillator()
  const gain = context.createGain()

  osc.frequency.value = frequency
  osc.type = 'triangle'
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.linearRampToValueAtTime(0.2, context.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.08)

  osc.connect(gain)
  gain.connect(context.destination)
  osc.start()
  osc.stop(context.currentTime + 0.09)

  window.setTimeout(() => void context.close(), 120)
}

export function RudimentTrainerView() {
  const [category, setCategory] = useState<keyof typeof rudiments>('Paradiddles')
  const [mode, setMode] = useState<'Learn' | 'Practice' | 'Challenge' | 'Mastery'>('Practice')
  const [tempo, setTempo] = useState(60)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef<number | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const pattern = useMemo(
    () => stickingExamples[Math.floor(Math.random() * stickingExamples.length)],
    [category, mode],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
      if (sessionIdRef.current) {
        stopPracticeSession('rudiments', sessionIdRef.current, { reason: 'unmount' })
      }
    }
  }, [])

  function handlePlay() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
    }
    if (sessionIdRef.current) {
      stopPracticeSession('rudiments', sessionIdRef.current, { reason: 'restart' })
    }

    const sessionId = startPracticeSession('rudiments', { category, mode, tempo })
    sessionIdRef.current = sessionId
    void trackPracticeEvent('rudiments', 'score', { action: 'play', category, mode, tempo }, sessionId)

    setIsPlaying(true)
    const intervalMs = Math.max(120, Math.round(60000 / tempo))
    let step = 0

    timerRef.current = window.setInterval(() => {
      const tokens = pattern.split(' ')
      const token = tokens[step % tokens.length]
      playTick(token === 'R' ? 900 : 650)
      step += 1
    }, intervalMs)
  }

  function handleStop() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (sessionIdRef.current) {
      stopPracticeSession('rudiments', sessionIdRef.current, { category, mode, tempo })
      sessionIdRef.current = null
    }
    setIsPlaying(false)
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Rudiment Trainer"
        subtitle="All PAS categories with learn, practice, challenge, and mastery workflows."
      />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.keys(rudiments).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key as keyof typeof rudiments)}
                className={`rounded-lg px-3 py-2 text-xs ${category === key ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/5 text-zinc-300'}`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {rudiments[category].map((name) => (
              <div key={name} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-medium text-zinc-100">{name}</p>
                <p className="text-xs text-zinc-400">Tempo progression + audio demo + sticking animation</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-4">
            <p className="text-xs uppercase tracking-wide text-cyan-100">Animated Sticking Display</p>
            <p className="mt-2 text-3xl font-semibold tracking-[0.35em] text-zinc-50">{pattern}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <label className="text-xs text-zinc-300">
              Tempo {tempo} BPM
              <input
                type="range"
                min={40}
                max={220}
                value={tempo}
                onChange={(event) => setTempo(Number(event.target.value))}
                className="mt-2 w-full accent-cyan-400"
              />
            </label>
            <button
              type="button"
              onClick={handlePlay}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100"
            >
              <Play size={12} /> Play
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={!isPlaying}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200 disabled:opacity-60"
            >
              <Square size={12} /> Stop
            </button>
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <SectionHeader title="Modes" />
          {(['Learn', 'Practice', 'Challenge', 'Mastery'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${mode === item ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100' : 'border-white/10 text-zinc-300'}`}
            >
              {item} mode
            </button>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-violet-300/40 bg-violet-300/10 px-3 py-2 text-xs text-violet-100"
          >
            <Shuffle size={14} /> Randomized Practice
          </button>
        </GlassCard>
      </div>
    </div>
  )
}
