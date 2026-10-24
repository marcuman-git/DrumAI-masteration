import { useEffect, useMemo, useState } from 'react'
import { buildChallengesSnapshot } from '../../core/services/analysis/challenges'
import { listPracticeEvents } from '../../core/services/storage/practiceEvents'
import {
  buildCommunityLeaderboard,
  getCommunityFoundation,
  setCommunityProfileName,
  updateCommunityChallengeStatus,
  type CommunityFoundationState,
} from '../../core/services/storage/communityFoundation'
import type { PracticeEvent } from '../../core/types/drumming'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

export function CommunityView() {
  const [events, setEvents] = useState<PracticeEvent[]>([])
  const [foundation, setFoundation] = useState<CommunityFoundationState>(() => getCommunityFoundation())
  const [profileNameInput, setProfileNameInput] = useState(foundation.profileName)
  const [leaderboardMode, setLeaderboardMode] = useState<'all-time' | 'session'>('all-time')
  const [status, setStatus] = useState('Local community foundation ready.')

  useEffect(() => {
    let mounted = true
    const refresh = async () => {
      const next = await listPracticeEvents(5000)
      if (!mounted) return
      setEvents(next)
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 5000)
    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [])

  const leaderboard = useMemo(() => buildCommunityLeaderboard(events, foundation), [events, foundation])
  const filteredLeaderboard = useMemo(() => {
    if (leaderboardMode === 'all-time') return leaderboard
    return [...leaderboard].sort((a, b) => b.accuracy - a.accuracy || b.bpm - a.bpm)
  }, [leaderboard, leaderboardMode])
  const challengeSignals = useMemo(() => buildChallengesSnapshot(events), [events])

  function handleSaveProfileName() {
    const next = setCommunityProfileName(profileNameInput)
    setFoundation(next)
    setStatus(`Community profile set to ${next.profileName}.`)
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Community" subtitle="[v0.4.6] Leaderboard filters + streamlined social dashboard." />

      <div className="grid gap-3 lg:grid-cols-[1.3fr_2fr]">
        <GlassCard className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Community Profile</p>
          <label className="text-xs text-zinc-300">
            Display Name
            <input
              value={profileNameInput}
              onChange={(event) => setProfileNameInput(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={handleSaveProfileName}
            className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100"
          >
            Save Name
          </button>

          <p className="text-xs text-zinc-500">
            Friend/challenge/groove creation controls are hidden in this streamlined mode.
          </p>

          <p className="text-xs text-zinc-400">{status}</p>
        </GlassCard>

        <div className="grid gap-3 md:grid-cols-2">
          <GlassCard>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Leaderboard Scaffold</p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setLeaderboardMode('all-time')}
                  className={`rounded-md px-2 py-1 text-[11px] ${
                    leaderboardMode === 'all-time' ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/5 text-zinc-300'
                  }`}
                >
                  All-time
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardMode('session')}
                  className={`rounded-md px-2 py-1 text-[11px] ${
                    leaderboardMode === 'session' ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/5 text-zinc-300'
                  }`}
                >
                  Session
                </button>
              </div>
            </div>
            <ul className="mt-2 space-y-2 text-sm">
              {filteredLeaderboard.map((entry, index) => (
                <li
                  key={entry.id}
                  className={`rounded-lg border p-2 ${
                    entry.isSelf ? 'border-cyan-300/40 bg-cyan-300/10' : 'border-white/10 bg-black/20'
                  }`}
                >
                  #{index + 1} {entry.name} | Lv {entry.level} | {entry.accuracy}% | {entry.bpm} BPM | {entry.xp} XP |{' '}
                  {entry.minutes} min
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Friends</p>
            <ul className="mt-2 space-y-2 text-sm">
              {foundation.friends.map((friend) => (
                <li key={friend.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                  {friend.name} | {friend.status} | streak {friend.streak}
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Challenge Invites</p>
            <ul className="mt-2 space-y-2 text-sm">
              {foundation.challenges.map((challenge) => (
                <li key={challenge.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                  <p>
                    {challenge.title} | {challenge.target}
                  </p>
                  <p className="text-xs text-zinc-500">Ends: {challenge.endsAt}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFoundation(updateCommunityChallengeStatus(challenge.id, 'accepted'))}
                      className="rounded-md border border-cyan-300/35 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => setFoundation(updateCommunityChallengeStatus(challenge.id, 'completed'))}
                      className="rounded-md border border-emerald-300/35 bg-emerald-300/10 px-2 py-1 text-xs text-emerald-100"
                    >
                      Complete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Shared Grooves</p>
            <ul className="mt-2 space-y-2 text-sm">
              {foundation.grooves.map((groove) => (
                <li key={groove.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                  {groove.title} | {groove.style} | by {groove.author}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Practice Groups</p>
          <div className="mt-2 grid gap-2">
            {foundation.groups.map((group) => (
              <div key={group.id} className="rounded-lg border border-white/10 bg-black/20 p-2 text-sm text-zinc-200">
                {group.name} | {group.members} members | {group.style}
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Challenge Progress Signals</p>
          <p className="mt-2 text-sm text-zinc-300">
            Weekly completed: {challengeSignals.weeklyChallenges.filter((challenge) => challenge.completed).length}/
            {challengeSignals.weeklyChallenges.length}
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            Seasonal completed: {challengeSignals.seasonalChallenges.filter((challenge) => challenge.completed).length}/
            {challengeSignals.seasonalChallenges.length}
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            Achievements unlocked: {challengeSignals.achievements.filter((achievement) => achievement.unlocked).length}/
            {challengeSignals.achievements.length}
          </p>
        </GlassCard>
      </div>
    </div>
  )
}
