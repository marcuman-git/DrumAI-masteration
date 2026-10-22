import type { TimingHit } from '../../types/drumming'

export function classifyDeviation(deviationMs: number): TimingHit['quality'] {
  if (Math.abs(deviationMs) <= 5) return 'perfect'
  if (deviationMs < 0) return 'early'
  return 'late'
}

export function accuracyFromHits(hits: TimingHit[]): number {
  if (!hits.length) return 0
  const score = hits.reduce((acc, hit) => {
    if (hit.quality === 'perfect') return acc + 1
    const penalty = Math.min(1, Math.abs(hit.deviationMs) / 35)
    return acc + (1 - penalty)
  }, 0)

  return Math.max(0, Math.round((score / hits.length) * 100))
}

export function consistencyFromHits(hits: TimingHit[]): number {
  if (hits.length < 2) return 0
  const deviations = hits.map((hit) => hit.deviationMs)
  const mean = deviations.reduce((acc, value) => acc + value, 0) / deviations.length
  const variance = deviations.reduce((acc, value) => acc + (value - mean) ** 2, 0) / deviations.length
  return Math.max(0, Math.round(100 - Math.sqrt(variance)))
}
