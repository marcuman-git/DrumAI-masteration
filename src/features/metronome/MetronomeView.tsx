import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Square, WandSparkles } from 'lucide-react'
import { MetronomeEngine } from '../../core/services/audio/metronomeEngine'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const subdivisionOptions = [
  { label: 'Quarter', value: 1 },
  { label: 'Eighth', value: 2 },
  { label: 'Triplet', value: 3 },
  { label: '16th', value: 4 },
  { label: 'Quintuplet', value: 5 },
  { label: 'Sextuplet', value: 6 },
  { label: 'Septuplet', value: 7 },
]

const tempoPresets = [60, 75, 90, 105, 120, 135, 150, 180]
const subdivisionLabelByValue: Record<number, string> = {
  1: 'Quarter',
  2: 'Eighth',
  3: 'Triplet',
  4: '16th',
  5: 'Quintuplet',
  6: 'Sextuplet',
  7: 'Septuplet',
}

export function MetronomeView() {
  const engineRef = useRef(new MetronomeEngine())
  const tapTimes = useRef<number[]>([])
  const sessionIdRef = useRef<string | null>(null)

  const [isRunning, setIsRunning] = useState(false)
  const [bpm, setBpm] = useState(60)
  const [subdivision, setSubdivision] = useState(1)
  const [swing, setSwing] = useState(0)
  const [humanize, setHumanize] = useState(0)
  const [clickVolume, setClickVolume] = useState(0.3)
  const [randomTempo, setRandomTempo] = useState(false)
  const [increasingTempo, setIncreasingTempo] = useState(false)
  const [animationSeed, setAnimationSeed] = useState(0)

  const accentPattern = useMemo(() => [1.8, 1, 1, 1], [])

  useEffect(() => {
    if (!isRunning) return

    engineRef.current.start(
      {
        bpm,
        subdivision,
        swing,
        humanizeMs: humanize,
        accentPattern,
        clickVolume,
      },
      () => {
        // no-op visual pulse handled by animation timing
      },
    )

    return () => {
      engineRef.current.stop()
    }
  }, [isRunning, bpm, subdivision, swing, humanize, accentPattern, clickVolume])

  useEffect(() => {
    if (!randomTempo || !isRunning) return
    const interval = window.setInterval(() => {
      const randomBpm = Math.floor(Math.random() * 51) + 50
      applyBpm(randomBpm)
    }, 4000)

    return () => window.clearInterval(interval)
  }, [randomTempo, isRunning])

  useEffect(() => {
    if (!increasingTempo || !isRunning) return
    const interval = window.setInterval(() => {
      setBpm((current) => {
        const next = Math.min(240, current + 2)
        if (sessionIdRef.current) {
          void trackPracticeEvent('metronome', 'score', { action: 'increasing-tempo-step', bpm: next }, sessionIdRef.current)
        }
        return next
      })
    }, 20000)
    return () => window.clearInterval(interval)
  }, [increasingTempo, isRunning])

  useEffect(() => {
    if (!isRunning) return
    setAnimationSeed((value) => value + 1)
  }, [bpm, subdivision, isRunning])

  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        stopPracticeSession('metronome', sessionIdRef.current, { reason: 'unmount' })
      }
    }
  }, [])

  function handleTapTempo() {
    const now = performance.now()
    tapTimes.current.push(now)
    tapTimes.current = tapTimes.current.slice(-5)

    if (tapTimes.current.length >= 2) {
      const intervals = tapTimes.current.slice(1).map((time, index) => time - tapTimes.current[index])
      const avg = intervals.reduce((acc, val) => acc + val, 0) / intervals.length
      const tappedBpm = Math.round(60000 / avg)
      applyBpm(tappedBpm)
      void trackPracticeEvent('metronome', 'score', { action: 'tap-tempo', bpm: tappedBpm }, sessionIdRef.current ?? undefined)
    }
  }

  function applyBpm(nextBpm: number) {
    const clamped = Math.min(240, Math.max(40, nextBpm))
    setBpm(clamped)
    if (isRunning) {
      void trackPracticeEvent('metronome', 'score', { action: 'bpm-change-live', bpm: clamped }, sessionIdRef.current ?? undefined)
    }
  }

  function applySubdivision(nextSubdivision: number) {
    const clamped = Math.min(7, Math.max(1, nextSubdivision))
    setSubdivision(clamped)
    if (isRunning) {
      void trackPracticeEvent(
        'metronome',
        'score',
        { action: 'subdivision-change-live', subdivision: clamped, bpm },
        sessionIdRef.current ?? undefined,
      )
    }
  }

  function handleStartStop() {
    if (!isRunning) {
      const sessionId = startPracticeSession('metronome', { bpm, subdivision, swing, humanizeMs: humanize })
      sessionIdRef.current = sessionId
      setIsRunning(true)
      return
    }

    if (sessionIdRef.current) {
      stopPracticeSession('metronome', sessionIdRef.current, { bpm, subdivision, swing, humanizeMs: humanize })
      sessionIdRef.current = null
    }
    setIsRunning(false)
  }

  function handleToggleRandomTempo() {
    setRandomTempo((value) => {
      const next = !value
      if (next) setIncreasingTempo(false)
      return next
    })
  }

  function handleToggleIncreasingTempo() {
    setIncreasingTempo((value) => {
      const next = !value
      if (next) setRandomTempo(false)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Smart Metronome"
        subtitle="[v0.4.7] Advanced click engine with random/increasing tempo modes, accents, swing, and visual pulse."
      />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">BPM</p>
              <p className="text-6xl font-semibold text-zinc-50">{bpm}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleTapTempo}
                className="rounded-xl border border-cyan-400/30 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100"
              >
                Tap Tempo
              </button>
              <button
                type="button"
                onClick={handleStartStop}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-zinc-50"
              >
                {isRunning ? <Square size={14} className="inline" /> : <Play size={14} className="inline" />} {isRunning ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>

          <input
            type="range"
            min={40}
            max={240}
            value={bpm}
            onChange={(event) => applyBpm(Number(event.target.value))}
            className="w-full accent-cyan-400"
          />

          <div className="flex flex-wrap gap-2">
            {tempoPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyBpm(preset)}
                className="rounded-lg border border-white/10 px-3 py-1 text-xs text-zinc-200 hover:border-cyan-300/60"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-zinc-300">
              Subdivision
              <select
                value={subdivision}
                onChange={(event) => applySubdivision(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
              >
                {subdivisionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-zinc-300">
              Swing {swing.toFixed(2)}
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={swing}
                onChange={(event) => setSwing(Number(event.target.value))}
                className="mt-2 w-full accent-violet-300"
              />
            </label>

            <label className="text-xs text-zinc-300">
              Humanize {humanize}ms
              <input
                type="range"
                min={0}
                max={16}
                value={humanize}
                onChange={(event) => setHumanize(Number(event.target.value))}
                className="mt-2 w-full accent-amber-300"
              />
            </label>
          </div>

          <label className="block text-xs text-zinc-300">
            Click Volume {Math.round(clickVolume * 100)}%
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.01}
              value={clickVolume}
              onChange={(event) => setClickVolume(Number(event.target.value))}
              className="mt-2 w-full accent-cyan-300"
            />
          </label>

          <button
            type="button"
            onClick={handleToggleRandomTempo}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2 text-xs text-violet-100"
          >
            <WandSparkles size={14} />
            Random Tempo (50-100) {randomTempo ? 'On' : 'Off'}
          </button>

          <button
            type="button"
            onClick={handleToggleIncreasingTempo}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100"
          >
            Increasing Tempo (+2 / 20s) {increasingTempo ? 'On' : 'Off'}
          </button>
        </GlassCard>

        <GlassCard className="flex flex-col items-center justify-center gap-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Visual Metronome</p>
          <div className="relative h-64 w-44 rounded-t-full border border-white/10 bg-zinc-950/60">
            <div className="absolute left-1/2 top-4 h-48 w-1 -translate-x-1/2 bg-white/10" />
            <motion.div
              key={`${isRunning ? 'run' : 'stop'}-${bpm}-${subdivision}-${animationSeed}`}
              animate={{ rotate: isRunning ? [-28, 28] : 0 }}
              transition={{
                duration: Math.max(0.12, 60 / (bpm * subdivision)),
                ease: [0.45, 0, 0.55, 1],
                repeat: isRunning ? Infinity : 0,
                repeatType: 'reverse',
              }}
              className="absolute left-1/2 top-4 h-48 w-1 origin-bottom -translate-x-1/2 bg-cyan-300"
            >
              <span className="absolute -left-1.5 top-0 h-4 w-4 rounded-full bg-cyan-200" />
            </motion.div>
            <div className="absolute bottom-4 left-1/2 h-7 w-16 -translate-x-1/2 rounded-lg border border-white/10 bg-black/50" />
          </div>
          <div className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-center text-sm text-cyan-100">
            <p className="text-xs text-zinc-300">Subdivision</p>
            <p>{subdivisionLabelByValue[subdivision]}</p>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
