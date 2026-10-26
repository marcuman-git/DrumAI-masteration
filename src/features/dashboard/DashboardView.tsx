import { useEffect, useMemo, useState } from 'react'
import { Flame, Medal, Timer, Zap } from 'lucide-react'
import { ensureTodayPlan, todayKey, togglePlanBlock, type AdaptivePlanState } from '../../core/services/analysis/adaptiveScheduler'
import { buildChallengesSnapshot } from '../../core/services/analysis/challenges'
import { buildCoachReport } from '../../core/services/analysis/coachEngine'
import { buildGamificationSnapshot } from '../../core/services/analysis/gamification'
import { buildPracticeMetrics } from '../../core/services/analysis/practiceMetrics'
import { loadAdaptivePlan, saveAdaptivePlan } from '../../core/services/storage/adaptivePlan'
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
  const hits = useAppStore((state) => state.hits)
  const achievements = useAppStore((state) => state.achievements)
  const [events, setEvents] = useState<PracticeEvent[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [adaptivePlan, setAdaptivePlan] = useState<AdaptivePlanState | null>(null)

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
  const gamification = useMemo(() => buildGamificationSnapshot(events), [events])
  const challenges = useMemo(() => buildChallengesSnapshot(events), [events])
  const coachReport = useMemo(() => buildCoachReport(events, hits), [events, hits])
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
  const activeDay = adaptivePlan?.dailyByDate[todayKey()] ?? null

  useEffect(() => {
    if (!profile) return
    let mounted = true
    const syncPlan = async () => {
      const stored = await loadAdaptivePlan()
      const next = ensureTodayPlan(stored, { profile, metrics, report: coachReport })
      await saveAdaptivePlan(next)
      if (!mounted) return
      setAdaptivePlan(next)
    }
    void syncPlan()
    return () => {
      mounted = false
    }
  }, [profile, metrics, coachReport])

  async function toggleBlock(blockId: string) {
    if (!adaptivePlan) return
    const next = togglePlanBlock(adaptivePlan, todayKey(), blockId)
    setAdaptivePlan(next)
    await saveAdaptivePlan(next)
  }

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
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
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

      <GlassCard className="space-y-3">
        <SectionHeader title="Adaptive Plan" subtitle="Daily auto-scheduled blocks based on profile, metrics, and coach signals." />
        {activeDay ? (
          <>
            <p className="text-sm text-zinc-200">
              Today: {activeDay.completedMinutes}/{activeDay.targetMinutes} min ({activeDay.completionPercent}%)
            </p>
            <div className="space-y-2">
              {activeDay.blocks.map((block, index) => (
                <div key={block.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{block.title}</p>
                      <p className="text-xs text-zinc-400">
                        {block.minutes} min | {block.moduleHint}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{block.note}</p>
                    </div>
                    <button
                      type="button"
                      data-testid={`adaptive-block-toggle-${index}`}
                      onClick={() => void toggleBlock(block.id)}
                      className={`rounded-lg border px-2 py-1 text-xs ${
                        block.completed
                          ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100'
                          : 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
                      }`}
                    >
                      {block.completed ? 'Completed' : 'Mark Done'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-400">Complete onboarding to generate your adaptive daily schedule.</p>
        )}
      </GlassCard>

      <GlassCard className="space-y-3">
        <SectionHeader title="Daily Quests + XP" subtitle="Event-based gamification progression." />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Level</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-100">{gamification.level}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">XP Today</p>
            <p className="mt-1 text-3xl font-semibold text-cyan-200">{gamification.todayXp}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Next Level</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-100">{gamification.xpToNextLevel} XP</p>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-cyan-400"
            style={{ width: `${(gamification.currentLevelXp / 250) * 100}%` }}
          />
        </div>
        <div className="space-y-2">
          {gamification.quests.map((quest) => (
            <div key={quest.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-100">{quest.title}</p>
                <p className={`text-xs ${quest.completed ? 'text-emerald-200' : 'text-zinc-400'}`}>
                  {quest.completed ? 'Completed' : 'In progress'} • +{quest.rewardXp} XP
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-400">{quest.moduleHint}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${quest.completed ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                  style={{ width: `${Math.min(100, Math.round((quest.progress / quest.target) * 100))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {quest.progress}/{quest.target}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      <section className="grid gap-3 lg:grid-cols-2">
        <GlassCard className="space-y-3">
          <SectionHeader title="Weekly + Seasonal Challenges" subtitle="Progression tracks." />
          <div className="space-y-2">
            {challenges.weeklyChallenges.map((challenge) => (
              <div key={challenge.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-100">{challenge.title}</p>
                  <p className={`text-xs ${challenge.completed ? 'text-emerald-200' : 'text-zinc-400'}`}>
                    {challenge.progress}/{challenge.target}
                  </p>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{challenge.moduleHint}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${challenge.completed ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                    style={{ width: `${Math.min(100, Math.round((challenge.progress / challenge.target) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {challenges.seasonalChallenges.map((challenge) => (
              <div key={challenge.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-100">{challenge.title}</p>
                  <p className={`text-xs ${challenge.completed ? 'text-emerald-200' : 'text-zinc-400'}`}>
                    {challenge.progress}/{challenge.target}
                  </p>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{challenge.moduleHint}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${challenge.completed ? 'bg-emerald-400' : 'bg-violet-400'}`}
                    style={{ width: `${Math.min(100, Math.round((challenge.progress / challenge.target) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <SectionHeader title="Achievements v2" subtitle="Unlocked badges from tracked event milestones." />
          <div className="grid gap-2">
            {challenges.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`rounded-lg border p-3 ${
                  achievement.unlocked
                    ? 'border-emerald-300/35 bg-emerald-300/10'
                    : 'border-white/10 bg-black/20'
                }`}
              >
                <p className={`text-sm font-medium ${achievement.unlocked ? 'text-emerald-100' : 'text-zinc-200'}`}>
                  {achievement.title}
                </p>
                <p className="mt-1 text-xs text-zinc-400">{achievement.description}</p>
                <p className={`mt-1 text-xs ${achievement.unlocked ? 'text-emerald-200' : 'text-zinc-500'}`}>
                  {achievement.unlocked ? 'Unlocked' : 'Locked'}
                </p>
              </div>
            ))}
          </div>
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
