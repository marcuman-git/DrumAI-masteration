import { describe, expect, it } from 'vitest'
import { MODULES } from './modules'
describe('beginner navigation', () => {
  it('keeps a unique numbered progression with supporting modules accessible', () => {
    const path = MODULES.filter((item) => item.practiceOrder)
    expect(path.map((item) => item.practiceOrder)).toEqual(Array.from({ length: 15 }, (_, index) => index + 1))
    expect(path.slice(0, 2).map((item) => item.id)).toEqual(['metronome', 'practice-pad'])
    expect(path.slice(-2).map((item) => item.id)).toEqual(['odd-time', 'polyrhythm'])
    expect(new Set(MODULES.map((item) => item.id)).size).toBe(MODULES.length)
    expect(MODULES.some((item) => item.id === 'analytics')).toBe(true)
  })
})
