import { apiRequest } from './apiClient'
import { getToken } from './authService'

export interface RankingEntry {
  id: string
  name: string
  level: number
  accuracy: number
  bpm: number
}

export interface FriendEntry {
  id: string
  name: string
  status: string
  streak: number
}

export interface GroupEntry {
  id: string
  name: string
  members: number
  style: string
}

export interface ChallengeEntry {
  id: string
  title: string
  participants: number
  endsAt: string
}

export interface GrooveEntry {
  id: string
  title: string
  author: string
  style: string
}

function requireToken(): string {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')
  return token
}

export function fetchRankings(): Promise<RankingEntry[]> {
  return apiRequest<RankingEntry[]>('/api/community/rankings', {}, requireToken())
}

export function fetchFriends(): Promise<FriendEntry[]> {
  return apiRequest<FriendEntry[]>('/api/community/friends', {}, requireToken())
}

export function fetchGroups(): Promise<GroupEntry[]> {
  return apiRequest<GroupEntry[]>('/api/community/groups', {}, requireToken())
}

export function fetchChallenges(): Promise<ChallengeEntry[]> {
  return apiRequest<ChallengeEntry[]>('/api/community/challenges', {}, requireToken())
}

export function createChallenge(title: string, endsAt: string): Promise<ChallengeEntry> {
  return apiRequest<ChallengeEntry>(
    '/api/community/challenges',
    {
      method: 'POST',
      body: JSON.stringify({ title, endsAt }),
    },
    requireToken(),
  )
}

export function fetchGrooves(): Promise<GrooveEntry[]> {
  return apiRequest<GrooveEntry[]>('/api/community/grooves', {}, requireToken())
}

export function createGroove(title: string, style: string): Promise<GrooveEntry> {
  return apiRequest<GrooveEntry>(
    '/api/community/grooves',
    {
      method: 'POST',
      body: JSON.stringify({ title, style }),
    },
    requireToken(),
  )
}
