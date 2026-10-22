import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

interface ModuleGridViewProps {
  title: string
  subtitle: string
  items: Array<{ title: string; details: string }>
}

export function ModuleGridView({ title, subtitle, items }: ModuleGridViewProps) {
  return (
    <div className="space-y-4">
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <GlassCard key={item.title} className="space-y-2">
            <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
            <p className="text-xs text-zinc-400">{item.details}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
