import { useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { connectMidi } from '../../core/services/midi/midiService'
import { accuracyFromHits, classifyDeviation, consistencyFromHits } from '../../core/services/analysis/timingMetrics'
import { useAppStore } from '../../core/store/useAppStore'
import type { TimingHit } from '../../core/types/drumming'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const INTERVAL_MS = 500

export function TimingAnalyzerView() {
  const hits = useAppStore((state) => state.hits)
  const micLevel = useAppStore((state) => state.micLevel)
  const addHit = useAppStore((state) => state.addHit)
  const clearHits = useAppStore((state) => state.clearHits)
  const setMicLevel = useAppStore((state) => state.setMicLevel)

  const [tracking, setTracking] = useState(false)
  const [midiConnected, setMidiConnected] = useState(false)
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (!tracking) return
    startRef.current = performance.now()
  }, [tracking])

  useEffect(() => {
    if (!tracking) return

    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key.toLowerCase() !== 'f') return
      event.preventDefault()
      registerHit(performance.now())
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tracking])

  useEffect(() => {
    if (!tracking) return

    let cleanup = () => {}
    connectMidi((midiHit) => registerHit(midiHit.timestamp))
      .then((dispose) => {
        cleanup = dispose
        setMidiConnected(true)
      })
      .catch(() => {
        setMidiConnected(false)
      })

    return () => {
      cleanup()
      setMidiConnected(false)
    }
  }, [tracking])

  useEffect(() => {
    if (!tracking) return

    let raf = 0
    let stream: MediaStream | null = null
    let context: AudioContext | null = null

    async function initMic() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        context = new AudioContext()
        const source = context.createMediaStreamSource(stream)
        const analyser = context.createAnalyser()
        analyser.fftSize = 1024
        source.connect(analyser)

        const data = new Uint8Array(analyser.frequencyBinCount)
        const loop = () => {
          analyser.getByteFrequencyData(data)
          const avg = data.reduce((acc, value) => acc + value, 0) / data.length
          setMicLevel(Math.round((avg / 255) * 100))
          raf = requestAnimationFrame(loop)
        }

        loop()
      } catch {
        setMicLevel(0)
      }
    }

    void initMic()

    return () => {
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((track) => track.stop())
      void context?.close()
      setMicLevel(0)
    }
  }, [tracking, setMicLevel])

  function registerHit(actualAt: number) {
    const elapsed = actualAt - startRef.current
    const expectedAt = Math.round(elapsed / INTERVAL_MS) * INTERVAL_MS
    const deviation = elapsed - expectedAt

    const hit: TimingHit = {
      id: crypto.randomUUID(),
      expectedAt,
      actualAt: elapsed,
      deviationMs: Math.round(deviation),
      quality: classifyDeviation(deviation),
    }

    addHit(hit)
  }

  const accuracy = useMemo(() => accuracyFromHits(hits), [hits])
  const consistency = useMemo(() => consistencyFromHits(hits), [hits])
  const averageDeviation = useMemo(() => {
    if (!hits.length) return 0
    const total = hits.reduce((acc, hit) => acc + hit.deviationMs, 0)
    return Math.round(total / hits.length)
  }, [hits])

  const chartData = hits.slice(-40).map((hit, index) => ({ idx: index + 1, deviation: hit.deviationMs }))

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Timing Analyzer"
        subtitle="Real-time rhythm accuracy with keyboard, MIDI, and microphone analysis."
        right={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTracking((value) => !value)}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-zinc-100"
            >
              {tracking ? 'Stop Tracking' : 'Start Tracking'}
            </button>
            <button
              type="button"
              onClick={clearHits}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300"
            >
              Clear
            </button>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-4">
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Accuracy Score</p>
          <p className="mt-2 text-4xl font-semibold text-cyan-100">{accuracy}%</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Timing Deviation</p>
          <p className="mt-2 text-4xl font-semibold text-zinc-100">{averageDeviation} ms</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Consistency</p>
          <p className="mt-2 text-4xl font-semibold text-zinc-100">{consistency}%</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Input Status</p>
          <p className="mt-2 text-sm text-zinc-200">Keyboard: Ready</p>
          <p className="text-sm text-zinc-200">MIDI: {midiConnected ? 'Connected' : 'Listening'}</p>
          <p className="text-sm text-zinc-200">Mic Level: {micLevel}%</p>
        </GlassCard>
      </section>

      <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="h-72">
          <SectionHeader title="Timing Graph" subtitle="Deviation per hit in milliseconds" />
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={chartData}>
              <XAxis dataKey="idx" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" domain={[-40, 40]} />
              <Tooltip />
              <Area type="monotone" dataKey="deviation" stroke="#67e8f9" fill="#22d3ee33" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <SectionHeader title="Heatmap" subtitle="Recent hit quality" />
          <div className="grid grid-cols-5 gap-1">
            {hits.slice(-25).map((hit) => (
              <div
                key={hit.id}
                className="h-8 rounded"
                style={{
                  background:
                    hit.quality === 'perfect'
                      ? '#22d3ee'
                      : hit.quality === 'early'
                        ? '#f59e0b'
                        : '#f43f5e',
                }}
                title={`${hit.deviationMs > 0 ? '+' : ''}${hit.deviationMs}ms`}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-400">Press <kbd className="rounded bg-zinc-800 px-1">Space</kbd> or play a MIDI pad.</p>
        </GlassCard>
      </section>
    </div>
  )
}
