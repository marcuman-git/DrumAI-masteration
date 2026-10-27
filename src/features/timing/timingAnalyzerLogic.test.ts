import { describe, expect, it } from 'vitest'
import { handForExpectedIndex, timingDrillPatterns } from './timingAnalyzerLogic'

describe('timingAnalyzerLogic', () => {
  it('maps expected index to correct hand for all drill modes', () => {
    expect(handForExpectedIndex(timingDrillPatterns['Singles (L/R)'], 0)).toBe('L')
    expect(handForExpectedIndex(timingDrillPatterns['Singles (L/R)'], 1)).toBe('R')
    expect(handForExpectedIndex(timingDrillPatterns['Singles (R/L)'], 0)).toBe('R')
    expect(handForExpectedIndex(timingDrillPatterns['Singles (R/L)'], 1)).toBe('L')

    expect(handForExpectedIndex(timingDrillPatterns['Doubles (L/R)'], 0)).toBe('L')
    expect(handForExpectedIndex(timingDrillPatterns['Doubles (L/R)'], 1)).toBe('L')
    expect(handForExpectedIndex(timingDrillPatterns['Doubles (L/R)'], 2)).toBe('R')
    expect(handForExpectedIndex(timingDrillPatterns['Doubles (R/L)'], 0)).toBe('R')
    expect(handForExpectedIndex(timingDrillPatterns['Doubles (R/L)'], 2)).toBe('L')

    expect(handForExpectedIndex(timingDrillPatterns['Paradiddle (L/R)'], 0)).toBe('L')
    expect(handForExpectedIndex(timingDrillPatterns['Paradiddle (L/R)'], 3)).toBe('L')
    expect(handForExpectedIndex(timingDrillPatterns['Paradiddle (R/L)'], 0)).toBe('R')
    expect(handForExpectedIndex(timingDrillPatterns['Paradiddle (R/L)'], 3)).toBe('R')
  })

  it('wraps index safely for long and negative indexes', () => {
    const pattern = timingDrillPatterns['Singles (L/R)']
    expect(handForExpectedIndex(pattern, 6)).toBe('L')
    expect(handForExpectedIndex(pattern, 7)).toBe('R')
    expect(handForExpectedIndex(pattern, -1)).toBe('R')
  })
})
