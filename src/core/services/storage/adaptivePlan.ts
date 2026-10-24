import { get, set } from 'idb-keyval'
import type { AdaptivePlanState } from '../analysis/adaptiveScheduler'

const KEY = 'drummaster-ai-adaptive-plan-v1'
const FALLBACK_KEY = 'drummaster-ai-adaptive-plan-fallback-v1'

function safeParse(raw: string | null): AdaptivePlanState | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdaptivePlanState
  } catch {
    return null
  }
}

export async function loadAdaptivePlan(): Promise<AdaptivePlanState | null> {
  try {
    const fromDb = await get<AdaptivePlanState>(KEY)
    if (fromDb) return fromDb
  } catch {
    // local fallback path
  }
  return safeParse(localStorage.getItem(FALLBACK_KEY))
}

export async function saveAdaptivePlan(state: AdaptivePlanState): Promise<void> {
  try {
    await set(KEY, state)
  } catch {
    // local fallback path
  }
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(state))
}

export async function clearAdaptivePlan(): Promise<void> {
  try {
    await set(KEY, null)
  } catch {
    // ignore
  }
  localStorage.removeItem(FALLBACK_KEY)
}
