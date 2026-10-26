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

export function RudimentTrainerView() {
  const [category, setCategory] = useState<keyof typeof rudiments>('Paradiddles')
  const [mode, setMode] = useState<'Learn' | 'Practice' | 'Challenge' | 'Mastery'>('Practice')
  const [tempo, setTempo] = useState(60)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loopPlayback, setLoopPlayback] = useState(false)
  const [patternNonce, setPatternNonce] = useState(0)
  const [activeTokenIndex, setActiveTokenIndex] = useState<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const loopRef = useRef(loopPlayback)
  const audioContextRef = useRef<AudioContext | null>(null)
  const stepRef = useRef(0)
  const tempoRef = useRef(tempo)
  const tokensRef = useRef<string[]>([])

  const pattern = useMemo(() => stickingExamples[patternNonce % stickingExamples.length], [patternNonce])
  const recommendation = useMemo(
    () =>
      mode === 'Learn'
        ? `Slow control focus: ${rudiments[category][0]} at 50-70 BPM.`
        : mode === 'Practice'
          ? `Consistency block: ${rudiments[category][1]} for 6 clean rounds.`
          : mode === 'Challenge'
            ? `Accuracy challenge: ${rudiments[category][2]} at +10 BPM from comfort tempo.`
            : `Mastery pass: rotate all ${category} rudiments with no pause for 10 minutes.`,
    [category, mode],
  )

  useEffect(() => {
    loopRef.current = loopPlayback
  }, [loopPlayback])

  useEffect(() => {
    tempoRef.current = tempo
  }, [tempo])

  useEffect(() => {
    setPatternNonce((value) => value + 1)
  }, [category, mode])

  function stopScheduler() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function playTick(frequency: number) {
    const context = audioContextRef.current
    if (!context) return
    const osc = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime

    osc.frequency.value = frequency
    osc.type = 'triangle'
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08)
    osc.connect(gain)
    gain.connect(context.destination)
    osc.start(now)
    osc.stop(now + 0.09)
  }

  function scheduleNextStep() {
    const tokens = tokensRef.current
    if (!tokens.length) return
    const index = stepRef.current % tokens.length
    const token = tokens[index]
    setActiveTokenIndex(index)
    playTick(token === 'R' ? 900 : 650)
    stepRef.current += 1

    if (!loopRef.current && stepRef.current >= tokens.length) {
      handleStop()
      return
    }

    const intervalMs = Math.max(120, Math.round(60000 / tempoRef.current))
    timerRef.current = window.setTimeout(scheduleNextStep, intervalMs)
  }

  useEffect(() => {
    return () => {
      stopScheduler()
      if (audioContextRef.current) {
        void audioContextRef.current.close()
      }
      if (sessionIdRef.current) {
        stopPracticeSession('rudiments', sessionIdRef.current, { reason: 'unmount' })
      }
    }
  }, [])

  function handlePlay() {
    stopScheduler()
    if (sessionIdRef.current) {
      stopPracticeSession('rudiments', sessionIdRef.current, { reason: 'restart' })
    }
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }

    const sessionId = startPracticeSession('rudiments', { category, mode, tempo })
    sessionIdRef.current = sessionId
    void trackPracticeEvent('rudiments', 'score', { action: 'play', category, mode, tempo }, sessionId)

    setIsPlaying(true)
    tokensRef.current = pattern.split(' ')
    stepRef.current = 0
    scheduleNextStep()
  }

  function handleStop() {
    stopScheduler()
    if (sessionIdRef.current) {
      stopPracticeSession('rudiments', sessionIdRef.current, { category, mode, tempo })
      sessionIdRef.current = null
    }
    setIsPlaying(false)
    setActiveTokenIndex(null)
  }

  function handleRandomizedPractice() {
    const categories = Object.keys(rudiments) as Array<keyof typeof rudiments>
    const modes: Array<'Learn' | 'Practice' | 'Challenge' | 'Mastery'> = ['Learn', 'Practice', 'Challenge', 'Mastery']
    const nextCategory = categories[Math.floor(Math.random() * categories.length)]
    const nextMode = modes[Math.floor(Math.random() * modes.length)]
    setCategory(nextCategory)
    setMode(nextMode)
    setPatternNonce(Math.floor(Math.random() * 1000))
    void trackPracticeEvent('rudiments', 'score', { action: 'randomize', category: nextCategory, mode: nextMode })
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Rudiment Trainer" subtitle="All PAS categories with learn, practice, challenge, and mastery workflows." />

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
            <div className="mt-2 flex flex-wrap gap-2">
              {pattern.split(' ').map((token, index) => (
                <span
                  key={`${token}-${index}`}
                  className={`rounded-md px-2 py-1 text-2xl font-semibold ${
                    activeTokenIndex === index
                      ? 'bg-cyan-200 text-zinc-950'
                      : 'bg-transparent text-zinc-50'
                  }`}
                >
                  {token}
                </span>
              ))}
            </div>
          </div>
          <p className="text-sm text-zinc-300">
            Recommended practice: <span className="text-cyan-200">{recommendation}</span>
          </p>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,0.72fr)_auto_auto_auto] sm:items-end">
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
            <button
              type="button"
              onClick={() => setLoopPlayback((value) => !value)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                loopPlayback
                  ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100'
                  : 'border-white/10 text-zinc-200'
              }`}
            >
              Loop {loopPlayback ? 'On' : 'Off'}
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
            onClick={handleRandomizedPractice}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-300/40 bg-violet-300/10 px-3 py-2 text-xs text-violet-100"
          >
            <Shuffle size={14} /> Randomized Practice
          </button>
        </GlassCard>
      </div>
    </div>
  )
}
