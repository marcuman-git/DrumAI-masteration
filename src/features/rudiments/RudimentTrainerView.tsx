import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Shuffle, Square } from 'lucide-react'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'
import { PAS_RUDIMENTS } from './pasRudiments'

const rudiments: Record<string, string[]> = Object.fromEntries(Array.from(new Set(PAS_RUDIMENTS.map((item) => item.category))).map((category) => [category, PAS_RUDIMENTS.filter((item) => item.category === category).map((item) => item.name)]))

type RandomMode = 'Phrase Only' | 'Category + Phrase' | 'Full Shuffle'

export function RudimentTrainerView() {
  const [category, setCategory] = useState<keyof typeof rudiments>('Paradiddles')
  const [mode, setMode] = useState<'Learn' | 'Practice' | 'Challenge' | 'Mastery'>('Practice')
  const [tempo, setTempo] = useState(60)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loopPlayback, setLoopPlayback] = useState(false)
  const [randomMode, setRandomMode] = useState<RandomMode>('Full Shuffle')
  const [patternNonce, setPatternNonce] = useState(0)
  const [selectedName, setSelectedName] = useState('Single Paradiddle')
  const [activeTokenIndex, setActiveTokenIndex] = useState<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const loopRef = useRef(loopPlayback)
  const audioContextRef = useRef<AudioContext | null>(null)
  const stepRef = useRef(0)
  const tempoRef = useRef(tempo)
  const tokensRef = useRef<string[]>([])

  const exercise = PAS_RUDIMENTS.find((item) => item.name === selectedName && item.category === category) ?? PAS_RUDIMENTS.find((item) => item.category === category)!
  const pattern = useMemo(() => {
    const base = exercise.sticking.split(' ')
    const invert = mode === 'Challenge' || patternNonce % 2 === 1
    const phrase = base.map((token) => invert ? token.replace(/[RLrl]/g, (letter) => ({ R: 'L', L: 'R', r: 'l', l: 'r' }[letter]!)) : token)
    return (mode === 'Mastery' ? [...phrase, ...phrase] : phrase).join(' ')
  }, [exercise, mode, patternNonce])
  const recommendation = mode === 'Learn' ? 'Learn slowly at 40-60 BPM. Listen to grace/main stroke separation.' : mode === 'Challenge' ? 'Reverse the lead hand while keeping relaxed control.' : mode === 'Mastery' ? 'Play two phrases smoothly before increasing tempo.' : 'Practice the selected sticking evenly for six rounds.'

  useEffect(() => {
    loopRef.current = loopPlayback
  }, [loopPlayback])

  useEffect(() => {
    tempoRef.current = tempo
  }, [tempo])

  useEffect(() => {
    if (isPlaying) {
      handleStop()
    }
    setPatternNonce((value) => value + 1)
  }, [category, mode, selectedName])

  function stopScheduler() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function playTick(frequency: number, delay = 0, volume = 0.22) {
    const context = audioContextRef.current
    if (!context) return
    const osc = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime + delay

    osc.frequency.value = frequency
    osc.type = frequency >= 1400 ? 'triangle' : 'sine'
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045)
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
    const main = token.includes('R') ? 'R' : 'L'
    const grace = token.match(/[rl]/g) ?? []
    grace.forEach((hand, index) => playTick(hand === 'r' ? 1540 : 980, index * 0.02, 0.08))
    const buzz = token.startsWith('z') ? 3 : 1
    for (let bounce = 0; bounce < buzz; bounce += 1) playTick(main === 'R' ? 1540 : 980, grace.length * 0.02 + bounce * 0.015, bounce ? 0.09 : 0.22)
    stepRef.current += 1

    if (!loopRef.current && stepRef.current >= tokens.length) {
      handleStop(false)
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
    if (isPlaying) return
    stopScheduler()
    if (sessionIdRef.current) {
      stopPracticeSession('rudiments', sessionIdRef.current, { reason: 'restart' })
    }
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    void audioContextRef.current.resume()

    const sessionId = startPracticeSession('rudiments', { category, mode, tempo })
    sessionIdRef.current = sessionId
    void trackPracticeEvent('rudiments', 'score', { action: 'play', category, mode, tempo }, sessionId)

    setIsPlaying(true)
    tokensRef.current = pattern.split(' ')
    stepRef.current = 0
    scheduleNextStep()
  }

  function handleStop(clearHighlight = true) {
    stopScheduler()
    if (sessionIdRef.current) {
      stopPracticeSession('rudiments', sessionIdRef.current, { category, mode, tempo })
      sessionIdRef.current = null
    }
    setIsPlaying(false)
    if (clearHighlight) {
      setActiveTokenIndex(null)
    }
  }

  function handleRandomizedPractice() {
    handleStop()
    const categories = Object.keys(rudiments) as Array<keyof typeof rudiments>
    const modes: Array<'Learn' | 'Practice' | 'Challenge' | 'Mastery'> = ['Learn', 'Practice', 'Challenge', 'Mastery']
    const nextCategory = categories[Math.floor(Math.random() * categories.length)]
    const nextMode = modes[Math.floor(Math.random() * modes.length)]

    if (randomMode === 'Category + Phrase') {
      setCategory(nextCategory)
    } else if (randomMode === 'Full Shuffle') {
      setCategory(nextCategory)
      setMode(nextMode)
    }

    setPatternNonce((value) => value + 1 + Math.floor(Math.random() * 7))
    void trackPracticeEvent('rudiments', 'score', {
      action: 'randomize',
      randomMode,
      category: randomMode === 'Phrase Only' ? category : nextCategory,
      mode: randomMode === 'Full Shuffle' ? nextMode : mode,
    })
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
              <button type="button" onClick={() => setSelectedName(name)} key={name} className={`rounded-lg border p-3 text-left ${exercise.name === name ? 'border-cyan-300 bg-cyan-300/10' : 'border-white/10 bg-black/20'}`}>
                <p className="text-sm font-medium text-zinc-100">{name}</p>
                <p className="text-xs text-zinc-400">Select to load sticking and demo</p>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-4">
            <p className="text-xs uppercase tracking-wide text-cyan-100">#{exercise.number}: {exercise.name}</p>
            <p className="mt-2 text-xs text-zinc-300">{exercise.guide}</p>
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
              disabled={isPlaying}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100"
            >
              <Play size={12} /> {isPlaying ? 'Playing...' : 'Play'}
            </button>
            <button
              type="button"
              onClick={() => handleStop()}
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
          <label className="block text-xs text-zinc-300">
            Randomization Rule
            <select
              value={randomMode}
              onChange={(event) => setRandomMode(event.target.value as RandomMode)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            >
              <option value="Phrase Only">Phrase Only</option>
              <option value="Category + Phrase">Category + Phrase</option>
              <option value="Full Shuffle">Full Shuffle</option>
            </select>
          </label>
          <p className="text-xs text-zinc-500">
            Phrase Only = keep mode/category. Category + Phrase = keep mode. Full Shuffle = mode + category + phrase.
          </p>
        </GlassCard>
      </div>
    </div>
  )
}
