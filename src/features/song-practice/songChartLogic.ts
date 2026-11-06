export const CHART_INSTRUMENTS = ['Hi-hat', 'Snare', 'Kick'] as const
export type ChartInstrument = typeof CHART_INSTRUMENTS[number]
export type ChartBar = Record<ChartInstrument, number[]>
export interface SongChart { id: string; title: string; bpm: number; bars: ChartBar[] }
const KEY = 'drummaster-song-charts-v1'
export function blankBar(): ChartBar { return { 'Hi-hat': Array(16).fill(0), Snare: Array(16).fill(0), Kick: Array(16).fill(0) } }
export function newSongChart(): SongChart {
  const bar = blankBar()
  for (const step of [0, 2, 4, 6, 8, 10, 12, 14]) bar['Hi-hat'][step] = 2
  for (const step of [4, 12]) bar.Snare[step] = 2
  for (const step of [0, 8]) bar.Kick[step] = 2
  return { id: crypto.randomUUID(), title: 'My drum chart', bpm: 60, bars: [bar] }
}
export function isSongChart(value: unknown): value is SongChart {
  if (!value || typeof value !== 'object') return false
  const chart = value as SongChart
  return typeof chart.id === 'string' && chart.id.length > 0 && chart.id.length <= 120 && typeof chart.title === 'string' && chart.title.trim().length > 0 && chart.title.length <= 80
    && Number.isInteger(chart.bpm) && chart.bpm >= 40 && chart.bpm <= 240 && Array.isArray(chart.bars) && chart.bars.length >= 1 && chart.bars.length <= 16
    && chart.bars.every((bar) => bar && CHART_INSTRUMENTS.every((instrument) => Array.isArray(bar[instrument]) && bar[instrument].length === 16 && bar[instrument].every((note) => Number.isInteger(note) && note >= 0 && note <= 3)))
}
export function cycleChartNote(chart: SongChart, bar: number, instrument: ChartInstrument, step: number): SongChart {
  const cycle = [0, 2, 1, 3]
  return { ...chart, bars: chart.bars.map((row, index) => index === bar ? { ...row, [instrument]: row[instrument].map((note, position) => position === step ? cycle[(cycle.indexOf(note) + 1) % cycle.length] : note) } : row) }
}
export function loadSongCharts(): SongChart[] {
  try { const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(parsed) ? parsed.filter(isSongChart) : [] } catch { return [] }
}
export function saveSongCharts(charts: SongChart[]): void {
  if (!charts.every(isSongChart)) throw new Error('Invalid chart settings.')
  localStorage.setItem(KEY, JSON.stringify(charts))
}
export function parseSongChart(raw: string): SongChart {
  if (new Blob([raw]).size > 512 * 1024) throw new Error('Chart file exceeds 512 KB.')
  const value = JSON.parse(raw) as { app?: unknown; schema?: unknown; chart?: unknown }
  if (!value || value.app !== 'DrumMaster AI Chart' || value.schema !== 1 || !isSongChart(value.chart)) throw new Error('Invalid drum chart file.')
  return { ...value.chart, id: crypto.randomUUID() }
}
