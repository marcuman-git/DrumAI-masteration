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

type StartHand = 'R' | 'L'

interface FillStep {
  index: number
  token: string
  isRest: boolean
  noteLabel: string
  stickingLabel: string
  durationUnits: number
  symbol: string
}

function noteLabel(token: string): string {
  if (token.includes('r')) return 'REST'
  const instrument = token.includes('d4') ? 'Snare' : token.includes('f4') ? 'Kick' : 'Hat'
  const duration = token.includes('/16') ? '16th' : token.includes('/8') ? '8th' : '4th'
  return `${instrument} ${duration}`
}

function buildSteps(pattern: DrumNotationPattern, startHand: StartHand): FillStep[] {
  let nextHand: StartHand = startHand

  return pattern.notes.map((token, index) => {
    const isRest = token.includes('r')
    const stickingLabel = isRest ? '-' : nextHand
    const durationUnits = token.includes('/16') ? 1 : token.includes('/8') ? 2 : 4
    const symbol = isRest ? '𝄽' : token.includes('/16') ? '♬' : token.includes('/8') ? '♪' : '♩'

    if (!isRest) {
      nextHand = nextHand === 'R' ? 'L' : 'R'
    }

    return {
      index,
      token,
      isRest,
      noteLabel: noteLabel(token),
      stickingLabel,
      durationUnits,
      symbol,
    }
  })
}

export function FillGeneratorView() {
  const [style, setStyle] = useState('Rock')
  const [complexity, setComplexity] = useState(4)
  const [tempo, setTempo] = useState(60)
  const [startHand, setStartHand] = useState<StartHand>('R')
  const [pattern, setPattern] = useState<DrumNotationPattern>(() => generateFillPattern(4))
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const visualSteps = useMemo(() => buildSteps(pattern, startHand), [pattern, startHand])
  const totalUnits = useMemo(
    () => visualSteps.reduce((sum, step) => sum + step.durationUnits, 0),
    [visualSteps],
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
      <SectionHeader
        title="Fill Generator"
        subtitle="Chart view with note/rest highlighting, start-hand control, and playback verification."
      />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Fill Chart</p>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
              {visualSteps.map((step) => (
                <div
                  key={`${step.index}-${step.token}`}
                  className={`rounded-lg border px-3 py-3 transition ${
                    activeStep === step.index
                      ? 'border-cyan-300/70 bg-cyan-300/25'
                      : step.isRest
                        ? 'border-amber-300/35 bg-amber-300/10'
                        : 'border-white/10 bg-black/20'
                  }`}
                >
                  <p className="text-[11px] font-semibold text-zinc-100">{step.noteLabel}</p>
                  <p className="mt-1 font-mono text-lg text-cyan-100">{step.stickingLabel}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Musical Bar Chart</p>
            <div className="mt-3 flex items-end gap-1 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-2">
              {visualSteps.map((step) => {
                const widthPercent = Math.max(6, (step.durationUnits / Math.max(totalUnits, 1)) * 100)
                return (
                  <div
                    key={`bar-${step.index}`}
                    className={`relative grid h-20 place-items-center rounded border text-xs transition ${
                      activeStep === step.index
                        ? 'border-cyan-300/70 bg-cyan-300/25 text-cyan-100'
                        : step.isRest
                          ? 'border-amber-300/40 bg-amber-300/12 text-amber-100'
                          : 'border-white/10 bg-white/5 text-zinc-200'
                    }`}
                    style={{ width: `${widthPercent}%`, minWidth: '2.5rem' }}
                    title={`${step.noteLabel} | ${step.stickingLabel}`}
                  >
                    <span className="text-base">{step.symbol}</span>
                    <span className="absolute bottom-1 font-mono text-[10px]">{step.stickingLabel}</span>
                    <span className="absolute -right-[1px] top-0 h-full w-px bg-white/25" />
                  </div>
                )
              })}
            </div>
          </div>

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
            Start Hand
            <select
              value={startHand}
              onChange={(event) => setStartHand(event.target.value as StartHand)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            >
              <option value="R">Right (R)</option>
              <option value="L">Left (L)</option>
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

          <p className="mt-3 text-xs text-zinc-400">Rests are highlighted in amber and use '-' sticking.</p>
          <p className="text-xs text-zinc-400">Current style profile: {style} phrasing model.</p>
        </GlassCard>
      </div>
    </div>
  )
}
