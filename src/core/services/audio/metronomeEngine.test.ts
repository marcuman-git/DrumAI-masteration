import { describe, expect, it } from 'vitest'
import { resolveAccentMultiplier, type MetronomeConfig } from './metronomeEngine'

function config(overrides: Partial<MetronomeConfig>): MetronomeConfig {
  return {
    bpm: 60,
    subdivision: 1,
    swing: 0,
    humanizeMs: 0,
    accentPattern: [1.8, 1, 1, 1],
    clickVolume: 0.3,
    ...overrides,
  }
}

describe('metronome accent resolution', () => {
  it('keeps beat accent mapping for 4-step beat pattern', () => {
    const c = config({ subdivision: 2, accentPattern: [1.8, 1, 1, 1] })
    expect(resolveAccentMultiplier(c, 0)).toBe(1.8)
    expect(resolveAccentMultiplier(c, 1)).toBe(1.8)
    expect(resolveAccentMultiplier(c, 2)).toBe(1)
    expect(resolveAccentMultiplier(c, 3)).toBe(1)
    expect(resolveAccentMultiplier(c, 4)).toBe(1)
    expect(resolveAccentMultiplier(c, 6)).toBe(1)
  })

  it('supports step-level accent mapping for subdivision-aware patterns', () => {
    const c = config({ subdivision: 3, accentPattern: [1.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] })
    expect(resolveAccentMultiplier(c, 0)).toBe(1.8)
    expect(resolveAccentMultiplier(c, 1)).toBe(1)
    expect(resolveAccentMultiplier(c, 2)).toBe(1)
    expect(resolveAccentMultiplier(c, 3)).toBe(1)
    expect(resolveAccentMultiplier(c, 11)).toBe(1)
  })
})
