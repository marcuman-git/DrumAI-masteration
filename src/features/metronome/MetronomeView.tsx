import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Square, WandSparkles } from 'lucide-react'
import { MetronomeEngine } from '../../core/services/audio/metronomeEngine'
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

export function MetronomeView() {
  const engineRef = useRef(new MetronomeEngine())
  const tapTimes = useRef<number[]>([])

  const [isRunning, setIsRunning] = useState(false)
  const [bpm, setBpm] = useState(60)
  const [subdivision, setSubdivision] = useState(1)
  const [swing, setSwing] = useState(0)
  const [humanize, setHumanize] = useState(0)
  const [clickVolume, setClickVolume] = useState(0.3)
  const [randomTempo, setRandomTempo] = useState(false)
  const [activeBeat, setActiveBeat] = useState(0)

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
      (beat) => {
        setActiveBeat(beat % 16)
      },
    )

    return () => {
      engineRef.current.stop()
    }
  }, [isRunning, bpm, subdivision, swing, humanize, accentPattern, clickVolume])

  useEffect(() => {
    if (!randomTempo || !isRunning) return
    const interval = window.setInterval(() => {
      setBpm((current) => Math.min(220, Math.max(40, current + (Math.random() > 0.5 ? 2 : -2))))
    }, 4000)

    return () => window.clearInterval(interval)
  }, [randomTempo, isRunning])

  function handleTapTempo() {
    const now = performance.now()
    tapTimes.current.push(now)
    tapTimes.current = tapTimes.current.slice(-5)

    if (tapTimes.current.length >= 2) {
      const intervals = tapTimes.current.slice(1).map((time, index) => time - tapTimes.current[index])
      const avg = intervals.reduce((acc, val) => acc + val, 0) / intervals.length
      setBpm(Math.round(60000 / avg))
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Smart Metronome"
        subtitle="Advanced click engine with accents, random tempo, swing, humanization, and visual pulse."
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
                onClick={() => setIsRunning((value) => !value)}
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
            onChange={(event) => setBpm(Number(event.target.value))}
            className="w-full accent-cyan-400"
          />

          <div className="flex flex-wrap gap-2">
            {tempoPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setBpm(preset)}
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
                onChange={(event) => setSubdivision(Number(event.target.value))}
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
            onClick={() => setRandomTempo((value) => !value)}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2 text-xs text-violet-100"
          >
            <WandSparkles size={14} />
            Random Tempo Mode {randomTempo ? 'On' : 'Off'}
          </button>
        </GlassCard>

        <GlassCard className="flex flex-col items-center justify-center">
          <p className="mb-4 text-xs uppercase tracking-wide text-zinc-400">Beat Wheel</p>
          <div className="relative grid h-60 w-60 place-items-center rounded-full border border-white/10 bg-zinc-950/50">
            {Array.from({ length: 16 }).map((_, i) => {
              const active = i === activeBeat
              const angle = (i / 16) * Math.PI * 2
              const x = Math.cos(angle) * 100
              const y = Math.sin(angle) * 100
              return (
                <motion.span
                  key={i}
                  animate={{ scale: active ? 1.4 : 1, opacity: active ? 1 : 0.5 }}
                  className="absolute h-2.5 w-2.5 rounded-full bg-cyan-300"
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                />
              )
            })}
            <motion.div
              animate={{ scale: isRunning ? [1, 1.08, 1] : 1 }}
              transition={{ duration: 0.7, repeat: isRunning ? Infinity : 0 }}
              className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100"
            >
              {subdivision} Subdiv
            </motion.div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
