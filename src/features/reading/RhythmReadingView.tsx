import { useEffect, useMemo, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { playPattern } from '../../core/services/audio/rhythmPlayback'
import {
  renderDrumPattern,
  type DrumNotationPattern,
} from '../../core/services/notation/notationService'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const patterns: DrumNotationPattern[] = [
  {
    title: 'Basic Groove',
    notes: ['c5/8', 'c5/8', 'd4/8', 'c5/8', 'f4/8', 'c5/8', 'd4/8', 'c5/8'],
  },
  {
    title: 'Syncopation',
    notes: ['c5/16', 'c5/16', 'c5/8', 'd4/8', 'c5/16', 'c5/16', 'f4/8', 'c5/8'],
  },
  {
    title: 'Triplet Flow',
    notes: ['c5/8', 'd4/16', 'c5/16', 'f4/8', 'c5/8', 'd4/16', 'c5/16', 'c5/8'],
  },
]

export function RhythmReadingView() {
  const [tempo, setTempo] = useState(110)
  const [index, setIndex] = useState(0)
  const [activeStep, setActiveStep] = useState(-1)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const selected = useMemo(() => patterns[index], [index])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    renderDrumPattern(container, selected)
  }, [selected])

  async function handlePlayback() {
    await playPattern(selected, tempo, (step) => setActiveStep(step))
    setActiveStep(-1)
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Rhythm Reading" subtitle="Scrollable notation with tempo control, loop prep, and read-and-play mode." />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {patterns.map((pattern, patternIndex) => (
              <button
                key={pattern.title}
                type="button"
                onClick={() => setIndex(patternIndex)}
                className={`rounded-lg px-3 py-2 text-xs ${index === patternIndex ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/5 text-zinc-300'}`}
              >
                {pattern.title}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div ref={containerRef} className="min-h-[180px] overflow-x-auto rounded-lg bg-white" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handlePlayback}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100"
            >
              <Play size={12} /> Play Notation
            </button>
            <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
              Active note index: <span className="text-cyan-200">{activeStep >= 0 ? activeStep + 1 : '-'}</span>
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Practice Controls</p>
          <label className="mt-3 block text-xs text-zinc-300">
            Tempo {tempo} BPM
            <input
              type="range"
              min={50}
              max={220}
              value={tempo}
              onChange={(event) => setTempo(Number(event.target.value))}
              className="mt-2 w-full accent-cyan-400"
            />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" className="accent-cyan-400" /> Loop section
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" className="accent-cyan-400" /> Sight-reading challenge mode
          </label>
        </GlassCard>
      </div>
    </div>
  )
}
