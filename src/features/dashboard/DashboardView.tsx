import { Flame, Medal, Timer, Zap } from 'lucide-react'
import { useAppStore } from '../../core/store/useAppStore'
import { GlassCard } from '../../shared/components/GlassCard'
import { ProgressRing } from '../../shared/components/ProgressRing'
import { SectionHeader } from '../../shared/components/SectionHeader'

export function DashboardView() {
  const summary = useAppStore((state) => state.summary)
  const skills = useAppStore((state) => state.skills)
  const achievements = useAppStore((state) => state.achievements)

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
            Recommended next exercise: <span className="text-cyan-200">Paradiddle Inversion @ 120 BPM</span>
          </p>
        </GlassCard>
      </section>

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
