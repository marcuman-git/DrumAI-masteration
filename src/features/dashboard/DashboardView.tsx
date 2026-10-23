import { useEffect, useMemo, useState } from 'react'
import { Flame, Medal, Timer, Zap } from 'lucide-react'
import { buildPracticeMetrics } from '../../core/services/analysis/practiceMetrics'
import { listPracticeEvents } from '../../core/services/storage/practiceEvents'
import { loadUserProfile } from '../../core/services/storage/userProfile'
import { useAppStore } from '../../core/store/useAppStore'
import type { PracticeEvent, UserProfile } from '../../core/types/drumming'
import { GlassCard } from '../../shared/components/GlassCard'
import { ProgressRing } from '../../shared/components/ProgressRing'
import { SectionHeader } from '../../shared/components/SectionHeader'

export function DashboardView() {
  const fallbackSummary = useAppStore((state) => state.summary)
  const fallbackSkills = useAppStore((state) => state.skills)
  const achievements = useAppStore((state) => state.achievements)
  const [events, setEvents] = useState<PracticeEvent[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)

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

  useEffect(() => {
    void loadUserProfile().then(setProfile)
  }, [])

  const metrics = useMemo(() => buildPracticeMetrics(events), [events])
  const hasEventData = events.length > 0
  const summary = hasEventData
    ? {
        todayGoalMinutes: metrics.todayGoalMinutes,
        todayCompletedMinutes: metrics.todayCompletedMinutes,
        streakDays: metrics.streakDays,
        weeklyProgressPercent: metrics.weeklyProgressPercent,
        totalPracticeHours: metrics.totalPracticeHours,
        timingAccuracy: metrics.timingAccuracy,
        bestBpm: metrics.bestBpm,
      }
    : fallbackSummary
  const skills = hasEventData ? metrics.skills : fallbackSkills

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Home Dashboard"
        subtitle="AI-driven practice command center for complete drum development."
      />

      <section className="grid gap-3 md:grid-cols-4">
        <GlassCard className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Today's Practice Goal</p>
          <p className="text-3xl font-semibold text-zinc-50">
            {summary.todayCompletedMinutes}/{summary.todayGoalMinutes} min
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{ width: `${(summary.todayCompletedMinutes / summary.todayGoalMinutes) * 100}%` }}
            />
          </div>
        </GlassCard>

        <GlassCard className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Current Streak</p>
            <p className="text-3xl font-semibold text-zinc-50">{summary.streakDays} days</p>
          </div>
          <Flame className="text-orange-300" />
        </GlassCard>

        <GlassCard className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Total Practice Hours</p>
            <p className="text-3xl font-semibold text-zinc-50">{summary.totalPracticeHours}h</p>
          </div>
          <Timer className="text-violet-300" />
        </GlassCard>

        <GlassCard className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Best BPM Record</p>
            <p className="text-3xl font-semibold text-zinc-50">{summary.bestBpm}</p>
          </div>
          <Zap className="text-amber-200" />
        </GlassCard>
      </section>

      <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <GlassCard>
          <SectionHeader title="Skill Ratings" subtitle="Real-time profile from your sessions" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {skills.map((skill) => (
              <ProgressRing key={skill.key} value={skill.value} label={skill.label} />
            ))}
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <SectionHeader title="Weekly Progress" />
          <p className="text-5xl font-semibold text-zinc-50">{summary.weeklyProgressPercent}%</p>
          <p className="text-sm text-zinc-400">
            Recommended next exercise:{' '}
            <span className="text-cyan-200">{hasEventData ? metrics.recommendedExercise : 'Paradiddle Inversion @ 120 BPM'}</span>
          </p>
        </GlassCard>
      </section>

      <GlassCard className="space-y-2">
        <SectionHeader title="Onboarding Profile" subtitle="Personal roadmap inputs used by AI planning" />
        {profile ? (
          <>
            <p className="text-sm text-zinc-200">
              Level: <span className="text-cyan-200">{profile.experienceLevel}</span> | Daily Target:{' '}
              <span className="text-cyan-200">{profile.dailyMinutes} min</span> | Setup:{' '}
              <span className="text-cyan-200">{profile.drumSetup}</span>
            </p>
            <p className="text-xs text-zinc-400">Styles: {profile.styles.join(', ')}</p>
            <p className="text-xs text-zinc-400">Goals: {profile.goals.join(', ')}</p>
          </>
        ) : (
          <p className="text-sm text-zinc-400">No onboarding profile saved yet. Use the header button to create one.</p>
        )}
      </GlassCard>

      <section className="grid gap-3 md:grid-cols-3">
        {achievements.map((achievement) => (
          <GlassCard key={achievement.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100">{achievement.title}</p>
              <Medal size={16} className="text-cyan-200" />
            </div>
            <p className="text-xs text-zinc-400">{achievement.description}</p>
            <p className="text-xs text-zinc-500">Earned {achievement.earnedAt}</p>
          </GlassCard>
        ))}
      </section>
    </div>
  )
}
