import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Square } from 'lucide-react'
import { parseDuration } from '../../core/services/audio/rhythmPlayback'
import type { DrumNotationPattern } from '../../core/services/notation/notationService'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

interface RhythmStep {
  token: string
  note: string
  symbol: string
}

const patterns: DrumNotationPattern[] = [
  {
    title: 'Basic Groove',
    notes: ['c5/8', 'c5/8', 'd4/8', 'c5/8', 'f4/8', 'c5/8', 'd4/8', 'c5/8'],
  },
  {
    title: 'Syncopation',
    notes: ['c5/8', 'd4/16', 'c5/16', 'c5/8', 'f4/8', 'd4/16', 'c5/16', 'c5/8', 'd4/8', 'c5/8'],
  },
  {
    title: 'Triplet Flow',
    notes: ['c5/8', 'd4/16', 'c5/16', 'f4/8', 'c5/16', 'd4/16', 'c5/8', 'f4/8', 'd4/8', 'c5/8'],
  },
]

function stepInfo(token: string): RhythmStep {
  const note = token.includes('d4') ? 'Snare' : token.includes('f4') ? 'Kick' : 'Hi-hat'
  const symbol = token.includes('/16') ? '♬' : token.includes('/8') ? '♪' : '♩'
  return { token, note, symbol }
}

export function RhythmReadingView() {
  const [tempo, setTempo] = useState(60)
  const [index, setIndex] = useState(0)
  const [activeStep, setActiveStep] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)

  const timersRef = useRef<number[]>([])
  const contextRef = useRef<AudioContext | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const selected = useMemo(() => patterns[index], [index])
  const steps = useMemo(() => selected.notes.map(stepInfo), [selected])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id))
      if (contextRef.current) {
        void contextRef.current.close()
      }
      if (sessionIdRef.current) {
        stopPracticeSession('reading', sessionIdRef.current, { reason: 'unmount' })
      }
    }
  }, [])

  function clearPlayback() {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
    if (contextRef.current) {
      void contextRef.current.close()
      contextRef.current = null
    }
    setIsPlaying(false)
    setActiveStep(-1)
    if (sessionIdRef.current) {
      stopPracticeSession('reading', sessionIdRef.current, { pattern: selected.title, tempo })
      sessionIdRef.current = null
    }
  }

  function scheduleNote(context: AudioContext, token: string, when: number) {
    if (token.includes('f4')) {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(140, when)
      osc.frequency.exponentialRampToValueAtTime(55, when + 0.12)
      gain.gain.setValueAtTime(0.0001, when)
      gain.gain.linearRampToValueAtTime(0.9, when + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16)
      osc.connect(gain)
      gain.connect(context.destination)
      osc.start(when)
      osc.stop(when + 0.18)
      return
    }

    if (token.includes('d4')) {
      const noiseBuffer = context.createBuffer(1, context.sampleRate * 0.2, context.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) {
        data[i] = Math.random() * 2 - 1
      }

      const noise = context.createBufferSource()
      noise.buffer = noiseBuffer
      const noiseFilter = context.createBiquadFilter()
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.value = 2100
      const noiseGain = context.createGain()
      noiseGain.gain.setValueAtTime(0.0001, when)
      noiseGain.gain.linearRampToValueAtTime(0.65, when + 0.004)
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16)

      const tone = context.createOscillator()
      tone.type = 'triangle'
      tone.frequency.value = 210
      const toneGain = context.createGain()
      toneGain.gain.setValueAtTime(0.0001, when)
      toneGain.gain.linearRampToValueAtTime(0.22, when + 0.003)
      toneGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.12)

      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(context.destination)
      tone.connect(toneGain)
      toneGain.connect(context.destination)

      noise.start(when)
      noise.stop(when + 0.15)
      tone.start(when)
      tone.stop(when + 0.12)
      return
    }

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 0.08, context.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1
    }

    const source = context.createBufferSource()
    source.buffer = noiseBuffer
    const highpass = context.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 6500
    const bandpass = context.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 9000
    bandpass.Q.value = 1.2
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.linearRampToValueAtTime(0.5, when + 0.0015)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.04)

    source.connect(highpass)
    highpass.connect(bandpass)
    bandpass.connect(gain)
    gain.connect(context.destination)
    source.start(when)
    source.stop(when + 0.06)
  }

  function handlePlayback() {
    clearPlayback()

    const sessionId = startPracticeSession('reading', { pattern: selected.title, tempo })
    sessionIdRef.current = sessionId

    const context = new AudioContext()
    contextRef.current = context
    setIsPlaying(true)

    const beatMs = 60000 / tempo
    let offsetMs = 0

    selected.notes.forEach((token, stepIndex) => {
      const startAt = context.currentTime + offsetMs / 1000
      scheduleNote(context, token, startAt)

      timersRef.current.push(
        window.setTimeout(() => {
          setActiveStep(stepIndex)
        }, Math.max(0, offsetMs - 10)),
      )
      void trackPracticeEvent('reading', 'hit', { stepIndex, token }, sessionId)

      offsetMs += beatMs * parseDuration(token)
    })

    timersRef.current.push(
      window.setTimeout(() => {
        void trackPracticeEvent('reading', 'score', { completed: true, stepCount: selected.notes.length, tempo }, sessionId)
        clearPlayback()
      }, offsetMs + 180),
    )
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Rhythm Reading" subtitle="Interactive reading chart with play/stop controls and live note highlighting." />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {patterns.map((pattern, patternIndex) => (
              <button
                key={pattern.title}
                type="button"
                onClick={() => {
                  clearPlayback()
                  setIndex(patternIndex)
                }}
                className={`rounded-lg px-3 py-2 text-xs ${index === patternIndex ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/5 text-zinc-300'}`}
              >
                {pattern.title}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Reading Bar Chart</p>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-2">
              {steps.map((step, stepIndex) => (
                <div
                  key={`${step.token}-${stepIndex}`}
                  className={`relative flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded border text-sm transition ${
                    activeStep === stepIndex
                      ? 'border-cyan-300/70 bg-cyan-300/25 text-cyan-100'
                      : 'border-white/10 bg-white/5 text-zinc-200'
                  }`}
                >
                  <span className="text-2xl leading-none">{step.symbol}</span>
                  <span className="mt-1 text-sm leading-none">{step.note}</span>
                  <span className="absolute -right-[1px] top-0 h-full w-px bg-white/25" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[auto_auto_1fr] sm:items-center">
            <button
              type="button"
              onClick={handlePlayback}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100"
            >
              <Play size={12} /> Play
            </button>
            <button
              type="button"
              onClick={clearPlayback}
              disabled={!isPlaying}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200 disabled:opacity-60"
            >
              <Square size={12} /> Stop
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
              min={40}
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
