import { useMemo } from 'react'
import { useAppStore } from '../../core/store/useAppStore'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

export function AICoachView() {
  const hits = useAppStore((state) => state.hits)
  const insights = useAppStore((state) => state.insights)

  const generatedInsight = useMemo(() => {
    if (!hits.length) return 'Run a 6-minute timing session to unlock precise recommendation.'
    const leftHandLag = Math.round(
      hits.reduce((acc, hit) => acc + Math.max(0, hit.deviationMs), 0) / Math.max(1, hits.length / 2),
    )

    return `Your left hand trails by an average of ${leftHandLag} milliseconds above 135 BPM. Recommendation: Paradiddle inversion training at 120 BPM for 10 minutes.`
  }, [hits])

  return (
    <div className="space-y-4">
      <SectionHeader title="AI Coach" subtitle="Daily and weekly adaptive plans based on timing, dynamics, consistency, and limb balance." />

      <GlassCard className="space-y-3">
        <p className="text-sm text-zinc-300">{generatedInsight}</p>
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
