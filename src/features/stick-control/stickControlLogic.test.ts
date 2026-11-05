import { describe, expect, it } from 'vitest'
import { leadPattern, loadStickings, strokeVolume } from './stickControlLogic'
describe('stick control variations', () => {
  it('reverses hands without changing the sticking structure', () => {
    expect(leadPattern('RLRR', 'L')).toBe('LRLL')
    expect(leadPattern('LLRL', 'R')).toBe('RRLR')
    expect(leadPattern('RRLL', 'R')).toBe('RRLL')
  })
  it('accents only the selected strokes and increases crescendo volume', () => {
    expect(strokeVolume('RLRL', 0, 'First Stroke', 'Medium')).toBeGreaterThan(strokeVolume('RLRL', 1, 'First Stroke', 'Medium'))
    expect(strokeVolume('RLRL', 1, 'Right Hand', 'Medium')).toBe(strokeVolume('RLRL', 1, 'None', 'Medium'))
    expect(strokeVolume('RLRL', 3, 'None', 'Crescendo')).toBeGreaterThan(strokeVolume('RLRL', 0, 'None', 'Crescendo'))
  })
  it('ignores invalid saved exercise data', () => {
    localStorage.setItem('drummaster-stickings-v1', '[{"id":"bad","pattern":"invalid"}]')
    expect(loadStickings()).toEqual([])
    localStorage.removeItem('drummaster-stickings-v1')
  })
})
