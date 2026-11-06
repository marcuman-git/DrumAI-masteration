import { afterEach, describe, expect, it } from 'vitest'
import { CHART_INSTRUMENTS, cycleChartNote, isSongChart, loadSongCharts, newSongChart, parseSongChart, saveSongCharts } from './songChartLogic'
afterEach(() => localStorage.removeItem('drummaster-song-charts-v1'))
describe('editable song charts', () => {
  it('builds a 4/4 starter and cycles rest, note, ghost and accent without mutating', () => {
    const chart = newSongChart()
    expect(chart.bpm).toBe(60)
    for (const instrument of CHART_INSTRUMENTS) expect(chart.bars[0][instrument]).toHaveLength(16)
    let next = chart
    for (const expected of [2, 1, 3, 0]) { next = cycleChartNote(next, 0, 'Snare', 0); expect(next.bars[0].Snare[0]).toBe(expected) }
    expect(chart.bars[0].Snare[0]).toBe(0)
  })
  it('saves multiple charts and validates imported structure', () => {
    const chart = newSongChart()
    saveSongCharts([chart, { ...chart, id: 'second', title: 'Second chart' }])
    expect(loadSongCharts()).toHaveLength(2)
    expect(parseSongChart(JSON.stringify({ app: 'DrumMaster AI Chart', schema: 1, chart })).bars).toEqual(chart.bars)
    expect(isSongChart({ ...chart, bpm: 999 })).toBe(false)
    expect(() => parseSongChart('{}')).toThrow()
  })
})
