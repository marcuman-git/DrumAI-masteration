import { afterEach, describe, expect, it } from 'vitest'
import { presetGrid } from './independenceLogic'
import { deleteCoordinationExercise, listCoordinationExercises, saveCoordinationExercise } from './independenceStorage'
afterEach(() => { localStorage.removeItem('drummaster-independence-library-v1'); localStorage.removeItem('drummaster-independence-v1') })
describe('named coordination exercises', () => {
  it('saves multiple exercises, updates one, and deletes only the selected exercise', () => {
    const settings = { grid: presetGrid('Rock'), bpm: 60, swing: false }
    saveCoordinationExercise('Rock study', settings)
    const saved = saveCoordinationExercise('Jazz study', { ...settings, grid: presetGrid('Jazz') })
    expect(saved).toHaveLength(2)
    saveCoordinationExercise('Renamed study', settings, saved[0].id)
    expect(listCoordinationExercises()[0].name).toBe('Renamed study')
    expect(deleteCoordinationExercise(saved[0].id)).toHaveLength(1)
    expect(listCoordinationExercises()[0].name).toBe('Jazz study')
  })
  it('preserves the legacy save and does not resurrect it after deletion', () => {
    localStorage.setItem('drummaster-independence-v1', JSON.stringify({ grid: presetGrid('Rock'), bpm: 60, swing: false }))
    expect(listCoordinationExercises()[0].id).toBe('legacy')
    deleteCoordinationExercise('legacy')
    expect(listCoordinationExercises()).toEqual([])
  })
})
