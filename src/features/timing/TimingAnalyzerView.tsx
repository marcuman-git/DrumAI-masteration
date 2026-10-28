import { useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetronomeEngine } from '../../core/services/audio/metronomeEngine'
import { connectMidi } from '../../core/services/midi/midiService'
import { accuracyFromHits, classifyDeviation, consistencyFromHits } from '../../core/services/analysis/timingMetrics'
import { startPracticeSession, stopPracticeSession, trackPracticeEvent } from '../../core/services/storage/practiceEvents'
import { useAppStore } from '../../core/store/useAppStore'
import type { TimingHit } from '../../core/types/drumming'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'
import { handForExpectedIndex, timingDrillPatterns, type DrillMode } from './timingAnalyzerLogic'

const CALIBRATION_MS = 1800

const micProfiles = {
  Pad: { threshold: 30, cooldown: 125, note: 'Balanced stick-trigger profile for practice pads.' },
  Snare: { threshold: 38, cooldown: 145, note: 'Higher rejection for snare ring and overtones.' },
  'Quiet Room': { threshold: 24, cooldown: 110, note: 'More sensitive for low-volume rooms.' },
} as const

type MicProfile = keyof typeof micProfiles

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizedLevel(data: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < data.length; i += 1) {
    const centered = (data[i] - 128) / 128
    sum += centered * centered
  }
  const rms = Math.sqrt(sum / data.length)
  return Math.min(100, Math.round(rms * 160))
}

