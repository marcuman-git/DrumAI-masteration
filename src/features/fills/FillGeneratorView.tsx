import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Square, Volume2 } from 'lucide-react'
import { playPattern } from '../../core/services/audio/rhythmPlayback'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import {
  generateFillPattern,
  type DrumNotationPattern,
} from '../../core/services/notation/notationService'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const styles = ['Rock', 'Funk', 'Fusion', 'Metal', 'Gospel', 'Progressive']

type StartHand = 'R' | 'L'
const START_HAND_KEY = 'drummaster-fill-start-hand-v1'
const VALID_NOTE_RE = /^[cdf]\d\/(4|8|16)r?$/

interface FillStep {
  index: number
  token: string
  isRest: boolean
  noteLabel: string
  stickingLabel: string
  symbol: string
}

function noteLabel(token: string): string {
  if (token.includes('r')) return 'REST'
  const instrument = token.includes('d4') ? 'Snare' : token.includes('f4') ? 'Kick' : 'Hi-hat'
  const duration = token.includes('/16') ? '16th' : token.includes('/8') ? '8th' : '4th'
  return `${instrument} ${duration}`
}

function buildSteps(pattern: DrumNotationPattern, startHand: StartHand): FillStep[] {
  let nextHand: StartHand = startHand

  return pattern.notes.map((token, index) => {
    const isRest = token.includes('r')
    const stickingLabel = isRest ? '-' : nextHand
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
      symbol,
    }
  })
}

function fallbackPattern(): DrumNotationPattern {
  return {
    title: 'Generated Fill',
    notes: ['c5/8', 'd4/16', 'f4/16', 'c5/8', 'c5/16', 'd4/16', 'f4/8', 'c5/8'],
  }
}

function sanitizePattern(input: DrumNotationPattern | null | undefined): DrumNotationPattern {
  const notes = input?.notes?.filter((token) => VALID_NOTE_RE.test(token)) ?? []
  if (!notes.length) return fallbackPattern()
  return {
    title: input?.title ?? 'Generated Fill',
    notes: notes.slice(0, 24),
  }
}

export function FillGeneratorView() {
  const [style, setStyle] = useState('Rock')
  const [complexity, setComplexity] = useState(4)
  const [tempo, setTempo] = useState(60)
  const [startHand, setStartHand] = useState<StartHand>(() => {
    const saved = localStorage.getItem(START_HAND_KEY)
    return saved === 'L' ? 'L' : 'R'
  })
  const [pattern, setPattern] = useState<DrumNotationPattern>(() => sanitizePattern(generateFillPattern(4)))
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [playedSteps, setPlayedSteps] = useState<number[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const visualSteps = useMemo(() => buildSteps(pattern, startHand), [pattern, startHand])
  function regenerate() {
    try {
      const next = sanitizePattern(generateFillPattern(complexity, style))
      setPattern(next)
      setPlaybackError(null)
      void trackPracticeEvent('fills', 'score', {
        action: 'regenerate',
        style,
        complexity,
        noteCount: next.notes.length,
      })
    } catch {
      setPattern(fallbackPattern())
      setPlaybackError('Pattern generation failed. Fallback fill loaded.')
    }
    setActiveStep(null)
    setPlayedSteps([])
  }

  async function handlePlayFill() {
    if (isPlaying) return
    setPlaybackError(null)
    setPlayedSteps([])
    setIsPlaying(true)
    const controller = new AbortController()
    controllerRef.current = controller
    const sessionId = startPracticeSession('fills', { style, complexity, tempo, startHand })
    sessionIdRef.current = sessionId

    try {
      await playPattern(
        pattern,
        tempo,
        (index) => {
          setActiveStep(index)
          setPlayedSteps((prev) => (prev.includes(index) ? prev : [...prev, index]))
        },
        controller.signal,
      )
      void trackPracticeEvent('fills', 'score', { action: 'play-complete', tempo, noteCount: pattern.notes.length }, sessionId)
    } catch {
      setPlaybackError('Playback failed for this fill. You can regenerate and retry.')
      void trackPracticeEvent('fills', 'mistake', { action: 'playback-error' }, sessionId)
    } finally {
      setActiveStep(null)
      setIsPlaying(false)
      controllerRef.current = null
      if (sessionIdRef.current) {
        stopPracticeSession('fills', sessionIdRef.current, { tempo, noteCount: pattern.notes.length })
        sessionIdRef.current = null
      }
    }
  }

  function handleStopFill() {
    controllerRef.current?.abort()
    controllerRef.current = null
    setIsPlaying(false)
    setActiveStep(null)
    if (sessionIdRef.current) {
      stopPracticeSession('fills', sessionIdRef.current, { reason: 'manual-stop' })
      sessionIdRef.current = null
    }
  }

  useEffect(() => {
    localStorage.setItem(START_HAND_KEY, startHand)
  }, [startHand])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      if (sessionIdRef.current) {
        stopPracticeSession('fills', sessionIdRef.current, { reason: 'unmount' })
      }
    }
  }, [])

  const playProgress = visualSteps.length ? Math.round((playedSteps.length / visualSteps.length) * 100) : 0

  function stepClass(step: FillStep): string {
    if (activeStep === step.index) return 'border-cyan-300/70 bg-cyan-300/25 text-cyan-100'
    if (playedSteps.includes(step.index)) return 'border-emerald-300/45 bg-emerald-300/12 text-emerald-100'
    if (step.isRest) return 'border-amber-300/40 bg-amber-300/12 text-amber-100'
    return 'border-white/10 bg-white/5 text-zinc-200'
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Fill Generator"
        subtitle="Chart view with note/rest highlighting, start-hand control, and playback verification."
      />

      <div className="grid gap-3 lg:grid-cols-2">
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
                      : playedSteps.includes(step.index)
                        ? 'border-emerald-300/45 bg-emerald-300/12'
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
            <div className="mt-3 flex items-center gap-2 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-2">
              {visualSteps.map((step) => {
                return (
                  <div
                    key={`bar-${step.index}`}
                    className={`relative flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded border text-xs transition ${stepClass(step)}`}
                    title={`${step.noteLabel} | ${step.stickingLabel}`}
                  >
                    <span className="text-2xl leading-none">{step.symbol}</span>
                    <span className="mt-1 font-mono text-base leading-none">{step.stickingLabel}</span>
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
            <button
              type="button"
              onClick={handleStopFill}
              disabled={!isPlaying}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Square size={12} /> Stop
            </button>
          </div>
          <p className="text-xs text-zinc-400">Playback progress: {playProgress}%</p>
          {playbackError ? <p className="text-xs text-rose-300">{playbackError}</p> : null}
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
              min={40}
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
