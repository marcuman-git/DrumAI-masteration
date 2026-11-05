import type { PracticeEvent } from '../../core/types/drumming'
export interface SessionReview { id: string; module: string; started: string; minutes: number; hits: number; accuracy: number | null; left: number | null; right: number | null; drill: string }
export function buildSessionReviews(events: PracticeEvent[]): SessionReview[] {
  const groups = new Map<string, PracticeEvent[]>()
  for (const event of events) {
    if (!event.sessionId || event.payload?.testTag) continue
    const group = groups.get(event.sessionId) ?? []
    group.push(event); groups.set(event.sessionId, group)
  }
  return Array.from(groups.entries()).flatMap(([id, group]) => {
    group.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    const start = group.find((event) => event.type === 'start')
    const stop = group.find((event) => event.type === 'stop')
    if (!start || !stop || Date.parse(stop.timestamp) < Date.parse(start.timestamp)) return []
    const hits = group.filter((event) => event.type === 'hit' && event.moduleId === 'timing-analyzer')
    const average = (hand: string) => {
      const values = hits.filter((event) => event.payload?.hand === hand && typeof event.payload.deviationMs === 'number').map((event) => Number(event.payload?.deviationMs))
      return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
    }
    return [{ id, module: start.moduleId, started: start.timestamp, minutes: Math.round((Date.parse(stop.timestamp) - Date.parse(start.timestamp)) / 6000) / 10, hits: hits.length, accuracy: hits.length ? Math.round(hits.filter((event) => event.payload?.quality === 'perfect').length / hits.length * 100) : null, left: average('L'), right: average('R'), drill: hits.length ? 'Timing Analyzer: singles at 60 BPM, compare hand deviations.' : 'Repeat this module at a comfortable tempo and focus on clean execution.' }]
  }).sort((a, b) => Date.parse(b.started) - Date.parse(a.started))
}
