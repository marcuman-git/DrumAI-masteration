import { useEffect, useMemo, useState } from 'react'
import { buildCoachReport, formatSourceSummary } from '../../core/services/analysis/coachEngine'
import { listPracticeEvents } from '../../core/services/storage/practiceEvents'
import { loadUserProfile } from '../../core/services/storage/userProfile'
import { useAppStore } from '../../core/store/useAppStore'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'
import type { PracticeEvent, UserProfile } from '../../core/types/drumming'

export function AICoachView() {
  const hits = useAppStore((state) => state.hits)
  const insights = useAppStore((state) => state.insights)
  const micLevel = useAppStore((state) => state.micLevel)
  const [recentEvents, setRecentEvents] = useState<PracticeEvent[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    void listPracticeEvents(400).then(setRecentEvents)
  }, [hits.length, insights.length, micLevel])
  useEffect(() => {
    void loadUserProfile().then(setProfile)
  }, [])

  const report = useMemo(() => buildCoachReport(recentEvents, hits), [recentEvents, hits])
  const sourceSummary = useMemo(() => formatSourceSummary(report.sourceSummary), [report.sourceSummary])

  return (
    <div className="space-y-4">
      <SectionHeader title="AI Coach" subtitle="Daily and weekly adaptive plans based on timing, dynamics, consistency, and limb balance." />

      <GlassCard className="space-y-3">
        <p className="text-sm text-zinc-200">{report.summary}</p>
        {profile ? (
          <div className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-3">
            <p className="text-xs uppercase tracking-wide text-emerald-100">Profile Context</p>
            <p className="mt-2 text-xs text-zinc-200">
              {profile.experienceLevel} | {profile.drumSetup} | {profile.dailyMinutes} min/day | MIDI:{' '}
              {profile.hasMidiDevice ? 'Yes' : 'No'}
            </p>
            <p className="mt-1 text-xs text-zinc-300">Goals: {profile.goals.join(', ')}</p>
          </div>
        ) : null}
        <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3">
          <p className="text-xs uppercase tracking-wide text-cyan-100">Analysis Source</p>
          <p className="mt-2 text-xs text-zinc-200">
            Timing Analyzer hits: {hits.length} samples | Live mic level: {micLevel}% | Stored coach insights: {insights.length}
          </p>
          <p className="mt-2 text-xs text-zinc-300">Recorded module sources: {sourceSummary}</p>
          <p className="mt-1 text-xs text-zinc-300">Counts represent logged practice events (start, hit, mistake, stop, score), not just button clicks.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {report.focusWeights.map((item) => (
            <div key={item.focus} className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-zinc-300">
              {item.percent}% {item.focus[0].toUpperCase() + item.focus.slice(1)}
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="grid gap-3 md:grid-cols-2">
        {report.recommendations.map((recommendation, index) => (
          <GlassCard key={`${recommendation.title}-${index}`}>
            <p className="text-sm font-semibold text-zinc-100">{recommendation.title}</p>
            <p className="mt-2 text-sm text-zinc-300">{recommendation.text}</p>
            <p className="mt-2 text-xs text-cyan-200">Based on: {recommendation.basedOn}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <GlassCard>
          <SectionHeader title="Daily Plan" subtitle="Adaptive session split from current weak zones" />
          <div className="space-y-2">
            {report.dailyPlan.map((line, index) => {
              const personalizedLine = profile
                ? `${line} (Target window: ${Math.max(10, Math.round(profile.dailyMinutes / 4))}-${Math.max(20, Math.round(profile.dailyMinutes / 2))} min block).`
                : line
              return (
              <p key={`${line}-${index}`} className="text-sm text-zinc-300">
                {index + 1}. {personalizedLine}
              </p>
              )
            })}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader title="Weekly Plan" subtitle="7-day progression structure generated from event history" />
          <div className="space-y-2">
            {report.weeklyPlan.map((line, index) => (
              <p key={`${line}-${index}`} className="text-sm text-zinc-300">
                {index + 1}. {line}
              </p>
            ))}
          </div>
        </GlassCard>
      </div>

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
