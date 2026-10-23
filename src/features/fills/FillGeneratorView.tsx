import { useMemo, useState } from 'react'
import { RefreshCw, Volume2 } from 'lucide-react'
import { playPattern } from '../../core/services/audio/rhythmPlayback'
import {
  generateFillPattern,
  type DrumNotationPattern,
} from '../../core/services/notation/notationService'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const styles = ['Rock', 'Funk', 'Fusion', 'Metal', 'Gospel', 'Progressive']

function noteLabel(token: string): string {
  const instrument = token.includes('d4') ? 'Sn' : token.includes('f4') ? 'K' : 'H'
  const duration = token.includes('/16') ? '16' : token.includes('/8') ? '8' : '4'
  return `${instrument}${duration}`
}

export function FillGeneratorView() {
  const [style, setStyle] = useState('Rock')
  const [complexity, setComplexity] = useState(4)
  const [tempo, setTempo] = useState(60)
  const [pattern, setPattern] = useState<DrumNotationPattern>(() => generateFillPattern(4))
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const visualSteps = useMemo(
    () => pattern.notes.map((token, index) => ({ index, token, label: noteLabel(token) })),
    [pattern],
  )

  function regenerate() {
    setPattern(generateFillPattern(complexity))
    setActiveStep(null)
  }

  async function handlePlayFill() {
    setIsPlaying(true)
    await playPattern(pattern, tempo, (index) => setActiveStep(index))
    setActiveStep(null)
    setIsPlaying(false)
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Fill Generator" subtitle="Unlimited fills with stable visual playback and note-by-note highlighting." />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Fill Pattern View</p>
            <div className="mt-3 grid grid-cols-4 gap-2 md:grid-cols-8">
              {visualSteps.map((step) => (
                <div
                  key={`${step.index}-${step.token}`}
                  className={`rounded-lg border px-3 py-3 text-center text-xs font-semibold transition ${
                    activeStep === step.index
                      ? 'border-cyan-300/70 bg-cyan-300/25 text-cyan-100'
                      : 'border-white/10 bg-black/20 text-zinc-200'
                  }`}
                >
                  {step.label}
                </div>
              ))}
            </div>
          </div>

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
              onClick={() => void handlePlayFill()}
              disabled={isPlaying}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Volume2 size={12} /> {isPlaying ? 'Playing...' : 'Play Fill'}
            </button>
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Fill Parameters</p>

          <label className="mt-3 block text-xs text-zinc-300">
            Style
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            >
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
          <p className="text-xs text-zinc-400">Current style profile: {style} phrasing model.</p>
        </GlassCard>
      </div>
    </div>
  )
}
