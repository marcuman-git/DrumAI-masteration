import { describe, expect, it } from 'vitest'
import { LIMBS, loadCoordination, patternSteps, presetGrid, stepDuration, toggleStep } from './independenceLogic'
describe('coordination patterns', () => {
  it('builds distinct presets and changes only the selected limb step', () => {
    const rock = presetGrid('Rock')
    expect(rock.LH.filter(Boolean)).toHaveLength(2)
    expect(presetGrid('Jazz').RH).not.toEqual(rock.RH)
    const edited = toggleStep(rock, 'LH', 0)
    expect(edited.LH[0]).toBe(true)
    expect(rock.LH[0]).toBe(false)
    expect(edited.RF).toEqual(rock.RF)
    for (const limb of LIMBS) expect(rock[limb]).toHaveLength(16)
    expect(patternSteps('16ths').every(Boolean)).toBe(true)
  })
  it('keeps swung bars the same duration with a two-to-one eighth feel', () => {
    const durations = Array.from({ length: 16 }, (_, index) => stepDuration(60, index, true))
    expect(durations.reduce((sum, value) => sum + value, 0)).toBeCloseTo(4)
    expect(durations[0] / durations[2]).toBeCloseTo(2)
    expect(stepDuration(120, 0, false)).toBe(0.125)
  })
  it('rejects malformed saved grids and restores valid settings', () => {
    localStorage.setItem('drummaster-independence-v1', JSON.stringify({ grid: {}, bpm: 60, swing: false }))
    expect(loadCoordination()).toBeNull()
    const saved = { grid: presetGrid('Latin'), bpm: 80, swing: false }
    localStorage.setItem('drummaster-independence-v1', JSON.stringify(saved))
    expect(loadCoordination()).toEqual(saved)
    localStorage.removeItem('drummaster-independence-v1')
  })
})
