import { describe, expect, it } from 'vitest'
import { createSpeedGate, qualifiesForRecord, summarizeSpeed } from './speedLogic'
describe('speed measurements', () => {
  it('measures sixteenth-note BPM from the whole timed window', () => {
    const result = summarizeSpeed(Array.from({ length: 120 }, (_, index) => index * 125), 15, true)
    expect(result.bpm).toBe(120)
    expect(result.consistency).toBe(100)
    expect(qualifiesForRecord(result)).toBe(true)
    expect(qualifiesForRecord({ ...result, completed: false })).toBe(false)
  })
  it('does not invent a record from insufficient samples', () => {
    const result = summarizeSpeed([0, 200], 15, true)
    expect(result.consistency).toBe(0)
    expect(qualifiesForRecord(result)).toBe(false)
    expect(summarizeSpeed([], 0, false).bpm).toBe(0)
  })
  it('rejects rebound peaks until the signal settles', () => {
    const gate = createSpeedGate(60)
    expect(gate(1, 0.2, 0)).toBe(true)
    expect(gate(1, 0.2, 80)).toBe(false)
    gate(0, 0.2, 90); gate(0, 0.2, 110)
    expect(gate(1, 0.2, 120)).toBe(true)
  })
})
