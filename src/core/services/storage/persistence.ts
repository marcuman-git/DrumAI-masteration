import { get, set } from 'idb-keyval'

const KEY = 'drummaster-ai-state-v1'

export async function saveState<T>(value: T): Promise<void> {
  await set(KEY, value)
  localStorage.setItem(KEY, JSON.stringify(value))
}

export async function loadState<T>(): Promise<T | null> {
  const fromDb = await get<T>(KEY)
  if (fromDb) return fromDb

  const fromLocal = localStorage.getItem(KEY)
  return fromLocal ? (JSON.parse(fromLocal) as T) : null
}
