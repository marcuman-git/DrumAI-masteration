import { useEffect, useRef, useState } from 'react'
import { RefreshCw, Volume2 } from 'lucide-react'
import { playPattern } from '../../core/services/audio/rhythmPlayback'
import {
  generateFillPattern,
  renderDrumPattern,
  type DrumNotationPattern,
} from '../../core/services/notation/notationService'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const styles = ['Rock', 'Funk', 'Fusion', 'Metal', 'Gospel', 'Progressive']

export function FillGeneratorView() {
  const [style, setStyle] = useState('Rock')
  const [complexity, setComplexity] = useState(4)
  const [tempo, setTempo] = useState(120)
  const [pattern, setPattern] = useState<DrumNotationPattern>(() => generateFillPattern(4))
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    try {
      renderDrumPattern(container, pattern)
      setRenderError(null)
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : 'Could not render fill notation.')
    }
  }, [pattern])

  function regenerate() {
    setPattern(generateFillPattern(complexity))
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Fill Generator" subtitle="Unlimited notation + sticking fills by style, complexity, tempo, and skill level." />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div ref={containerRef} className="min-h-[180px] overflow-x-auto rounded-lg bg-white" />
          </div>
          {renderError ? <p className="text-xs text-rose-300">Notation render fallback: {renderError}</p> : null}
          <p className="font-mono text-sm tracking-[0.2em] text-cyan-100">{pattern.sticking?.join(' ')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={regenerate}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-300/40 bg-violet-300/10 px-3 py-2 text-xs text-violet-100"
            >
              <RefreshCw size={12} /> New Fill
            </button>
            <button
              type="button"
              onClick={() => void playPattern(pattern, tempo)}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100"
            >
              <Volume2 size={12} /> Play Fill
            </button>
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Fill Parameters</p>

          <label className="mt-3 block text-xs text-zinc-300">
            Style
            <select value={style} onChange={(event) => setStyle(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2">
              {styles.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="mt-3 block text-xs text-zinc-300">
            Complexity {complexity}/10
            <input
              type="range"
              min={1}
              max={10}
              value={complexity}
              onChange={(event) => setComplexity(Number(event.target.value))}
              className="mt-2 w-full accent-cyan-400"
            />
          </label>

          <label className="mt-3 block text-xs text-zinc-300">
            Tempo {tempo} BPM
            <input
              type="range"
              min={60}
              max={240}
              value={tempo}
              onChange={(event) => setTempo(Number(event.target.value))}
              className="mt-2 w-full accent-cyan-400"
            />
          </label>

          <p className="mt-3 text-xs text-zinc-400">Skill levels supported: beginner to professional.</p>
          <p className="text-xs text-zinc-400">Current style profile: {style} phraseing model.</p>
        </GlassCard>
      </div>
    </div>
  )
}
