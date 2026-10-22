import { useEffect, useState } from 'react'
import {
  createChallenge,
  createGroove,
  fetchChallenges,
  fetchFriends,
  fetchGrooves,
  fetchGroups,
  fetchRankings,
  type ChallengeEntry,
  type FriendEntry,
  type GrooveEntry,
  type GroupEntry,
  type RankingEntry,
} from '../../core/services/api/communityService'
import { login, logout, register, type AuthUser } from '../../core/services/api/authService'
import { GlassCard } from '../../shared/components/GlassCard'
import { SectionHeader } from '../../shared/components/SectionHeader'

export function CommunityView() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [groups, setGroups] = useState<GroupEntry[]>([])
  const [challenges, setChallenges] = useState<ChallengeEntry[]>([])
  const [grooves, setGrooves] = useState<GrooveEntry[]>([])
  const [status, setStatus] = useState<string>('Sign in to sync community data.')

  async function loadCommunityData() {
    const [r, f, g, c, gr] = await Promise.all([
      fetchRankings(),
      fetchFriends(),
      fetchGroups(),
      fetchChallenges(),
      fetchGrooves(),
    ])

    setRankings(r)
    setFriends(f)
    setGroups(g)
    setChallenges(c)
    setGrooves(gr)
  }

  useEffect(() => {
    loadCommunityData().catch(() => {
      setStatus('API unavailable or not authenticated. Start backend and sign in.')
    })
  }, [])

  async function handleAuth() {
    try {
      const loggedInUser =
        mode === 'login' ? await login(email, password) : await register(email, password, displayName)
      setUser(loggedInUser)
      setStatus(`Authenticated as ${loggedInUser.displayName}.`) 
      await loadCommunityData()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Authentication failed')
    }
  }

  async function handleCreateChallenge() {
    try {
      const created = await createChallenge('Pocket Precision Weekend', '2026-11-12')
      setChallenges((value) => [created, ...value])
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create challenge')
    }
  }

  async function handleShareGroove() {
    try {
      const created = await createGroove('Linear Ghost Pocket', 'Funk')
      setGrooves((value) => [created, ...value])
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not share groove')
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Community" subtitle="Auth + API-backed friends, rankings, groups, challenges, and groove sharing." />

      <div className="grid gap-3 lg:grid-cols-[1.3fr_2fr]">
        <GlassCard className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Authentication</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-lg px-3 py-2 text-xs ${mode === 'login' ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/5 text-zinc-300'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`rounded-lg px-3 py-2 text-xs ${mode === 'register' ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/5 text-zinc-300'}`}
            >
              Register
            </button>
          </div>

          {mode === 'register' ? (
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Display name"
              className="w-full rounded-lg border border-white/10 bg-zinc-900 p-2 text-sm"
            />
          ) : null}

          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-white/10 bg-zinc-900 p-2 text-sm"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border border-white/10 bg-zinc-900 p-2 text-sm"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleAuth()}
              className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => {
                logout()
                setUser(null)
                setStatus('Signed out.')
              }}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200"
            >
              Logout
            </button>
          </div>

          <p className="text-xs text-zinc-400">{status}</p>
          <p className="text-xs text-zinc-500">{user ? `Session: ${user.displayName}` : 'No active user'}</p>
        </GlassCard>

        <div className="grid gap-3 md:grid-cols-2">
          <GlassCard>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Global Rankings</p>
            <ul className="mt-2 space-y-2 text-sm">
              {rankings.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                  {entry.name} | Lv {entry.level} | {entry.accuracy}% | {entry.bpm} BPM
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Friends</p>
            <ul className="mt-2 space-y-2 text-sm">
              {friends.map((friend) => (
                <li key={friend.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                  {friend.name} | {friend.status} | streak {friend.streak}
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Challenges</p>
              <button
                type="button"
                onClick={() => void handleCreateChallenge()}
                className="rounded-lg border border-violet-300/40 bg-violet-300/10 px-2 py-1 text-xs text-violet-100"
              >
                New
              </button>
            </div>
            <ul className="mt-2 space-y-2 text-sm">
              {challenges.map((challenge) => (
                <li key={challenge.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                  {challenge.title} | {challenge.participants} players | ends {challenge.endsAt}
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Groove Sharing</p>
              <button
                type="button"
                onClick={() => void handleShareGroove()}
                className="rounded-lg border border-violet-300/40 bg-violet-300/10 px-2 py-1 text-xs text-violet-100"
              >
                Share
              </button>
            </div>
            <ul className="mt-2 space-y-2 text-sm">
              {grooves.map((groove) => (
                <li key={groove.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                  {groove.title} | {groove.style} | by {groove.author}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </div>

      <GlassCard>
        <p className="text-xs uppercase tracking-wide text-zinc-400">Practice Groups</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {groups.map((group) => (
            <div key={group.id} className="rounded-lg border border-white/10 bg-black/20 p-2 text-sm text-zinc-200">
              {group.name} | {group.members} members | {group.style}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
