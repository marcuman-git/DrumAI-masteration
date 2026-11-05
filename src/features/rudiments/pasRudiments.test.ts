import { describe, expect, it } from 'vitest'
import { PAS_RUDIMENTS } from './pasRudiments'
describe('PAS catalog', () => {
  it('includes all 40 distinct numbered rudiments with playable stroke tokens', () => {
    expect(PAS_RUDIMENTS).toHaveLength(40)
    expect(new Set(PAS_RUDIMENTS.map((item) => item.name)).size).toBe(40)
    for (const item of PAS_RUDIMENTS) {
      expect(item.sticking.split(' ').every((token) => /^(z|[rl]{1,2})?[RL]$/.test(token))).toBe(true)
    }
    expect(PAS_RUDIMENTS[39].name).toBe('Triple Ratamacue')
    expect(PAS_RUDIMENTS[19].sticking).toBe('lR rL')
  })
})
