export const DYNAMIC_LEVELS = ['PPP', 'PP', 'P', 'MP', 'MF', 'F', 'FF', 'FFF'] as const
export type DynamicLevel = typeof DYNAMIC_LEVELS[number]
export interface DynamicsHit { level: number; target: number }
export function targetLevel(dynamic: DynamicLevel): number {
  return 12 + DYNAMIC_LEVELS.indexOf(dynamic) * 11
}
export function relativeLevel(amplitude: number, noise: number, reference: number): number {
  const floor = Math.max(noise * 2, 0.0001)
  if (amplitude <= floor || reference <= floor) return 0
  return Math.max(0, Math.min(100, 100 * Math.log(amplitude / floor) / Math.log(reference / floor)))
}
export function dynamicsSummary(hits: DynamicsHit[]) {
  if (!hits.length) return { sampleCount: 0, accuracy: 0, consistency: 0 }
  const errors = hits.map((hit) => hit.level - hit.target)
  const mean = errors.reduce((sum, value) => sum + value, 0) / errors.length
  const deviation = Math.sqrt(errors.reduce((sum, value) => sum + (value - mean) ** 2, 0) / errors.length)
  return {
    sampleCount: hits.length,
    accuracy: Math.round(hits.filter((hit) => Math.abs(hit.level - hit.target) <= 8).length / hits.length * 100),
    consistency: hits.length < 3 ? 0 : Math.round(Math.max(0, 100 - deviation * 3)),
  }
}
// Re-arm only after the signal settles: loud rebounds cannot immediately retrigger.
export function createStrokeGate() {
  let armed = true
  let lastHit = -Infinity
  let quietSince: number | null = null
  return (amplitude: number, threshold: number, now: number): boolean => {
    if (amplitude < threshold * 0.55) {
      quietSince ??= now
      if (now - quietSince >= 65 && now - lastHit >= 160) armed = true
    } else quietSince = null
    if (!armed || amplitude < threshold || now - lastHit < 160) return false
    armed = false
    lastHit = now
    return true
  }
}