export function TimingAnalyzerView() {
  const hits = useAppStore((state) => state.hits)
  const micLevel = useAppStore((state) => state.micLevel)
  const addHit = useAppStore((state) => state.addHit)
  const clearHits = useAppStore((state) => state.clearHits)
  const setMicLevel = useAppStore((state) => state.setMicLevel)

  const [tracking, setTracking] = useState(false)
  const [midiConnected, setMidiConnected] = useState(false)
  const [triggerThreshold, setTriggerThreshold] = useState(28)
  const [cooldownMs, setCooldownMs] = useState(120)
  const [drillMode, setDrillMode] = useState<DrillMode>('Singles (L/R)')
  const [referenceBpm, setReferenceBpm] = useState(60)
  const [micProfile, setMicProfile] = useState<MicProfile>('Pad')
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibration, setCalibration] = useState<{ noiseFloor: number; peak: number; calibratedAt: string } | null>(null)
  const [lastInputSource, setLastInputSource] = useState<'mic' | 'midi' | null>(null)

  const startRef = useRef<number>(0)
  const sessionIdRef = useRef<string | null>(null)
  const lastExpectedIndexRef = useRef<number>(-1)
  const nextExpectedIndexRef = useRef(0)
  const referenceClickRef = useRef(new MetronomeEngine())

  useEffect(() => {
    if (!tracking) return
    startRef.current = performance.now()
    lastExpectedIndexRef.current = -1
    nextExpectedIndexRef.current = 0
  }, [tracking])

  useEffect(() => {
    const profile = micProfiles[micProfile]
    setTriggerThreshold(profile.threshold)
    setCooldownMs(profile.cooldown)
  }, [micProfile])

  useEffect(() => {
    if (!tracking) {
      referenceClickRef.current.stop()
      return
    }

    referenceClickRef.current.start(
      {
        bpm: referenceBpm,
        subdivision: 1,
        swing: 0,
        humanizeMs: 0,
        accentPattern: [1.8, 1, 1, 1],
        clickVolume: 0.3,
      },
      () => {
        // timing analyzer reference click only
      },
    )

    return () => {
      referenceClickRef.current.stop()
    }
  }, [tracking])

  useEffect(() => {
    if (!tracking) return
    referenceClickRef.current.updateConfig({
      bpm: referenceBpm,
      subdivision: 1,
      swing: 0,
      humanizeMs: 0,
      accentPattern: [1.8, 1, 1, 1],
      clickVolume: 0.3,
    })
  }, [tracking, referenceBpm])

  useEffect(() => {
    if (!tracking) return

    let cleanup = () => {}
    connectMidi((midiHit) => registerHit(midiHit.timestamp, 'midi'))
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
    let lastRegisteredAt = 0
    let wasArmed = true
    let previousLevel = 0

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

          const normalized = normalizedLevel(data)
          setMicLevel(normalized)

          const now = performance.now()
          const minInterHitMs = Math.max(cooldownMs, Math.round((60000 / referenceBpm) * 0.35))
          const cooldownPassed = now - lastHitTime > minInterHitMs
          const releaseThreshold = Math.max(5, Math.round(triggerThreshold * 0.55))
          const riseAmount = normalized - previousLevel
          const transientDetected = riseAmount >= 4

          if (normalized <= releaseThreshold) {
            wasArmed = true
          }

          const hardDuplicateGuard = now - lastRegisteredAt > minInterHitMs
          if (wasArmed && normalized >= triggerThreshold && cooldownPassed && transientDetected && hardDuplicateGuard) {
            registerHit(now, 'mic')
            lastHitTime = now
            lastRegisteredAt = now
            wasArmed = false
          }

          previousLevel = normalized

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
  }, [tracking, setMicLevel, triggerThreshold, cooldownMs, referenceBpm])

  async function calibrateInput() {
    if (isCalibrating || tracking) return

    setIsCalibrating(true)
    let raf = 0
    let stream: MediaStream | null = null
    let context: AudioContext | null = null
    const samples: number[] = []

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      context = new AudioContext()
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const startAt = performance.now()

      await new Promise<void>((resolve) => {
        const loop = () => {
          analyser.getByteTimeDomainData(data)
          samples.push(normalizedLevel(data))

          if (performance.now() - startAt >= CALIBRATION_MS) {
            resolve()
            return
          }
          raf = requestAnimationFrame(loop)
        }

        loop()
      })

      const noiseFloor = Math.round(samples.reduce((acc, value) => acc + value, 0) / Math.max(1, samples.length))
      const peak = Math.max(...samples, noiseFloor)
      const suggestedThreshold = clamp(Math.round(noiseFloor + Math.max(8, (peak - noiseFloor) * 0.45)), 8, 70)
      const suggestedCooldown = clamp(Math.round(90 + noiseFloor * 1.5), 80, 220)

      setTriggerThreshold(suggestedThreshold)
      setCooldownMs(suggestedCooldown)
      setCalibration({
        noiseFloor,
        peak,
        calibratedAt: new Date().toISOString(),
      })

      void trackPracticeEvent('timing-analyzer', 'score', {
        action: 'calibration',
        noiseFloor,
        peak,
        suggestedThreshold,
        suggestedCooldown,
      })
    } catch {
      setMicLevel(0)
    } finally {
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((track) => track.stop())
      void context?.close()
      setIsCalibrating(false)
    }
  }

  function registerHit(actualAt: number, inputSource: 'mic' | 'midi') {
    const intervalMs = 60000 / referenceBpm
    const elapsed = actualAt - startRef.current
    const quantizedIndex = Math.round(elapsed / intervalMs)
    const expectedIndex = Math.max(nextExpectedIndexRef.current, quantizedIndex)
    const expectedAt = expectedIndex * intervalMs
    const deviation = elapsed - expectedAt
    const quality = classifyDeviation(deviation)
    const pattern = timingDrillPatterns[drillMode]
    if (expectedIndex <= lastExpectedIndexRef.current) {
      return
    }

    if (lastExpectedIndexRef.current >= 0 && expectedIndex - lastExpectedIndexRef.current > 1) {
      for (let missedIndex = lastExpectedIndexRef.current + 1; missedIndex < expectedIndex; missedIndex += 1) {
        const missedExpectedAt = missedIndex * intervalMs
        const missedHand = handForExpectedIndex(pattern, missedIndex)
        const missedHit: TimingHit = {
          id: crypto.randomUUID(),
          expectedAt: missedExpectedAt,
          actualAt: missedExpectedAt + intervalMs,
          deviationMs: Math.round(intervalMs),
          quality: 'missed',
          hand: missedHand,
        }

        addHit(missedHit)
        void trackPracticeEvent(
          'timing-analyzer',
          'mistake',
          { deviationMs: missedHit.deviationMs, quality: 'missed', inputSource, hand: missedHand },
          sessionIdRef.current ?? undefined,
        )
      }
    }

    lastExpectedIndexRef.current = expectedIndex
    nextExpectedIndexRef.current = expectedIndex + 1
    const expectedHand = handForExpectedIndex(pattern, expectedIndex)

    const hit: TimingHit = {
      id: crypto.randomUUID(),
      expectedAt,
      actualAt: elapsed,
      deviationMs: Math.round(deviation),
      quality,
      hand: expectedHand,
    }

    addHit(hit)
    setLastInputSource(inputSource)
    void trackPracticeEvent(
      'timing-analyzer',
      'hit',
      { deviationMs: hit.deviationMs, quality, inputSource, hand: expectedHand },
      sessionIdRef.current ?? undefined,
    )
    if (quality !== 'perfect') {
      void trackPracticeEvent(
        'timing-analyzer',
        'mistake',
        { deviationMs: hit.deviationMs, quality, inputSource, hand: expectedHand },
        sessionIdRef.current ?? undefined,
      )
    }
  }

  function handleTrackingToggle() {
    if (!tracking) {
      const sessionId = startPracticeSession('timing-analyzer', {
        triggerThreshold,
        cooldownMs,
        drillMode,
        calibrated: Boolean(calibration),
      })
      sessionIdRef.current = sessionId
      setTracking(true)
      return
    }

    if (sessionIdRef.current) {
      stopPracticeSession('timing-analyzer', sessionIdRef.current, {
        hitCount: hits.length,
        accuracy,
        consistency,
        bpm: referenceBpm,
      })
      void trackPracticeEvent(
        'timing-analyzer',
        'score',
        {
          hitCount: hits.length,
          accuracy,
          consistency,
          averageDeviation,
          drillMode,
          bpm: referenceBpm,
        },
        sessionIdRef.current,
      )
      sessionIdRef.current = null
    }
    setTracking(false)
  }

  const accuracy = useMemo(() => accuracyFromHits(hits), [hits])
  const consistency = useMemo(() => consistencyFromHits(hits), [hits])

  const averageDeviation = useMemo(() => {
    if (!hits.length) return 0
    const total = hits.reduce((acc, hit) => acc + hit.deviationMs, 0)
    return Math.round(total / hits.length)
  }, [hits])

  const chartData = hits.slice(-40).map((hit, index) => ({ idx: index + 1, deviation: hit.deviationMs }))

  const qualityCounts = useMemo(() => {
    return hits.reduce(
      (acc, hit) => {
        acc[hit.quality] += 1
        return acc
      },
      { perfect: 0, early: 0, late: 0, missed: 0 } as Record<TimingHit['quality'], number>,
    )
  }, [hits])

  const handStats = useMemo(() => {
    const leftDeviations: number[] = []
    const rightDeviations: number[] = []

    hits.forEach((hit) => {
      if (hit.quality === 'missed') return
      const hand = hit.hand

      if (hand === 'L') {
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
  }, [hits])

  const handTrend = useMemo(() => {
    const left: number[] = []
    const right: number[] = []

    hits.forEach((hit) => {
      if (hit.quality === 'missed') return
      const hand = hit.hand ?? 'L'
      if (hand === 'L') left.push(hit.deviationMs)
      else right.push(hit.deviationMs)
    })

    const avgAbs = (values: number[]) => {
      if (!values.length) return 0
      return Math.round(values.reduce((acc, value) => acc + Math.abs(value), 0) / values.length)
    }

    const consistencyFor = (values: number[]) => {
      if (values.length < 2) return 0
      const mean = values.reduce((acc, value) => acc + value, 0) / values.length
      const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length
      return Math.max(0, Math.round(100 - Math.sqrt(variance)))
    }

    const leftAvgAbs = avgAbs(left)
    const rightAvgAbs = avgAbs(right)
    const leftConsistency = consistencyFor(left)
    const rightConsistency = consistencyFor(right)
    const weakerHand = leftAvgAbs >= rightAvgAbs ? 'Left' : 'Right'
    const weakerGap = Math.abs(leftAvgAbs - rightAvgAbs)

    const recommendation =
      weakerGap < 3
        ? 'Hands are balanced. Run tempo ladder (+2 BPM) for endurance.'
        : weakerHand === 'Left'
          ? `Left hand trails by ~${weakerGap}ms. Run L-led singles at 60 BPM for 8 minutes.`
          : `Right hand trails by ~${weakerGap}ms. Run R-led singles at 60 BPM for 8 minutes.`

    return {
      leftAvgAbs,
      rightAvgAbs,
      leftConsistency,
      rightConsistency,
      leftSamples: left.length,
      rightSamples: right.length,
      weakerHand,
      weakerGap,
      recommendation,
    }
  }, [hits])

  const expectedSequence = useMemo(() => {
    const pattern = timingDrillPatterns[drillMode]
    const baseIndex = Math.max(0, nextExpectedIndexRef.current)
    return Array.from({ length: 8 }, (_, index) => handForExpectedIndex(pattern, baseIndex + index))
  }, [drillMode, hits.length])

  function handleDrillModeChange(mode: DrillMode) {
    setDrillMode(mode)
    void trackPracticeEvent('timing-analyzer', 'score', {
      action: 'drill-mode-change',
      drillMode: mode,
    })
  }

  function handleClear() {
    clearHits()
    lastExpectedIndexRef.current = -1
    nextExpectedIndexRef.current = 0
  }

  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        stopPracticeSession('timing-analyzer', sessionIdRef.current, { reason: 'unmount' })
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Timing Analyzer"
        subtitle="Microphone-first hit consistency, per-hand trend analysis, and drill prescriptions."
        right={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTrackingToggle}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-zinc-100"
            >
              {tracking ? 'Stop Tracking' : 'Start Tracking'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => void calibrateInput()}
              disabled={isCalibrating || tracking}
              className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCalibrating ? 'Calibrating...' : 'Calibrate Input'}
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
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-2 py-1 text-[10px] ${tracking ? 'bg-emerald-500/20 text-emerald-200' : 'bg-zinc-700/60 text-zinc-300'}`}>
              {tracking ? 'Listening' : 'Idle'}
            </span>
            <span className={`rounded-full px-2 py-1 text-[10px] ${calibration ? 'bg-cyan-500/20 text-cyan-200' : 'bg-zinc-700/60 text-zinc-300'}`}>
              {calibration ? 'Calibrated' : 'Not Calibrated'}
            </span>
            <span className={`rounded-full px-2 py-1 text-[10px] ${midiConnected ? 'bg-violet-500/20 text-violet-200' : 'bg-zinc-700/60 text-zinc-300'}`}>
              MIDI {midiConnected ? 'Connected' : 'Not detected'}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-200">Mic Level: {micLevel}%</p>
          <p className="text-sm text-zinc-200">Last input: {lastInputSource ? lastInputSource.toUpperCase() : '-'}</p>
          {calibration ? (
            <p className="text-xs text-zinc-400">
              Noise floor {calibration.noiseFloor}% | Peak {calibration.peak}% | {new Date(calibration.calibratedAt).toLocaleTimeString()}
            </p>
          ) : null}
        </GlassCard>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Left Hand Trend</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">{handTrend.leftAvgAbs} ms</p>
          <p className="text-xs text-zinc-400">Avg absolute deviation</p>
          <p className="mt-1 text-sm text-zinc-300">Consistency: {handTrend.leftSamples >= 2 ? `${handTrend.leftConsistency}%` : '-'}</p>
          <p className="text-xs text-zinc-500">Samples: {handTrend.leftSamples}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Right Hand Trend</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">{handTrend.rightAvgAbs} ms</p>
          <p className="text-xs text-zinc-400">Avg absolute deviation</p>
          <p className="mt-1 text-sm text-zinc-300">Consistency: {handTrend.rightSamples >= 2 ? `${handTrend.rightConsistency}%` : '-'}</p>
          <p className="text-xs text-zinc-500">Samples: {handTrend.rightSamples}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Drill Prescription</p>
          <p className="mt-2 text-sm text-zinc-200">{handTrend.recommendation}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Weaker hand: {handTrend.weakerHand} | Gap: {handTrend.weakerGap} ms
          </p>
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
          <div className="mt-3 flex justify-center">
            <div className="grid grid-cols-8 gap-1">
              {hits.slice(-24).map((hit) => (
                <div
                  key={hit.id}
                  className="grid h-8 w-8 place-items-center rounded text-[10px] font-semibold text-zinc-950"
                  style={{
                    background:
                      hit.quality === 'perfect'
                        ? '#22d3ee'
                        : hit.quality === 'early'
                          ? '#f59e0b'
                          : hit.quality === 'missed'
                            ? '#6b7280'
                            : '#f43f5e',
                  }}
                  title={`${hit.deviationMs > 0 ? '+' : ''}${hit.deviationMs}ms`}
                >
                  {hit.hand ?? '-'}
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <SectionHeader title="Hand Drill + Calibration" subtitle="Drill-driven hand timing analysis and calibrated hit detection." />

          <label className="block text-xs text-zinc-300">
            Drill Mode
            <select
              value={drillMode}
              onChange={(event) => handleDrillModeChange(event.target.value as DrillMode)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            >
              {(Object.keys(timingDrillPatterns) as DrillMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-zinc-300">
            Mic Profile
            <select
              value={micProfile}
              onChange={(event) => setMicProfile(event.target.value as MicProfile)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2"
            >
              {(Object.keys(micProfiles) as MicProfile[]).map((profile) => (
                <option key={profile} value={profile}>
                  {profile}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-zinc-500">{micProfiles[micProfile].note}</p>

          <div className="rounded-lg border border-white/10 bg-black/20 p-2">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Expected Hand Sequence</p>
            <div className="mt-2 flex gap-1">
              {expectedSequence.map((hand, index) => (
                <span
                  key={`${hand}-${index}`}
                  className={`grid h-8 w-8 place-items-center rounded text-xs font-semibold ${
                    index === 0 ? 'bg-cyan-400/30 text-cyan-100' : 'bg-white/5 text-zinc-300'
                  }`}
                >
                  {hand}
                </span>
              ))}
            </div>
          </div>

          <label className="block text-xs text-zinc-300">
            Reference BPM {referenceBpm}
            <input
              type="range"
              min={40}
              max={240}
              value={referenceBpm}
              onChange={(event) => setReferenceBpm(Number(event.target.value))}
              className="mt-2 w-full accent-cyan-400"
            />
          </label>

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
          <p className="text-[11px] text-zinc-400">
            Higher sensitivity catches softer hits but may detect claps/voice. Lower sensitivity ignores weak noise and focuses on stronger stick attacks.
          </p>
          <p className="text-[11px] text-zinc-500">Suggested: 24-34 for quiet rooms, 35-48 for noisy rooms.</p>

          <label className="block text-xs text-zinc-300">
            Hit Cooldown {cooldownMs}ms
            <input
              type="range"
              min={80}
              max={240}
              value={cooldownMs}
              onChange={(event) => setCooldownMs(Number(event.target.value))}
              className="mt-2 w-full accent-violet-400"
            />
          </label>
          <p className="text-[11px] text-zinc-400">
            Cooldown is the minimum gap between detected hits; higher values reduce double-triggering.
          </p>
          <p className="text-[11px] text-zinc-500">Suggested: 90-140ms for singles, 140-190ms for louder rooms.</p>

          <p className="text-sm text-zinc-200">Estimated Left Hand Avg: {handStats.leftAvg} ms</p>
          <p className="text-sm text-zinc-200">Estimated Right Hand Avg: {handStats.rightAvg} ms</p>
          <p className="text-xs text-zinc-400">
            Perfect {qualityCounts.perfect} | Early {qualityCounts.early} | Late {qualityCounts.late} | Missed {qualityCounts.missed}
          </p>

          {!hits.length ? <p className="text-xs text-zinc-500">Start tracking, then play your pad/snare steadily to populate analysis.</p> : null}
        </GlassCard>
      </section>
    </div>
  )
}
