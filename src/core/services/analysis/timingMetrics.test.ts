import { describe, expect, it } from 'vitest'
import { accuracyFromHits, classifyDeviation, consistencyFromHits } from './timingMetrics'
import type { TimingHit } from '../../types/drumming'

function hit(deviationMs: number, quality: TimingHit['quality']): TimingHit {
  return {
    id: crypto.randomUUID(),
    expectedAt: 100,
    actualAt: 100 + deviationMs,
    deviationMs,
    quality,
  }
}

describe('timingMetrics', () => {
  it('classifies deviations correctly', () => {
    expect(classifyDeviation(-3)).toBe('perfect')
    expect(classifyDeviation(-8)).toBe('early')
    expect(classifyDeviation(6)).toBe('late')
  })

  it('calculates accuracy score from hit quality/deviation', () => {
    const hits = [
      hit(0, 'perfect'),
      hit(-4, 'perfect'),
      hit(-18, 'early'),
      hit(10, 'late'),
    ]

    expect(accuracyFromHits(hits)).toBeGreaterThanOrEqual(60)
    expect(accuracyFromHits(hits)).toBeLessThanOrEqual(100)
  })

  it('calculates higher consistency for tighter spread', () => {
    const tight = [hit(-2, 'perfect'), hit(1, 'perfect'), hit(0, 'perfect')]
    const loose = [hit(-25, 'early'), hit(18, 'late'), hit(9, 'late')]

    expect(consistencyFromHits(tight)).toBeGreaterThan(consistencyFromHits(loose))
  })
})
