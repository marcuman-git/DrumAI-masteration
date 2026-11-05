export const SPEED_DRILLS = ['Singles', 'Doubles', 'Paradiddles', 'Double Bass'] as const
export type SpeedDrill = typeof SPEED_DRILLS[number]
export interface SpeedResult { bpm: number; strokeRate: number; consistency: number; hits: number; seconds: number; completed: boolean }
export function summarizeSpeed(times: number[], seconds: number, completed: boolean): SpeedResult {
  const intervals = times.slice(1).map((time, index) => time - times[index]).filter((value) => value > 0)
  const mean = intervals.length ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length : 0
  const deviation = intervals.length ? Math.sqrt(intervals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / intervals.length) : 0
  const strokeRate = seconds > 0 ? times.length * 60 / seconds : 0
  return { bpm: Math.round(strokeRate / 4), strokeRate: Math.round(strokeRate), consistency: intervals.length >= 3 ? Math.round(Math.max(0, 100 * (1 - deviation / mean))) : 0, hits: times.length, seconds: Math.round(seconds * 10) / 10, completed }
}
export function qualifiesForRecord(result: SpeedResult): boolean {
  return result.completed && result.seconds >= 15 && result.hits >= 12 && result.consistency >= 80
}
export function createSpeedGate(cooldown: number) {
  let armed = true
  let last = -Infinity
  let quiet: number | null = null
  return (value: number, threshold: number, now: number) => {
    if (value < threshold * 0.5) {
      quiet ??= now
      if (now - quiet >= 12 && now - last >= cooldown) armed = true
    } else quiet = null
    if (!armed || value < threshold || now - last < cooldown) return false
    armed = false; last = now; return true
  }
}
export function loadSpeedRecords(): Partial<Record<SpeedDrill, number>> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('drummaster-speed-records-v1') ?? '{}')
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries(SPEED_DRILLS.flatMap((drill) => {
      const value = (parsed as Record<string, unknown>)[drill]
      return typeof value === 'number' && Number.isFinite(value) && value > 0 ? [[drill, value]] : []
    }))
  } catch { return {} }
}
