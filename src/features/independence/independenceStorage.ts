import { isCoordination, loadCoordination } from './independenceLogic'
import type { SavedCoordination } from './independenceLogic'
export interface NamedCoordination { id: string; name: string; settings: SavedCoordination }
const KEY = 'drummaster-independence-library-v1'
export function listCoordinationExercises(): NamedCoordination[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) {
      const legacy = loadCoordination()
      return legacy ? [{ id: 'legacy', name: 'Previous saved exercise', settings: legacy }] : []
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const ids = new Set<string>()
    return parsed.filter((item): item is NamedCoordination => {
      if (!item || typeof item.id !== 'string' || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || !isCoordination(item.settings)) return false
      ids.add(item.id); return true
    })
  } catch { return [] }
}
export function saveCoordinationExercise(name: string, settings: SavedCoordination, id?: string): NamedCoordination[] {
  const trimmed = name.trim().slice(0, 80)
  if (!trimmed || !isCoordination(settings)) throw new Error('A valid name and exercise are required.')
  const items = listCoordinationExercises()
  const entry = { id: id ?? crypto.randomUUID(), name: trimmed, settings }
  const next = id ? items.map((item) => item.id === id ? entry : item) : [...items, entry]
  if (id && !items.some((item) => item.id === id)) throw new Error('Selected exercise no longer exists.')
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
export function deleteCoordinationExercise(id: string): NamedCoordination[] {
  const next = listCoordinationExercises().filter((item) => item.id !== id)
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
