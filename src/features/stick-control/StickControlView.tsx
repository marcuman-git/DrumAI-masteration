import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Square } from 'lucide-react'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const basePatterns = ['RLRL', 'RRLL', 'RLLR', 'RLRR', 'LLRL']

function randomPattern(length: number): string {
  return Array.from({ length }, () => (Math.random() > 0.5 ? 'R' : 'L')).join('')
}

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

export function StickControlView() {
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'>('Intermediate')
  const [seed, setSeed] = useState(0)
  const [tempo, setTempo] = useState(60)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef<number | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const generated = useMemo(() => {
    const sizeByDifficulty = {
      Beginner: 4,
      Intermediate: 8,
      Advanced: 12,
      Expert: 16,
    } as const

    return [
      ...basePatterns,
      randomPattern(sizeByDifficulty[difficulty]),
      randomPattern(sizeByDifficulty[difficulty]),
      randomPattern(sizeByDifficulty[difficulty]),
    ]
  }, [difficulty, seed])

  const activePattern = generated[0]

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
      if (sessionIdRef.current) {
        stopPracticeSession('stick-control', sessionIdRef.current, { reason: 'unmount' })
      }
    }
  }, [])

  function handlePlay() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
    }
    if (sessionIdRef.current) {
      stopPracticeSession('stick-control', sessionIdRef.current, { reason: 'restart' })
    }

    const sessionId = startPracticeSession('stick-control', { difficulty, tempo })
    sessionIdRef.current = sessionId
    void trackPracticeEvent('stick-control', 'score', { action: 'play', difficulty, tempo }, sessionId)
    setIsPlaying(true)
    const intervalMs = Math.max(120, Math.round(60000 / tempo))
    let step = 0

    timerRef.current = window.setInterval(() => {
      const token = activePattern[step % activePattern.length]
      playTick(token === 'R' ? 920 : 660)
      step += 1
    }, intervalMs)
  }

  function handleStop() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (sessionIdRef.current) {
      stopPracticeSession('stick-control', sessionIdRef.current, { difficulty, tempo })
      sessionIdRef.current = null
    }
    setIsPlaying(false)
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Stick Control Trainer" subtitle="Unlimited sticking generation with accents, hand lead, and dynamics." />

      <div className="grid gap-3 lg:grid-cols-[1.8fr_1fr]">
        <GlassCard className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Generated Patterns</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {generated.map((pattern, index) => (
              <div key={`${pattern}-${index}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="font-mono text-xl tracking-[0.3em] text-cyan-100">{pattern}</p>
              </div>
            ))}
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
              <Play size={12} /> {isPlaying ? 'Playing...' : 'Play'}
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
          <p className="text-xs uppercase tracking-wide text-zinc-400">Variation Settings</p>
          {(['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setDifficulty(level)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${difficulty === level ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/5 text-zinc-300'}`}
            >
              {level}
            </button>
          ))}
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" defaultChecked className="accent-cyan-400" /> Accent variations
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" defaultChecked className="accent-cyan-400" /> Hand lead variation
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" defaultChecked className="accent-cyan-400" /> Dynamic variation
          </label>
          <button
            type="button"
            onClick={() => setSeed((value) => value + 1)}
            className="rounded-lg border border-violet-300/40 bg-violet-300/10 px-3 py-2 text-xs text-violet-100"
          >
            Regenerate
          </button>
        </GlassCard>
      </div>
    </div>
  )
}
