import type { PersonalProgressSnapshot } from '../../core/services/analysis/personalProgress'
import { GlassCard } from './GlassCard'
import { SectionHeader } from './SectionHeader'

export function TodayFocusPlan({ progress }: { progress: PersonalProgressSnapshot }) {
  return (
    <GlassCard className="space-y-3">
      <SectionHeader title="Today Focus" subtitle={progress.todayFocus} />
      <p className="text-sm text-zinc-300">{progress.focusReason}</p>
      <SectionHeader title="Next 15 Minutes" subtitle="A suggested practice plan. Complete these drills in their modules." />
      <div className="grid gap-3 md:grid-cols-3">
        {progress.next15Minutes.map((block) => (
          <div key={block.title} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-sm font-semibold text-cyan-100">{block.title} · {block.minutes} min</p>
            <p className="mt-1 text-xs text-zinc-400">{block.module}</p>
            <p className="mt-2 text-sm text-zinc-300">{block.instruction}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
