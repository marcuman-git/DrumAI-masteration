import { describe, expect, it } from 'vitest'
import { buildPolyrhythm, cycleSeconds, RATIOS } from './polyrhythmLogic'
describe('polyrhythm grids', () => {
  it('includes every pulse for every supported ratio and shares a downbeat', () => {
    for (const ratio of RATIOS) {
      const grid = buildPolyrhythm(ratio)
      expect(grid.first.filter(Boolean)).toHaveLength(ratio[0])
      expect(grid.second.filter(Boolean)).toHaveLength(ratio[1])
      expect(grid.first[0] && grid.second[0]).toBe(true)
    }
    expect(buildPolyrhythm([2, 4]).total).toBe(4)
    expect(buildPolyrhythm([7, 8]).total).toBe(56)
  })
  it('defines one cycle as four quarter-note beats', () => {
    expect(cycleSeconds(60)).toBe(4)
    expect(cycleSeconds(120)).toBe(2)
  })
})
