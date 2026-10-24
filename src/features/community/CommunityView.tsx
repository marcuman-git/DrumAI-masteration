import { useEffect, useMemo, useState } from 'react'
import { buildChallengesSnapshot } from '../../core/services/analysis/challenges'
import { listPracticeEvents } from '../../core/services/storage/practiceEvents'
import {
  addCommunityFriend,
  buildCommunityLeaderboard,
  createCommunityChallenge,
  getCommunityFoundation,
  setCommunityProfileName,
  shareCommunityGroove,
  updateCommunityChallengeStatus,
  type CommunityFoundationState,
} from '../../core/services/storage/communityFoundation'
import type { PracticeEvent } from '../../core/types/drumming'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

export function CommunityView() {
  const [events, setEvents] = useState<PracticeEvent[]>([])
  const [foundation, setFoundation] = useState<CommunityFoundationState>(() => getCommunityFoundation())
  const [friendName, setFriendName] = useState('')
  const [profileNameInput, setProfileNameInput] = useState(foundation.profileName)
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
  const challengeSignals = useMemo(() => buildChallengesSnapshot(events), [events])

  function handleAddFriend() {
    if (!friendName.trim()) return
    const next = addCommunityFriend(friendName)
    setFoundation(next)
    setFriendName('')
    setStatus(`Friend added: ${next.friends[0]?.name ?? 'Unknown'}`)
  }

  function handleCreateInvite() {
    const endsAt = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const next = createCommunityChallenge('Timing Duel Invite', 'Score 100 clean hits @ 60 BPM', endsAt)
    setFoundation(next)
    setStatus('Challenge invite created.')
  }

  function handleShareGroove() {
    const next = shareCommunityGroove('Pocket Builder Loop', 'Rock')
    setFoundation(next)
    setStatus('Groove shared with community.')
  }

  function handleSaveProfileName() {
    const next = setCommunityProfileName(profileNameInput)
    setFoundation(next)
    setStatus(`Community profile set to ${next.profileName}.`)
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Community" subtitle="[v0.4.5] Local friend system, challenge invites, and leaderboard scaffold." />

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

          <label className="text-xs text-zinc-300">
            Add Friend
            <input
              value={friendName}
              onChange={(event) => setFriendName(event.target.value)}
              placeholder="Friend name"
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 p-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={handleAddFriend}
            className="rounded-lg border border-violet-300/35 bg-violet-300/10 px-3 py-2 text-xs text-violet-100"
          >
            Add Friend
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateInvite}
              className="rounded-lg border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-xs text-amber-100"
            >
              Create Invite
            </button>
            <button
              type="button"
              onClick={handleShareGroove}
              className="rounded-lg border border-emerald-300/35 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100"
            >
              Share Groove
            </button>
          </div>

          <p className="text-xs text-zinc-400">{status}</p>
        </GlassCard>

        <div className="grid gap-3 md:grid-cols-2">
          <GlassCard>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Leaderboard Scaffold</p>
            <ul className="mt-2 space-y-2 text-sm">
              {leaderboard.map((entry, index) => (
                <li
                  key={entry.id}
                  className={`rounded-lg border p-2 ${
                    entry.isSelf ? 'border-cyan-300/40 bg-cyan-300/10' : 'border-white/10 bg-black/20'
                  }`}
                >
                  #{index + 1} {entry.name} | Lv {entry.level} | {entry.accuracy}% | {entry.bpm} BPM | {entry.xp} XP
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
