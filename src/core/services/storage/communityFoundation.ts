import type { PracticeEvent } from '../../types/drumming'
import { buildGamificationSnapshot } from '../analysis/gamification'
import { buildPracticeMetrics } from '../analysis/practiceMetrics'

export interface CommunityFriend {
  id: string
  name: string
  status: 'online' | 'offline'
  streak: number
}

export interface CommunityChallenge {
  id: string
  title: string
  target: string
  endsAt: string
  status: 'pending' | 'accepted' | 'completed'
}

export interface CommunityGroove {
  id: string
  title: string
  style: string
  author: string
}

export interface CommunityGroup {
  id: string
  name: string
  members: number
  style: string
}

export interface CommunityLeaderboardEntry {
  id: string
  name: string
  level: number
  accuracy: number
  bpm: number
  xp: number
  minutes: number
  isSelf?: boolean
}

export interface CommunityFoundationState {
  profileName: string
  friends: CommunityFriend[]
  challenges: CommunityChallenge[]
  grooves: CommunityGroove[]
  groups: CommunityGroup[]
}

const KEY = 'drummaster-community-foundation-v1'

const seedState: CommunityFoundationState = {
  profileName: 'You',
  friends: [
    { id: 'f-1', name: 'Ava Pocket', status: 'online', streak: 12 },
    { id: 'f-2', name: 'Noah Ride', status: 'offline', streak: 7 },
  ],
  challenges: [
    {
      id: 'c-1',
      title: 'Pocket Precision Weekend',
      target: 'Timing accuracy 92%+',
      endsAt: '2026-11-12',
      status: 'pending',
    },
  ],
  grooves: [
    { id: 'g-1', title: 'Linear Ghost Pocket', style: 'Funk', author: 'Ava Pocket' },
    { id: 'g-2', title: 'Ride Sync Wave', style: 'Jazz', author: 'Noah Ride' },
  ],
  groups: [
    { id: 'grp-1', name: 'Pocket Builders', members: 18, style: 'Funk' },
    { id: 'grp-2', name: 'Odd Meter Lab', members: 11, style: 'Progressive' },
  ],
}

const leaderboardBots: CommunityLeaderboardEntry[] = [
  { id: 'bot-1', name: 'Ava Pocket', level: 17, accuracy: 93, bpm: 182, xp: 4200, minutes: 980 },
  { id: 'bot-2', name: 'Noah Ride', level: 14, accuracy: 90, bpm: 176, xp: 3550, minutes: 820 },
  { id: 'bot-3', name: 'Liam Groove', level: 12, accuracy: 88, bpm: 171, xp: 3040, minutes: 700 },
]

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function loadState(): CommunityFoundationState {
  const raw = localStorage.getItem(KEY)
  if (!raw) return seedState
  try {
    const parsed = JSON.parse(raw) as CommunityFoundationState
    return {
      profileName: parsed.profileName ?? 'You',
      friends: parsed.friends ?? [],
      challenges: parsed.challenges ?? [],
      grooves: parsed.grooves ?? [],
      groups: parsed.groups ?? [],
    }
  } catch {
    return seedState
  }
}

function saveState(state: CommunityFoundationState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function getCommunityFoundation(): CommunityFoundationState {
  return loadState()
}

export function setCommunityProfileName(name: string): CommunityFoundationState {
  const state = loadState()
  const next = { ...state, profileName: name.trim() || 'You' }
  saveState(next)
  return next
}

export function addCommunityFriend(name: string): CommunityFoundationState {
  const state = loadState()
  const clean = name.trim()
  if (!clean) return state
  const next: CommunityFoundationState = {
    ...state,
    friends: [{ id: uid('f'), name: clean, status: 'online', streak: 0 }, ...state.friends],
  }
  saveState(next)
  return next
}

export function createCommunityChallenge(title: string, target: string, endsAt: string): CommunityFoundationState {
  const state = loadState()
  const next: CommunityFoundationState = {
    ...state,
    challenges: [{ id: uid('c'), title, target, endsAt, status: 'pending' }, ...state.challenges],
  }
  saveState(next)
  return next
}

export function updateCommunityChallengeStatus(
  id: string,
  status: CommunityChallenge['status'],
): CommunityFoundationState {
  const state = loadState()
  const next: CommunityFoundationState = {
    ...state,
    challenges: state.challenges.map((item) => (item.id === id ? { ...item, status } : item)),
  }
  saveState(next)
  return next
}

export function shareCommunityGroove(title: string, style: string): CommunityFoundationState {
  const state = loadState()
  const next: CommunityFoundationState = {
    ...state,
    grooves: [{ id: uid('g'), title, style, author: state.profileName }, ...state.grooves],
  }
  saveState(next)
  return next
}

export function buildCommunityLeaderboard(events: PracticeEvent[], state?: CommunityFoundationState): CommunityLeaderboardEntry[] {
  const foundation = state ?? loadState()
  const metrics = buildPracticeMetrics(events)
  const game = buildGamificationSnapshot(events)

  const self: CommunityLeaderboardEntry = {
    id: 'self',
    name: foundation.profileName || 'You',
    level: game.level,
    accuracy: metrics.timingAccuracy,
    bpm: metrics.bestBpm,
    xp: game.totalXp,
    minutes: metrics.practiceMinutes,
    isSelf: true,
  }

  return [self, ...leaderboardBots].sort((a, b) => b.xp - a.xp)
}
