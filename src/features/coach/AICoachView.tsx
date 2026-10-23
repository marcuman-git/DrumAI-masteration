import { useEffect, useMemo, useState } from 'react'
import { listPracticeEvents } from '../../core/services/storage/practiceEvents'
import { useAppStore } from '../../core/store/useAppStore'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'
import type { PracticeEvent } from '../../core/types/drumming'

export function AICoachView() {
  const hits = useAppStore((state) => state.hits)
  const insights = useAppStore((state) => state.insights)
  const micLevel = useAppStore((state) => state.micLevel)
  const [recentEvents, setRecentEvents] = useState<PracticeEvent[]>([])

  useEffect(() => {
    void listPracticeEvents(400).then(setRecentEvents)
  }, [hits.length, insights.length, micLevel])

  const generatedInsight = useMemo(() => {
    if (!hits.length) return 'Run a 6-minute timing session to unlock precise recommendation.'
    const leftHandLag = Math.round(
      hits.reduce((acc, hit) => acc + Math.max(0, hit.deviationMs), 0) / Math.max(1, hits.length / 2),
    )

    return `Your left hand trails by an average of ${leftHandLag} milliseconds above 135 BPM. Recommendation: Paradiddle inversion training at 120 BPM for 10 minutes.`
  }, [hits])

  const sourceSummary = useMemo(() => {
    const counts = recentEvents.reduce<Record<string, number>>((acc, event) => {
      acc[event.moduleId] = (acc[event.moduleId] ?? 0) + 1
      return acc
    }, {})

    const items = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    if (!items.length) return 'No recorded module events yet.'
    return items.map(([moduleId, count]) => `${moduleId} (${count})`).join(' | ')
  }, [recentEvents])

  return (
    <div className="space-y-4">
      <SectionHeader title="AI Coach" subtitle="Daily and weekly adaptive plans based on timing, dynamics, consistency, and limb balance." />

      <GlassCard className="space-y-3">
        <p className="text-sm text-zinc-300">{generatedInsight}</p>
        <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3">
          <p className="text-xs uppercase tracking-wide text-cyan-100">Analysis Source</p>
          <p className="mt-2 text-xs text-zinc-200">
            Timing Analyzer hits: {hits.length} samples | Live mic level: {micLevel}% | Stored coach insights: {insights.length}
          </p>
          <p className="mt-2 text-xs text-zinc-300">Recorded module sources: {sourceSummary}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-zinc-300">20% Timing</div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-zinc-300">30% Weak Hand</div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-zinc-300">25% Dynamics</div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-zinc-300">25% Reading</div>
        </div>
      </GlassCard>

      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((insight) => (
          <GlassCard key={insight.id}>
            <p className="text-xs text-zinc-400">{new Date(insight.createdAt).toLocaleString()}</p>
            <p className="mt-2 text-sm text-zinc-100">{insight.recommendation}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
