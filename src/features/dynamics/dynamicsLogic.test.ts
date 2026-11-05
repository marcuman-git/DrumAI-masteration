import { describe, expect, it } from 'vitest'
import { createStrokeGate, dynamicsSummary, relativeLevel, targetLevel } from './dynamicsLogic'
describe('dynamics measurement', () => {
  it('maps noise to zero and reference to full scale', () => {
    expect(relativeLevel(0.001, 0.001, 0.1)).toBe(0)
    expect(relativeLevel(0.1, 0.001, 0.1)).toBe(100)
    expect(relativeLevel(0.1, 0.1, 0.1)).toBe(0)
    expect(targetLevel('MF')).toBe(56)
  })
  it('scores target accuracy separately from repeatability', () => {
    expect(dynamicsSummary([]).sampleCount).toBe(0)
    expect(dynamicsSummary([{ level: 56, target: 56 }]).consistency).toBe(0)
    const result = dynamicsSummary(Array.from({ length: 3 }, () => ({ level: 80, target: 56 })))
    expect(result.accuracy).toBe(0)
    expect(result.consistency).toBe(100)
  })
  it('rejects rebounds until quiet settling and cooldown', () => {
    const gate = createStrokeGate()
    expect(gate(0.1, 0.02, 0)).toBe(true)
    expect(gate(0.1, 0.02, 180)).toBe(false)
    gate(0, 0.02, 200)
    gate(0, 0.02, 280)
    expect(gate(0.1, 0.02, 300)).toBe(true)
  })
})
