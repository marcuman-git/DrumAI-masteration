import { useEffect, useMemo, useState } from 'react'
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
import { buildPracticeMetrics } from '../../core/services/analysis/practiceMetrics'
import { clearPracticeEvents, listPracticeEvents } from '../../core/services/storage/practiceEvents'
import { useAppStore } from '../../core/store/useAppStore'
import type { PracticeEvent } from '../../core/types/drumming'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

export function AnalyticsView() {
  const clearHits = useAppStore((state) => state.clearHits)
  const [events, setEvents] = useState<PracticeEvent[]>([])

  useEffect(() => {
    let mounted = true

    const refresh = async () => {
      const next = await listPracticeEvents(5000)
      if (!mounted) return
      setEvents(next)
    }

    void refresh()
    const interval = window.setInterval(() => void refresh(), 5000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)

    return () => {
      mounted = false
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const metrics = useMemo(() => buildPracticeMetrics(events), [events])

  async function handleResetData() {
    await clearPracticeEvents()
    clearHits()
    setEvents([])
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Analytics"
        subtitle="Daily, weekly, monthly, and yearly performance intelligence with adaptive learning signals."
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleResetData()}
          className="rounded-lg border border-rose-300/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-200"
        >
          Reset Test Data
        </button>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Practice Minutes</p>
          <p className="mt-2 text-4xl font-semibold text-zinc-50">{metrics.practiceMinutes}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Rudiment Mastery</p>
          <p className="mt-2 text-4xl font-semibold text-zinc-50">{metrics.rudimentMastery}%</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Dynamics Consistency</p>
          <p className="mt-2 text-4xl font-semibold text-zinc-50">{metrics.dynamicsConsistency}%</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">BPM Record</p>
          <p className="mt-2 text-4xl font-semibold text-zinc-50">{metrics.bestBpm}</p>
        </GlassCard>
      </section>

      <GlassCard className="h-96">
        <SectionHeader title="Weekly Trend" subtitle="Accuracy, consistency, and speed progression" />
        <ResponsiveContainer width="100%" height="82%">
          <LineChart data={metrics.weeklyTrend}>
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

      <GlassCard>
        <SectionHeader title="Module Usage" subtitle="Practice distribution by module (alphabetical)." />
        {metrics.moduleUsage.length ? (
          <div className="space-y-2">
            {metrics.moduleUsage.map((item) => (
              <div key={item.moduleId} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-100">{item.moduleId}</span>
                  <span className="text-zinc-300">
                    {item.percent}% | {item.minutes} min
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No module time tracked yet. Start and stop sessions to populate this section.</p>
        )}
      </GlassCard>
    </div>
  )
}
