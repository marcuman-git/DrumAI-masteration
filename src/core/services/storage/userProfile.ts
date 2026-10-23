import { get, set } from 'idb-keyval'
import type { UserProfile } from '../../types/drumming'

const PROFILE_KEY = 'drummaster-ai-user-profile-v1'
const PROFILE_FALLBACK_KEY = 'drummaster-ai-user-profile-fallback-v1'

function safeParse(raw: string | null): UserProfile | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

export async function loadUserProfile(): Promise<UserProfile | null> {
  try {
    const fromDb = await get<UserProfile>(PROFILE_KEY)
    if (fromDb) return fromDb
  } catch {
    // fallback to localStorage
  }
  return safeParse(localStorage.getItem(PROFILE_FALLBACK_KEY))
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    await set(PROFILE_KEY, profile)
  } catch {
    // allow local fallback
  }
  localStorage.setItem(PROFILE_FALLBACK_KEY, JSON.stringify(profile))
}

export async function clearUserProfile(): Promise<void> {
  try {
    await set(PROFILE_KEY, null)
  } catch {
    // ignore and clear fallback
  }
  localStorage.removeItem(PROFILE_FALLBACK_KEY)
}
