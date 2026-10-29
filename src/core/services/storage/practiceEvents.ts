import { get, set } from 'idb-keyval'
import type { PracticeEvent, PracticeEventType, TrainingModuleId } from '../../types/drumming'

const EVENTS_KEY = 'drummaster-ai-practice-events-v1'
const EVENTS_FALLBACK_KEY = 'drummaster-ai-practice-events-fallback-v1'
export const MAX_STORED_EVENTS = 50000
export const MAX_ANALYTICS_EVENTS = 50000

type EventPayload = Record<string, number | string | boolean | null>

let writeQueue: Promise<void> = Promise.resolve()

function safeParse(raw: string | null): PracticeEvent[] {
  if (!raw) return []
  try {
    return JSON.parse(raw) as PracticeEvent[]
  } catch {
    return []
  }
}

async function readEvents(): Promise<PracticeEvent[]> {
  try {
    const fromDb = await get<PracticeEvent[]>(EVENTS_KEY)
    if (Array.isArray(fromDb)) return fromDb
  } catch {
    // fall through to localStorage in non-browser/test environments
  }
  return safeParse(localStorage.getItem(EVENTS_FALLBACK_KEY))
}

async function writeEvents(events: PracticeEvent[]): Promise<void> {
  try {
    await set(EVENTS_KEY, events)
  } catch {
    // allow local fallback when IndexedDB is unavailable
  }
  localStorage.setItem(EVENTS_FALLBACK_KEY, JSON.stringify(events))
}

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task).catch(() => undefined)
  return writeQueue
}

function sortByTimestamp(events: PracticeEvent[]): PracticeEvent[] {
  return [...events].sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
}

export function startPracticeSession(moduleId: TrainingModuleId, payload?: EventPayload): string {
  const sessionId = crypto.randomUUID()
  void trackPracticeEvent(moduleId, 'start', payload, sessionId)
  return sessionId
}

export function stopPracticeSession(moduleId: TrainingModuleId, sessionId: string, payload?: EventPayload): void {
  void trackPracticeEvent(moduleId, 'stop', payload, sessionId)
}

export function trackPracticeEvent(
  moduleId: TrainingModuleId,
  type: PracticeEventType,
  payload?: EventPayload,
  sessionId?: string,
): Promise<void> {
  const event: PracticeEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    moduleId,
    type,
    sessionId,
    payload,
  }

  return enqueueWrite(async () => {
    const current = await readEvents()
    const next = sortByTimestamp([...current, event]).slice(-MAX_STORED_EVENTS)
    await writeEvents(next)
  })
}

export async function listPracticeEvents(limit = 500): Promise<PracticeEvent[]> {
  const events = await readEvents()
  return events.slice(-Math.max(1, limit))
}

export async function clearPracticeEvents(): Promise<void> {
  await writeEvents([])
}

export async function replacePracticeEvents(events: PracticeEvent[]): Promise<void> {
  await writeEvents(sortByTimestamp(events).slice(-MAX_STORED_EVENTS))
}

export function appendPracticeEvents(events: PracticeEvent[]): Promise<void> {
  return enqueueWrite(async () => {
    const current = await readEvents()
    const next = sortByTimestamp([...current, ...events]).slice(-MAX_STORED_EVENTS)
    await writeEvents(next)
  })
}
