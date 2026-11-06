import { describe, expect, it } from 'vitest'
import { formatRemaining, padCue, padStepSeconds } from './practicePadLogic'
describe('pad routines', () => {
  it('uses correct paradiddle sticking and supports left lead', () => {
    expect(Array.from({ length: 8 }, (_, index) => padCue('rudi', index, false).hand).join('')).toBe('RLRRLRLL')
    expect(Array.from({ length: 8 }, (_, index) => padCue('rudi', index, true).hand).join('')).toBe('LRLLRLRR')
    expect(padCue('dynamic', 4, false).accent).toBe(true)
    expect(padCue('dynamic', 3, false).accent).toBe(false)
  })
  it('converts tempo and subdivisions without inventing measured results', () => {
    expect(padStepSeconds(60, 1)).toBe(1)
    expect(padStepSeconds(120, 4)).toBe(0.125)
    expect(formatRemaining(61)).toBe('1:01')
    expect(formatRemaining(-1)).toBe('0:00')
  })
})
