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
  const [triggerThreshold, setTriggerThreshold] = useState(28)
  const [handPattern, setHandPattern] = useState<'L+R' | 'R+L'>('L+R')

  const startRef = useRef<number>(0)

  useEffect(() => {
    if (!tracking) return
    startRef.current = performance.now()
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
    let lastHitTime = 0

    async function initMic() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        context = new AudioContext()
        const source = context.createMediaStreamSource(stream)
        const analyser = context.createAnalyser()

        analyser.fftSize = 2048
        source.connect(analyser)

        const data = new Uint8Array(analyser.frequencyBinCount)

        const loop = () => {
          analyser.getByteTimeDomainData(data)

          let sum = 0
          for (let i = 0; i < data.length; i += 1) {
            const centered = (data[i] - 128) / 128
            sum += centered * centered
          }

          const rms = Math.sqrt(sum / data.length)
          const normalized = Math.min(100, Math.round(rms * 160))
          setMicLevel(normalized)

          const now = performance.now()
          const cooldownPassed = now - lastHitTime > 120
          if (normalized >= triggerThreshold && cooldownPassed) {
            registerHit(now)
            lastHitTime = now
          }

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
  }, [tracking, setMicLevel, triggerThreshold])

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

  const handStats = useMemo(() => {
    const leftDeviations: number[] = []
    const rightDeviations: number[] = []

    hits.forEach((hit, index) => {
      const firstIsLeft = handPattern === 'L+R'
      const isFirst = index % 2 === 0

      if ((firstIsLeft && isFirst) || (!firstIsLeft && !isFirst)) {
        leftDeviations.push(hit.deviationMs)
      } else {
        rightDeviations.push(hit.deviationMs)
      }
    })

    const avg = (values: number[]) => {
      if (!values.length) return 0
      return Math.round(values.reduce((acc, value) => acc + value, 0) / values.length)
    }

    return {
      leftAvg: avg(leftDeviations),
      rightAvg: avg(rightDeviations),
    }
  }, [hits, handPattern])

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Timing Analyzer"
        subtitle="Microphone-first onset detection for practice pad/snare hit consistency and hand timing balance."
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
          <p className="mt-2 text-sm text-zinc-200">Mic Hit Detection: {tracking ? 'Active' : 'Idle'}</p>
          <p className="text-sm text-zinc-200">MIDI: {midiConnected ? 'Connected' : 'Not detected'}</p>
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

        <GlassCard className="space-y-3">
          <SectionHeader title="Hand Analysis" subtitle="Alternate-hand inference from mic hits" />

          <label className="block text-xs text-zinc-300">
            Trigger Sensitivity {triggerThreshold}%
            <input
              type="range"
              min={8}
              max={70}
              value={triggerThreshold}
              onChange={(event) => setTriggerThreshold(Number(event.target.value))}
              className="mt-2 w-full accent-cyan-400"
            />
          </label>

          <label className="block text-xs text-zinc-300">
            Hand Pattern
            <select
              value={handPattern}
              onChange={(event) => setHandPattern(event.target.value as 'L+R' | 'R+L')}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            >
              <option value="L+R">L+R (left starts)</option>
              <option value="R+L">R+L (right starts)</option>
            </select>
          </label>

          <p className="text-sm text-zinc-200">Estimated Left Hand Avg: {handStats.leftAvg} ms</p>
          <p className="text-sm text-zinc-200">Estimated Right Hand Avg: {handStats.rightAvg} ms</p>

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

          {!hits.length ? <p className="text-xs text-zinc-500">Start tracking, then play your pad/snare steadily to populate analysis.</p> : null}
        </GlassCard>
      </section>
    </div>
  )
}
