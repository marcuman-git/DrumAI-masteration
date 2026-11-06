import { afterEach, describe, expect, it } from 'vitest'
import { GROOVES, grooveStepSeconds, loadGroovePlaylist } from './grooveLibraryLogic'
afterEach(() => localStorage.removeItem('drummaster-groove-playlist-v1'))
describe('curated groove patterns', () => {
  it('uses simultaneous instrument rows with correct meter lengths and distinct patterns', () => {
    for (const groove of GROOVES) for (const row of Object.values(groove.rows)) expect(row).toHaveLength(groove.steps)
    expect(GROOVES.find((groove) => groove.style === 'Progressive')?.steps).toBe(14)
    expect(new Set(GROOVES.map((groove) => JSON.stringify(groove.rows))).size).toBe(6)
    expect(GROOVES.find((groove) => groove.style === 'Funk')?.rows.Snare).toContain(1)
  })
  it('keeps swing bar duration correct and 7/8 at three and a half quarter beats', () => {
    expect(Array.from({ length: 16 }, (_, step) => grooveStepSeconds(60, step, true)).reduce((sum, value) => sum + value)).toBeCloseTo(4)
    expect(14 * grooveStepSeconds(60, 0, false)).toBe(3.5)
  })
  it('restores only known, unique playlist IDs', () => {
    localStorage.setItem('drummaster-groove-playlist-v1', JSON.stringify(['r1', 'r1', 'missing', 'j1']))
    expect(loadGroovePlaylist()).toEqual(['r1', 'j1'])
  })
})
