import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

const trendData = [
  { period: 'Mon', accuracy: 89, consistency: 80, bpm: 170 },
  { period: 'Tue', accuracy: 91, consistency: 82, bpm: 176 },
  { period: 'Wed', accuracy: 93, consistency: 84, bpm: 181 },
  { period: 'Thu', accuracy: 95, consistency: 86, bpm: 186 },
  { period: 'Fri', accuracy: 94, consistency: 88, bpm: 192 },
  { period: 'Sat', accuracy: 96, consistency: 89, bpm: 198 },
  { period: 'Sun', accuracy: 97, consistency: 91, bpm: 205 },
]

export function AnalyticsView() {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Analytics"
        subtitle="Daily, weekly, monthly, and yearly performance intelligence with adaptive learning signals."
      />

      <section className="grid gap-3 md:grid-cols-4">
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Practice Minutes</p>
          <p className="mt-2 text-4xl font-semibold text-zinc-50">4,420</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Rudiment Mastery</p>
          <p className="mt-2 text-4xl font-semibold text-zinc-50">72%</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Dynamics Consistency</p>
          <p className="mt-2 text-4xl font-semibold text-zinc-50">84%</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">BPM Record</p>
          <p className="mt-2 text-4xl font-semibold text-zinc-50">212</p>
        </GlassCard>
      </section>

      <GlassCard className="h-96">
        <SectionHeader title="Weekly Trend" subtitle="Accuracy, consistency, and speed progression" />
        <ResponsiveContainer width="100%" height="82%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis dataKey="period" stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="accuracy" stroke="#22d3ee" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="consistency" stroke="#818cf8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="bpm" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  )
}
